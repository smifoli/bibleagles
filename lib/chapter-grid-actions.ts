"use server";

import { revalidatePath } from "next/cache";
import { toDateOnlyString } from "@/lib/format";
import { passageMatches } from "@/lib/reading-plan";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Passage } from "@/types/database";

type PlanDayRow = { id: string; date: string; passages: Passage[] };

function revalidateBookPaths(book: string) {
  revalidatePath(`/bible/${book}`);
  revalidatePath("/bible");
  revalidatePath("/");
}

/**
 * Marca TODOS os capítulos do livro como lidos de uma vez (ação em lote da grade de
 * capítulos). Pra cada capítulo, resolve o mesmo jeito que abrir o capítulo sozinho
 * resolveria (ver getActivePlanContextForChapter em reader-data.ts): se ele cobre um
 * dia de algum pacote ativo, marca esse dia inteiro (upsert por plan_day_id — pode
 * incluir outros capítulos/livros do mesmo dia); senão, marca só esse capítulo, livre
 * (upsert por book+chapter). Idempotente — já lidos continuam lidos sem duplicar.
 */
export async function markAllChaptersRead(book: string, chapterCount: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const { data } = await supabase
    .from("reading_packages")
    .select("id, reading_plan_days(id, date, passages)")
    .eq("status", "active");
  const activeDays = ((data ?? []) as unknown as { reading_plan_days: PlanDayRow[] }[])
    .flatMap((pkg) => pkg.reading_plan_days)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const today = toDateOnlyString();
  const planDayIdByChapter = new Map<number, string>();
  for (let chapter = 1; chapter <= chapterCount; chapter++) {
    const matches = activeDays.filter((day) => day.passages.some((passage) => passageMatches(passage, book, chapter)));
    if (matches.length === 0) continue;
    const dueMatches = matches.filter((day) => day.date <= today);
    const chosen = dueMatches.length > 0 ? dueMatches[dueMatches.length - 1] : matches[0];
    planDayIdByChapter.set(chapter, chosen.id);
  }

  const planDayIds = Array.from(new Set(planDayIdByChapter.values()));
  const freeformChapters = Array.from({ length: chapterCount }, (_, index) => index + 1).filter(
    (chapter) => !planDayIdByChapter.has(chapter)
  );

  const [{ error: planError }, { error: freeformError }] = await Promise.all([
    planDayIds.length > 0
      ? supabase
          .from("reading_progress")
          .upsert(
            planDayIds.map((planDayId) => ({ user_id: user.id, plan_day_id: planDayId, book: null, chapter: null })),
            { onConflict: "user_id,plan_day_id" }
          )
      : Promise.resolve({ error: null }),
    freeformChapters.length > 0
      ? supabase
          .from("reading_progress")
          .upsert(
            freeformChapters.map((chapter) => ({ user_id: user.id, book, chapter, plan_day_id: null })),
            { onConflict: "user_id,book,chapter" }
          )
      : Promise.resolve({ error: null }),
  ]);

  if (planError || freeformError) return { error: "Não foi possível marcar os capítulos como lidos." };

  revalidateBookPaths(book);
  return {};
}

/**
 * Desfaz a leitura de TODOS os capítulos do livro (ação em lote da grade de
 * capítulos). Remove tanto marcações livres (book+chapter) quanto — atenção — dias de
 * plano inteiros que cobrem algum capítulo desse livro; se um desses dias também
 * cobrir capítulos de OUTRO livro, esses capítulos voltam a não-lido junto (mesma
 * granularidade "por dia" do botão avulso em reader-actions.ts, só que em lote).
 */
export async function unmarkAllChaptersRead(book: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const { data: planRows } = await supabase
    .from("reading_progress")
    .select("plan_day_id, reading_plan_days(passages)")
    .eq("user_id", user.id)
    .not("plan_day_id", "is", null);

  const planDayIdsToDelete = ((planRows ?? []) as unknown as { plan_day_id: string; reading_plan_days: { passages: Passage[] } | { passages: Passage[] }[] | null }[])
    .filter((row) => {
      const day = Array.isArray(row.reading_plan_days) ? row.reading_plan_days[0] : row.reading_plan_days;
      return day?.passages.some((passage) => passage.book === book) ?? false;
    })
    .map((row) => row.plan_day_id);

  const [{ error: freeformError }, { error: planError }] = await Promise.all([
    supabase.from("reading_progress").delete().eq("user_id", user.id).eq("book", book),
    planDayIdsToDelete.length > 0
      ? supabase.from("reading_progress").delete().eq("user_id", user.id).in("plan_day_id", planDayIdsToDelete)
      : Promise.resolve({ error: null }),
  ]);

  if (freeformError || planError) return { error: "Não foi possível desmarcar os capítulos." };

  revalidateBookPaths(book);
  return {};
}
