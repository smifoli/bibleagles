import { readFileSync } from "fs";
import path from "path";

export interface Verse {
  number: number;
  text: string;
}

export interface ChapterContent {
  version: string;
  bookId: string;
  chapter: number;
  reference: string;
  verses: Verse[];
}

interface BookFile {
  book: string;
  name: string;
  nameLong: string;
  chapters: { number: number; reference: string; verses: Verse[] }[];
}

const DATA_DIR = path.join(process.cwd(), "data", "bibles");
const bookCache = new Map<string, BookFile>();

function loadBook(version: string, bookId: string): BookFile {
  const key = `${version}/${bookId}`;
  const cached = bookCache.get(key);
  if (cached) return cached;

  const filePath = path.join(DATA_DIR, version, `${bookId}.json`);
  const raw = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as BookFile;
  bookCache.set(key, parsed);
  return parsed;
}

/** Lê um capítulo do texto bíblico empacotado localmente (ver scripts/download-bibles.mjs). */
export function getChapter(version: string, bookId: string, chapter: number): ChapterContent {
  const book = loadBook(version, bookId);
  const chapterData = book.chapters.find((item) => item.number === chapter);
  if (!chapterData) {
    throw new Error(`Capítulo ${chapter} não encontrado em ${bookId} (${version}).`);
  }

  return {
    version,
    bookId,
    chapter,
    reference: chapterData.reference,
    verses: chapterData.verses,
  };
}

export interface BookSummary {
  id: string;
  name: string;
  nameLong: string;
  chapterCount: number;
}

/** Metadados de um livro (nome + nº de capítulos) pra navegação (/bible). */
export function getBookSummary(version: string, bookId: string): BookSummary {
  const book = loadBook(version, bookId);
  return { id: book.book, name: book.name, nameLong: book.nameLong, chapterCount: book.chapters.length };
}

/** Como getBookSummary, mas retorna null em vez de lançar se o livro não existir nessa versão. */
export function tryGetBookSummary(version: string, bookId: string): BookSummary | null {
  try {
    return getBookSummary(version, bookId);
  } catch {
    return null;
  }
}
