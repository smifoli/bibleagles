const BIBLE_API_BASE_URL = "https://api.scripture.api.bible/v1";

// Texto bíblico publicado não muda — cache longo evita gastar a cota de 5.000 req/dia.
const DEFAULT_REVALIDATE_SECONDS = 60 * 60 * 24 * 30;

export interface Verse {
  number: number;
  text: string;
}

export interface ChapterContent {
  bibleId: string;
  bookId: string;
  chapter: number;
  reference: string;
  verses: Verse[];
}

export interface BibleBook {
  id: string;
  name: string;
  nameLong: string;
  abbreviation: string;
}

interface ContentNode {
  type?: string;
  name?: string;
  attrs?: Record<string, string>;
  text?: string;
  items?: ContentNode[];
}

interface RawBook {
  id: string;
  abbreviation: string;
  name: string;
  nameLong: string;
}

interface RawPassageContent {
  reference: string;
  content: ContentNode[];
}

async function bibleApiFetch<T>(
  path: string,
  params?: Record<string, string>,
  revalidate: number = DEFAULT_REVALIDATE_SECONDS
): Promise<T> {
  const apiKey = process.env.BIBLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "BIBLE_API_KEY não configurada. Crie uma chave em https://scripture.api.bible/ e defina a variável de ambiente."
    );
  }

  const url = new URL(`${BIBLE_API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: { "api-key": apiKey },
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`API.Bible respondeu ${response.status} para ${path}`);
  }

  const json = (await response.json()) as { data: T };
  return json.data;
}

// API.Bible representa o texto como uma árvore USX/JSON: marcadores de versículo ("verse", attrs.number)
// seguidos por nós de texto até o próximo marcador. Percorremos a árvore acumulando o texto de cada versículo.
function extractVerses(content: ContentNode[]): Verse[] {
  const verses: Verse[] = [];
  let currentNumber: number | null = null;
  let buffer = "";

  const flush = () => {
    if (currentNumber !== null) {
      const text = buffer.replace(/\s+/g, " ").trim();
      if (text) verses.push({ number: currentNumber, text });
    }
    buffer = "";
  };

  const visit = (node: ContentNode) => {
    if (node.type === "tag" && node.name === "verse") {
      if (node.attrs?.number) {
        flush();
        currentNumber = Number(node.attrs.number);
      }
      return;
    }

    if (node.type === "text" && typeof node.text === "string") {
      buffer += node.text;
      return;
    }

    if (node.items) {
      for (const child of node.items) visit(child);
      if (node.type === "tag") buffer += " ";
    }
  };

  for (const node of content) visit(node);
  flush();

  return verses;
}

const CONTENT_PARAMS = {
  "content-type": "json",
  "include-notes": "false",
  "include-titles": "false",
  "include-chapter-numbers": "false",
  "include-verse-numbers": "true",
};

export async function getBooks(bibleId: string): Promise<BibleBook[]> {
  const books = await bibleApiFetch<RawBook[]>(`/bibles/${bibleId}/books`);
  return books.map((book) => ({
    id: book.id,
    name: book.name,
    nameLong: book.nameLong,
    abbreviation: book.abbreviation,
  }));
}

export async function getChapter(bibleId: string, bookId: string, chapter: number): Promise<ChapterContent> {
  const chapterId = `${bookId}.${chapter}`;
  const data = await bibleApiFetch<RawPassageContent>(`/bibles/${bibleId}/chapters/${chapterId}`, CONTENT_PARAMS);

  return {
    bibleId,
    bookId,
    chapter,
    reference: data.reference,
    verses: extractVerses(data.content),
  };
}

export async function getVerses(
  bibleId: string,
  bookId: string,
  chapter: number,
  verseStart: number,
  verseEnd: number = verseStart
): Promise<Verse[]> {
  const startId = `${bookId}.${chapter}.${verseStart}`;
  const passageId = verseStart === verseEnd ? startId : `${startId}-${bookId}.${chapter}.${verseEnd}`;

  const data = await bibleApiFetch<RawPassageContent>(`/bibles/${bibleId}/passages/${passageId}`, CONTENT_PARAMS);

  return extractVerses(data.content);
}
