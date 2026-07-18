import { parseDateOnly, toDateOnlyString } from "@/lib/format";
import type { Passage } from "@/types/database";

export interface GeneratedDay {
  date: string;
  title: string;
  passages: Passage[];
}

function addDays(dateOnly: string, days: number): string {
  const date = parseDateOnly(dateOnly);
  date.setDate(date.getDate() + days);
  return toDateOnlyString(date);
}

/**
 * Distribui capítulos [chapterStart..chapterEnd] sequencialmente pelos dias a
 * partir de startDate, `pace` capítulos por dia (issue #12). Cada dia gera
 * uma única passagem de capítulo(s) inteiro(s) — sem versículo específico.
 */
export function generateAutoPlanDays(
  bookId: string,
  bookName: string,
  chapterStart: number,
  chapterEnd: number,
  pace: number,
  startDate: string
): GeneratedDay[] {
  const days: GeneratedDay[] = [];
  let chapter = chapterStart;
  let dayIndex = 0;

  while (chapter <= chapterEnd) {
    const rangeEnd = Math.min(chapter + pace - 1, chapterEnd);
    days.push({
      date: addDays(startDate, dayIndex),
      title: chapter === rangeEnd ? `${bookName} ${chapter}` : `${bookName} ${chapter}-${rangeEnd}`,
      passages: [{ book: bookId, chapter_start: chapter, verse_start: null, chapter_end: rangeEnd, verse_end: null }],
    });
    chapter = rangeEnd + 1;
    dayIndex++;
  }

  return days;
}
