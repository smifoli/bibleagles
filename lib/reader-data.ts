import { getChapter } from "@/lib/bible-data";
import { formatShortDate, parseDateOnly, toDateOnlyString } from "@/lib/format";
import { HIGHLIGHT_COLORS, SAND_HIGHLIGHT, type HighlightColorStyle } from "@/lib/highlight-colors";
import { passageMatches } from "@/lib/reading-plan";
import type { createClient } from "@/lib/supabase/server";
import type { HighlightColor, Passage } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface VerseHighlightMark {
  name: string;
  color: HighlightColor;
  isOwn: boolean;
  avatarUrl: string | null;
}

export interface VerseHighlight {
  style: HighlightColorStyle;
  ownColor: HighlightColor | null;
  markedBy: VerseHighlightMark[];
}

// Uma entrada por pessoa que interagiu com o verso (destacou e/ou comentou —
// inclusive em mais de um comentário/resposta), pra mostrar um avatar só por
// pessoa em vez de repetir por ação.
export interface VerseParticipant {
  name: string;
  avatarUrl: string | null;
  isOwn: boolean;
  /** Cor do destaque, se essa pessoa destacou o verso — usada na borda do avatar. Null se só comentou. */
  highlightColor: HighlightColor | null;
  /** Índice estável do membro na família (ver colorIndexFor) — cor de identidade do
   * avatar sem foto quando não há destaque (highlightColor null vence sobre isso). */
  colorIndex: number;
}

export interface ChapterParticipant extends VerseParticipant {
  /** Quantos comentários/respostas essa pessoa fez no capítulo inteiro (não só num verso). */
  commentCount: number;
  /** Em quantos versos essa pessoa destacou algo no capítulo inteiro. */
  highlightCount: number;
}

// Quem comentou/destacou em QUALQUER verso do capítulo, deduplicado por pessoa, mais
// os totais do capítulo inteiro — pra uma visão geral no topo, sem abrir cada verso.
export interface ChapterEngagement {
  participants: ChapterParticipant[];
  commentCount: number;
  highlightCount: number;
}

export interface ReaderComment {
  id: string;
  userName: string;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
  isEdited: boolean;
  likeCount: number;
  likedByMe: boolean;
  isOwn: boolean;
  replies: ReaderComment[];
}

export interface ReaderVerse {
  number: number;
  text: string;
  highlight: VerseHighlight | null;
  commentCount: number;
  participants: VerseParticipant[];
}

export interface ReaderPlanContext {
  planDayId: string;
  packageTitle: string;
  dayNumber: number;
  /** Data do calendário em que esse dia do plano está programado, ex. "24 jul". */
  dateLabel: string;
  alreadyCompleted: boolean;
}

export interface ReaderData {
  reference: string;
  verses: ReaderVerse[];
  commentsByVerse: Record<number, ReaderComment[]>;
  chapterEngagement: ChapterEngagement;
  planContext: ReaderPlanContext | null;
  // Com planContext, é planContext.alreadyCompleted (o dia inteiro). Sem plano
  // nenhum cobrindo esse capítulo, reflete uma leitura livre (reading_progress
  // com book/chapter, sem plan_day_id) — ver markChapterRead em reader-actions.ts.
  isChapterRead: boolean;
  isAdmin: boolean;
}

export async function getReaderData(
  supabase: SupabaseServerClient,
  userId: string,
  bookId: string,
  chapter: number,
  version: string,
  requestedPlanDayId?: string
): Promise<ReaderData> {
  const chapterContent = getChapter(version, bookId, chapter);

  // Destaques/comentários não filtram por bible_version: são sobre a
  // referência (livro/capítulo/versículo), não sobre o texto de uma tradução
  // específica — precisam aparecer independente de qual versão você está lendo.
  const [{ data: bookmarkRows }, { data: commentRows }, { data: familyMembers }, planContext, { data: freeformRead }] =
    await Promise.all([
      supabase.from("bookmarks").select("user_id, verse, color").eq("book", bookId).eq("chapter", chapter),
      supabase
        .from("comments")
        .select("id, user_id, verse, content, parent_id, created_at, updated_at")
        .eq("book", bookId)
        .eq("chapter", chapter)
        .order("created_at", { ascending: true }),
      supabase.from("users").select("id, name, role, is_deleted, avatar_url").order("created_at", { ascending: true }),
      getPlanContext(supabase, userId, bookId, chapter, requestedPlanDayId),
      supabase.from("reading_progress").select("id").eq("user_id", userId).eq("book", bookId).eq("chapter", chapter).maybeSingle(),
    ]);

  const isChapterRead = planContext ? planContext.alreadyCompleted : Boolean(freeformRead);

  const isAdmin = (familyMembers ?? []).find((member) => member.id === userId)?.role === "admin";
  // Membro removido pelo admin, mas com destaques/comentários preservados —
  // segue aparecendo com o nome original, só marcado, pra não perder o autor.
  const memberNames = new Map(
    (familyMembers ?? []).map((member) => [member.id, member.is_deleted ? `${member.name} (deletado)` : member.name])
  );
  const memberAvatars = new Map((familyMembers ?? []).map((member) => [member.id, member.avatar_url]));
  // Mesma ideia de lib/bookmarks-data.ts: cor de identidade estável por pessoa (ordem de
  // entrada na família), reaproveitada onde não há foto nem destaque pra colorir o avatar.
  const memberOrder = new Map((familyMembers ?? []).map((member, index) => [member.id, index]));
  const colorIndexFor = (memberId: string) => memberOrder.get(memberId) ?? 0;

  const highlightsByVerse = new Map<number, { userId: string; color: HighlightColor }[]>();
  for (const row of bookmarkRows ?? []) {
    const list = highlightsByVerse.get(row.verse) ?? [];
    list.push({ userId: row.user_id, color: row.color as HighlightColor });
    highlightsByVerse.set(row.verse, list);
  }

  const commentIds = (commentRows ?? []).map((row) => row.id);
  const { data: likeRows } =
    commentIds.length > 0
      ? await supabase.from("comment_likes").select("comment_id, user_id").in("comment_id", commentIds)
      : { data: [] as { comment_id: string; user_id: string }[] };

  const likeCounts = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const row of likeRows ?? []) {
    likeCounts.set(row.comment_id, (likeCounts.get(row.comment_id) ?? 0) + 1);
    if (row.user_id === userId) likedByMe.add(row.comment_id);
  }

  // Threading tem só 1 nível (imposto pelo trigger enforce_comment_depth):
  // toda comment_rows aqui é raiz (parent_id null) ou resposta direta de uma raiz.
  const commentById = new Map<string, ReaderComment>();
  for (const row of commentRows ?? []) {
    commentById.set(row.id, {
      id: row.id,
      userName: memberNames.get(row.user_id) ?? "Alguém",
      avatarUrl: memberAvatars.get(row.user_id) ?? null,
      content: row.content,
      createdAt: row.created_at,
      isEdited: row.updated_at !== row.created_at,
      likeCount: likeCounts.get(row.id) ?? 0,
      likedByMe: likedByMe.has(row.id),
      isOwn: row.user_id === userId,
      replies: [],
    });
  }

  const commentsByVerse: Record<number, ReaderComment[]> = {};
  const commentCountByVerse = new Map<number, number>();
  // Ordem de primeira aparição, sem repetir user_id — uma pessoa pode ter várias
  // linhas (comentário + respostas) no mesmo verso.
  const commentAuthorsByVerse = new Map<number, string[]>();
  for (const row of commentRows ?? []) {
    const comment = commentById.get(row.id)!;
    commentCountByVerse.set(row.verse, (commentCountByVerse.get(row.verse) ?? 0) + 1);

    const authors = commentAuthorsByVerse.get(row.verse) ?? [];
    if (!authors.includes(row.user_id)) authors.push(row.user_id);
    commentAuthorsByVerse.set(row.verse, authors);

    if (row.parent_id) {
      commentById.get(row.parent_id)?.replies.push(comment);
    } else {
      const list = commentsByVerse[row.verse] ?? [];
      list.push(comment);
      commentsByVerse[row.verse] = list;
    }
  }

  const verses: ReaderVerse[] = chapterContent.verses.map((verse) => {
    const highlightRows = highlightsByVerse.get(verse.number);
    let highlight: VerseHighlight | null = null;

    if (highlightRows && highlightRows.length > 0) {
      const own = highlightRows.find((row) => row.userId === userId);
      highlight = {
        style: own ? HIGHLIGHT_COLORS[own.color] : SAND_HIGHLIGHT,
        ownColor: own?.color ?? null,
        markedBy: highlightRows.map((row) => ({
          name: memberNames.get(row.userId) ?? "Alguém",
          color: row.color,
          isOwn: row.userId === userId,
          avatarUrl: memberAvatars.get(row.userId) ?? null,
        })),
      };
    }

    // Destaque + comentário/resposta na mesma pessoa vira uma entrada só —
    // destaques primeiro (preserva o comportamento anterior do avatar com borda
    // colorida), depois quem só comentou, sem repetir user_id já visto.
    const participantsByUserId = new Map<string, VerseParticipant>();
    for (const row of highlightRows ?? []) {
      participantsByUserId.set(row.userId, {
        name: memberNames.get(row.userId) ?? "Alguém",
        avatarUrl: memberAvatars.get(row.userId) ?? null,
        isOwn: row.userId === userId,
        highlightColor: row.color,
        colorIndex: colorIndexFor(row.userId),
      });
    }
    for (const authorId of commentAuthorsByVerse.get(verse.number) ?? []) {
      if (participantsByUserId.has(authorId)) continue;
      participantsByUserId.set(authorId, {
        name: memberNames.get(authorId) ?? "Alguém",
        avatarUrl: memberAvatars.get(authorId) ?? null,
        isOwn: authorId === userId,
        highlightColor: null,
        colorIndex: colorIndexFor(authorId),
      });
    }

    return {
      number: verse.number,
      text: verse.text,
      highlight,
      commentCount: commentCountByVerse.get(verse.number) ?? 0,
      participants: Array.from(participantsByUserId.values()),
    };
  });

  // Visão geral do capítulo inteiro — mesma ideia de merge/dedup de participants por
  // verso, só que somando toda a atividade do capítulo (e contando por pessoa) em vez
  // de um verso só.
  const chapterParticipantsByUserId = new Map<string, ChapterParticipant>();
  function getOrCreateChapterParticipant(memberId: string): ChapterParticipant {
    const existing = chapterParticipantsByUserId.get(memberId);
    if (existing) return existing;
    const created: ChapterParticipant = {
      name: memberNames.get(memberId) ?? "Alguém",
      avatarUrl: memberAvatars.get(memberId) ?? null,
      isOwn: memberId === userId,
      // Uma pessoa pode ter destacado versos diferentes com cores diferentes no mesmo
      // capítulo — sem uma cor única representativa, o avatar aqui não usa a borda colorida.
      highlightColor: null,
      colorIndex: colorIndexFor(memberId),
      commentCount: 0,
      highlightCount: 0,
    };
    chapterParticipantsByUserId.set(memberId, created);
    return created;
  }
  for (const row of bookmarkRows ?? []) {
    getOrCreateChapterParticipant(row.user_id).highlightCount++;
  }
  for (const row of commentRows ?? []) {
    getOrCreateChapterParticipant(row.user_id).commentCount++;
  }

  const chapterEngagement: ChapterEngagement = {
    participants: Array.from(chapterParticipantsByUserId.values()),
    commentCount: (commentRows ?? []).length,
    highlightCount: (bookmarkRows ?? []).length,
  };

  return {
    reference: chapterContent.reference,
    verses,
    commentsByVerse,
    chapterEngagement,
    planContext,
    isChapterRead,
    isAdmin,
  };
}

/**
 * Contexto de "marcar como lido" pra esse capítulo. Se `requestedPlanDayId` vier
 * (link "Ler" a partir de /package/[id]), usa exatamente esse dia. Sem isso, cai
 * na navegação orgânica pela Bíblia: qualquer capítulo que bata com algum dia de
 * um pacote ATIVO pode ser marcado como lido, passado, hoje ou futuro (ver getPackageStats).
 */
async function getPlanContext(
  supabase: SupabaseServerClient,
  userId: string,
  bookId: string,
  chapter: number,
  requestedPlanDayId?: string
): Promise<ReaderPlanContext | null> {
  if (requestedPlanDayId) {
    const specific = await getPlanContextForDay(supabase, userId, bookId, chapter, requestedPlanDayId);
    if (specific) return specific;
  }
  return getActivePlanContextForChapter(supabase, userId, bookId, chapter);
}

async function getPlanContextForDay(
  supabase: SupabaseServerClient,
  userId: string,
  bookId: string,
  chapter: number,
  planDayId: string
): Promise<ReaderPlanContext | null> {
  const { data: day } = await supabase
    .from("reading_plan_days")
    .select("id, package_id, passages, date")
    .eq("id", planDayId)
    .maybeSingle();
  if (!day) return null;

  // Confere que o dia pedido realmente cobre esse capítulo — evita marcar como
  // lido um dia arbitrário via manipulação da query string.
  const passages = day.passages as Passage[];
  if (!passages.some((passage) => passageMatches(passage, bookId, chapter))) return null;

  const [{ data: pkg }, { data: packageDays }, { data: progress }] = await Promise.all([
    supabase.from("reading_packages").select("title, status").eq("id", day.package_id).single(),
    supabase.from("reading_plan_days").select("id, date").eq("package_id", day.package_id).order("date", { ascending: true }),
    supabase.from("reading_progress").select("id").eq("plan_day_id", day.id).eq("user_id", userId).maybeSingle(),
  ]);
  // Só pacotes ativos podem ser marcados como lidos.
  if (!pkg || pkg.status !== "active") return null;

  const dayNumber = (packageDays ?? []).findIndex((row) => row.id === day.id) + 1;

  return {
    planDayId: day.id,
    packageTitle: pkg.title,
    dayNumber: dayNumber > 0 ? dayNumber : 1,
    dateLabel: formatShortDate(parseDateOnly(day.date)),
    alreadyCompleted: Boolean(progress),
  };
}

/**
 * Navegação orgânica (sem planDay explícito): procura, entre todos os dias de
 * pacotes ativos, algum cujas passagens cubram esse capítulo — sem restrição de
 * data (um capítulo futuro do plano também pode ser marcado como lido se alguém
 * chegar nele direto pela Bíblia). Em caso de mais de um dia bater com o mesmo
 * capítulo, prioriza o mais recente com data já vencida (<= hoje); sem nenhum
 * vencido, usa o primeiro futuro.
 */
interface ActivePackageWithDaysRow {
  id: string;
  title: string;
  reading_plan_days: { id: string; date: string; passages: Passage[] }[];
}

async function getActivePlanContextForChapter(
  supabase: SupabaseServerClient,
  userId: string,
  bookId: string,
  chapter: number
): Promise<ReaderPlanContext | null> {
  // Uma query só (dias embutidos) em vez de pacotes ativos + dias em duas viagens
  // separadas — types/database.ts não modela Relationships, daí o cast manual.
  // A busca de progresso do usuário dispara junto (sem filtrar por plan_day_id,
  // que só sabemos depois de escolher `chosen` abaixo) em vez de esperar essa
  // query terminar pra só então buscar o progresso — troca 2 viagens de rede
  // sequenciais por 1.
  const [{ data }, { data: userProgress }] = await Promise.all([
    supabase.from("reading_packages").select("id, title, reading_plan_days(id, date, passages)").eq("status", "active"),
    supabase.from("reading_progress").select("plan_day_id").eq("user_id", userId).not("plan_day_id", "is", null),
  ]);
  const activePackages = (data ?? []) as unknown as ActivePackageWithDaysRow[];
  if (activePackages.length === 0) return null;

  const allDays = activePackages
    .flatMap((pkg) => pkg.reading_plan_days.map((day) => ({ ...day, package_id: pkg.id })))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const matches = allDays.filter((day) => day.passages.some((passage) => passageMatches(passage, bookId, chapter)));
  if (matches.length === 0) return null;

  const today = toDateOnlyString();
  const dueMatches = matches.filter((day) => day.date <= today);
  const chosen = dueMatches.length > 0 ? dueMatches[dueMatches.length - 1] : matches[0];

  const pkg = activePackages.find((item) => item.id === chosen.package_id)!;
  const packageDays = allDays.filter((day) => day.package_id === chosen.package_id);
  const dayNumber = packageDays.findIndex((day) => day.id === chosen.id) + 1;

  const alreadyCompleted = (userProgress ?? []).some((row) => row.plan_day_id === chosen.id);

  return {
    planDayId: chosen.id,
    packageTitle: pkg.title,
    dayNumber: dayNumber > 0 ? dayNumber : 1,
    dateLabel: formatShortDate(parseDateOnly(chosen.date)),
    alreadyCompleted,
  };
}
