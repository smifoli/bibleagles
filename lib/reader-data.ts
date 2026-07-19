import { getChapter } from "@/lib/bible-data";
import { toDateOnlyString } from "@/lib/format";
import { HIGHLIGHT_COLORS, SAND_HIGHLIGHT, type HighlightColorStyle } from "@/lib/highlight-colors";
import { passageMatches } from "@/lib/reading-plan";
import type { createClient } from "@/lib/supabase/server";
import type { HighlightColor, Passage } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface VerseHighlightMark {
  name: string;
  color: HighlightColor;
}

export interface VerseHighlight {
  style: HighlightColorStyle;
  ownColor: HighlightColor | null;
  markedBy: VerseHighlightMark[];
}

export interface ReaderComment {
  id: string;
  userName: string;
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
}

export interface ReaderPlanContext {
  planDayId: string;
  packageTitle: string;
  dayNumber: number;
  alreadyCompleted: boolean;
}

export interface ReaderData {
  reference: string;
  verses: ReaderVerse[];
  commentsByVerse: Record<number, ReaderComment[]>;
  planContext: ReaderPlanContext | null;
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
  const [{ data: bookmarkRows }, { data: commentRows }, { data: familyMembers }, planContext] = await Promise.all([
    supabase.from("bookmarks").select("user_id, verse, color").eq("book", bookId).eq("chapter", chapter),
    supabase
      .from("comments")
      .select("id, user_id, verse, content, parent_id, created_at, updated_at")
      .eq("book", bookId)
      .eq("chapter", chapter)
      .order("created_at", { ascending: true }),
    supabase.from("users").select("id, name"),
    getPlanContext(supabase, userId, bookId, chapter, requestedPlanDayId),
  ]);

  const memberNames = new Map((familyMembers ?? []).map((member) => [member.id, member.name]));

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
  for (const row of commentRows ?? []) {
    const comment = commentById.get(row.id)!;
    commentCountByVerse.set(row.verse, (commentCountByVerse.get(row.verse) ?? 0) + 1);

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
        markedBy: highlightRows.map((row) => ({ name: memberNames.get(row.userId) ?? "Alguém", color: row.color })),
      };
    }

    return {
      number: verse.number,
      text: verse.text,
      highlight,
      commentCount: commentCountByVerse.get(verse.number) ?? 0,
    };
  });

  return {
    reference: chapterContent.reference,
    verses,
    commentsByVerse,
    planContext,
  };
}

/**
 * Contexto de "marcar como lido" pra esse capítulo. Se `requestedPlanDayId` vier
 * (link "Ler" a partir de /package/[id]), usa exatamente esse dia. Sem isso, cai
 * na navegação orgânica pela Bíblia: qualquer capítulo que bata com algum dia de
 * um pacote ATIVO pode ser marcado como lido, passado, hoje ou futuro — só a lista
 * "Pendentes" de /package/[id] restringe a dias já vencidos (ver getPackageStats).
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
    .select("id, package_id, passages")
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
  const { data } = await supabase.from("reading_packages").select("id, title, reading_plan_days(id, date, passages)").eq("status", "active");
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

  const { data: progress } = await supabase
    .from("reading_progress")
    .select("id")
    .eq("plan_day_id", chosen.id)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    planDayId: chosen.id,
    packageTitle: pkg.title,
    dayNumber: dayNumber > 0 ? dayNumber : 1,
    alreadyCompleted: Boolean(progress),
  };
}
