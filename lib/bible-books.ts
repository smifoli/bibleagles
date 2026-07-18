// Catálogo canônico dos 66 livros (ids USX/API.Bible), independente de versão/idioma —
// usado pra montar a navegação (/bible), agrupar em seções e resolver buscas por
// referência ("Jo 3", "Mt 5:3-12"). Nomes e abreviações em PT (ver feedback_i18n_pt_only_until_20
// na memória: texto de UI fica só em PT até a infra de i18n existir).

export interface BookMeta {
  id: string;
  name: string;
  abbreviations: string[];
}

const BOOKS: BookMeta[] = [
  { id: "GEN", name: "Gênesis", abbreviations: ["Gn"] },
  { id: "EXO", name: "Êxodo", abbreviations: ["Êx", "Ex"] },
  { id: "LEV", name: "Levítico", abbreviations: ["Lv"] },
  { id: "NUM", name: "Números", abbreviations: ["Nm"] },
  { id: "DEU", name: "Deuteronômio", abbreviations: ["Dt"] },
  { id: "JOS", name: "Josué", abbreviations: ["Js"] },
  { id: "JDG", name: "Juízes", abbreviations: ["Jz"] },
  { id: "RUT", name: "Rute", abbreviations: ["Rt"] },
  { id: "1SA", name: "1 Samuel", abbreviations: ["1Sm", "1Sa"] },
  { id: "2SA", name: "2 Samuel", abbreviations: ["2Sm", "2Sa"] },
  { id: "1KI", name: "1 Reis", abbreviations: ["1Rs"] },
  { id: "2KI", name: "2 Reis", abbreviations: ["2Rs"] },
  { id: "1CH", name: "1 Crônicas", abbreviations: ["1Cr"] },
  { id: "2CH", name: "2 Crônicas", abbreviations: ["2Cr"] },
  { id: "EZR", name: "Esdras", abbreviations: ["Ed"] },
  { id: "NEH", name: "Neemias", abbreviations: ["Ne"] },
  { id: "EST", name: "Ester", abbreviations: ["Et"] },
  // "Jó" colide com "Jo" (João) depois de remover acento — só entra no nível exato
  // (com acento), não no fallback normalizado. Ver resolveBook().
  { id: "JOB", name: "Jó", abbreviations: ["Job"] },
  { id: "PSA", name: "Salmos", abbreviations: ["Sl"] },
  { id: "PRO", name: "Provérbios", abbreviations: ["Pv"] },
  { id: "ECC", name: "Eclesiastes", abbreviations: ["Ec"] },
  { id: "SNG", name: "Cântico dos Cânticos", abbreviations: ["Ct"] },
  { id: "ISA", name: "Isaías", abbreviations: ["Is"] },
  { id: "JER", name: "Jeremias", abbreviations: ["Jr"] },
  { id: "LAM", name: "Lamentações", abbreviations: ["Lm"] },
  { id: "EZK", name: "Ezequiel", abbreviations: ["Ez"] },
  { id: "DAN", name: "Daniel", abbreviations: ["Dn"] },
  { id: "HOS", name: "Oseias", abbreviations: ["Os"] },
  { id: "JOL", name: "Joel", abbreviations: ["Jl"] },
  { id: "AMO", name: "Amós", abbreviations: ["Am"] },
  { id: "OBA", name: "Obadias", abbreviations: ["Ob"] },
  { id: "JON", name: "Jonas", abbreviations: ["Jn"] },
  { id: "MIC", name: "Miqueias", abbreviations: ["Mq"] },
  { id: "NAM", name: "Naum", abbreviations: ["Na"] },
  { id: "HAB", name: "Habacuque", abbreviations: ["Hc"] },
  { id: "ZEP", name: "Sofonias", abbreviations: ["Sf"] },
  { id: "HAG", name: "Ageu", abbreviations: ["Ag"] },
  { id: "ZEC", name: "Zacarias", abbreviations: ["Zc"] },
  { id: "MAL", name: "Malaquias", abbreviations: ["Ml"] },
  { id: "MAT", name: "Mateus", abbreviations: ["Mt"] },
  { id: "MRK", name: "Marcos", abbreviations: ["Mc"] },
  { id: "LUK", name: "Lucas", abbreviations: ["Lc"] },
  { id: "JHN", name: "João", abbreviations: ["Jo"] },
  { id: "ACT", name: "Atos", abbreviations: ["At"] },
  { id: "ROM", name: "Romanos", abbreviations: ["Rm"] },
  { id: "1CO", name: "1 Coríntios", abbreviations: ["1Co"] },
  { id: "2CO", name: "2 Coríntios", abbreviations: ["2Co"] },
  { id: "GAL", name: "Gálatas", abbreviations: ["Gl"] },
  { id: "EPH", name: "Efésios", abbreviations: ["Ef"] },
  { id: "PHP", name: "Filipenses", abbreviations: ["Fp"] },
  { id: "COL", name: "Colossenses", abbreviations: ["Cl"] },
  { id: "1TH", name: "1 Tessalonicenses", abbreviations: ["1Ts"] },
  { id: "2TH", name: "2 Tessalonicenses", abbreviations: ["2Ts"] },
  { id: "1TI", name: "1 Timóteo", abbreviations: ["1Tm"] },
  { id: "2TI", name: "2 Timóteo", abbreviations: ["2Tm"] },
  { id: "TIT", name: "Tito", abbreviations: ["Tt"] },
  { id: "PHM", name: "Filemom", abbreviations: ["Fm"] },
  { id: "HEB", name: "Hebreus", abbreviations: ["Hb"] },
  { id: "JAS", name: "Tiago", abbreviations: ["Tg"] },
  { id: "1PE", name: "1 Pedro", abbreviations: ["1Pe"] },
  { id: "2PE", name: "2 Pedro", abbreviations: ["2Pe"] },
  { id: "1JN", name: "1 João", abbreviations: ["1Jo"] },
  { id: "2JN", name: "2 João", abbreviations: ["2Jo"] },
  { id: "3JN", name: "3 João", abbreviations: ["3Jo"] },
  { id: "JUD", name: "Judas", abbreviations: ["Jd"] },
  { id: "REV", name: "Apocalipse", abbreviations: ["Ap"] },
];

export const BOOK_ORDER: string[] = BOOKS.map((book) => book.id);

const BOOKS_BY_ID = new Map(BOOKS.map((book) => [book.id, book]));

export function getBookMeta(bookId: string): BookMeta | undefined {
  return BOOKS_BY_ID.get(bookId);
}

interface BookSection {
  label: string;
  books: string[];
}

export const OLD_TESTAMENT_SECTIONS: BookSection[] = [
  { label: "Pentateuco", books: ["GEN", "EXO", "LEV", "NUM", "DEU"] },
  { label: "Históricos", books: ["JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI", "1CH", "2CH", "EZR", "NEH", "EST"] },
  { label: "Poéticos", books: ["JOB", "PSA", "PRO", "ECC", "SNG"] },
  { label: "Profetas Maiores", books: ["ISA", "JER", "LAM", "EZK", "DAN"] },
  { label: "Profetas Menores", books: ["HOS", "JOL", "AMO", "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL"] },
];

export const NEW_TESTAMENT_SECTIONS: BookSection[] = [
  { label: "Evangelhos", books: ["MAT", "MRK", "LUK", "JHN"] },
  { label: "Histórico", books: ["ACT"] },
  { label: "Cartas de Paulo", books: ["ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM"] },
  { label: "Cartas Gerais", books: ["HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD"] },
  { label: "Apocalipse", books: ["REV"] },
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Dois níveis: "exato" (minúsculo, mas mantém acento — resolve "Jó" x "Jo") e
// "normalizado" (sem acento, tolera erro de digitação) como fallback.
const EXACT_LOOKUP = new Map<string, string>();
const NORMALIZED_LOOKUP = new Map<string, string>();

for (const book of BOOKS) {
  const candidates = [book.name, ...book.abbreviations];
  for (const candidate of candidates) {
    EXACT_LOOKUP.set(candidate.toLowerCase(), book.id);
    // "Jó" só entra no mapa exato — não registra a colisão "jo" no normalizado.
    if (book.id !== "JOB") {
      NORMALIZED_LOOKUP.set(normalize(candidate), book.id);
    }
  }
}
NORMALIZED_LOOKUP.set("job", "JOB");

export function resolveBook(query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  return EXACT_LOOKUP.get(trimmed.toLowerCase()) ?? NORMALIZED_LOOKUP.get(normalize(trimmed)) ?? null;
}

export interface BookSuggestion {
  id: string;
  name: string;
}

export function suggestBooks(query: string, limit = 5): BookSuggestion[] {
  const norm = normalize(query);
  if (!norm) return [];

  const results: BookSuggestion[] = [];
  for (const book of BOOKS) {
    const candidates = [book.name, ...book.abbreviations];
    if (candidates.some((candidate) => normalize(candidate).startsWith(norm))) {
      results.push({ id: book.id, name: book.name });
      if (results.length >= limit) break;
    }
  }
  return results;
}

export interface ParsedReference {
  book: string;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
}

const REFERENCE_PATTERN = /^(.+?)\s+(\d{1,3})(?:[:.](\d{1,3})(?:-(\d{1,3}))?)?$/;

/** Aceita "Jo 3", "João 3:16", "Mt 5:3-12", "1 Coríntios 13", "1Co 13:4". */
export function parseReference(input: string): ParsedReference | null {
  const match = input.trim().match(REFERENCE_PATTERN);
  if (!match) return null;

  const [, bookPart, chapterStr, verseStr, verseEndStr] = match;
  const bookId = resolveBook(bookPart);
  if (!bookId) return null;

  return {
    book: bookId,
    chapter: Number(chapterStr),
    verseStart: verseStr ? Number(verseStr) : null,
    verseEnd: verseEndStr ? Number(verseEndStr) : null,
  };
}
