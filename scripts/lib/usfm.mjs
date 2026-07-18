// Parser mínimo de USFM (formato usado pelos textos baixados de eBible.org) para o
// mesmo formato { book, name, nameLong, chapters } que scripts/download-bibles.mjs
// grava em data/bibles/. Cobre só os marcadores vistos nas versões baixadas
// (Bíblia Livre / Open Nova Bíblia Viva) — não é um parser USFM genérico.

// Marcadores de parágrafo/poesia cujo texto (quando aparecem sem um \v novo) ainda
// pertence ao versículo em aberto — ex.: quebras de linha poéticas (\q1/\q2) no meio
// de um versículo, ou itens de lista (genealogias, inventários).
const VERSE_CONTINUATION_MARKERS = new Set([
  "p", "q", "q1", "q2", "q3", "q4", "m", "mi", "pi", "pi1", "pi2", "pc",
  "li", "li1", "li2", "li3", "li4", "lf", "lh", "nb", "b",
]);

// Marcadores de nota/referência cujo conteúdo inteiro (entre abertura e fechamento)
// deve ser descartado — não é texto bíblico.
const STRIP_CONTENT_TAGS = ["f", "x", "rq"];

// Marcadores de estilo de caractere: mantém o texto interno, remove só as tags.
const UNWRAP_TAGS = ["add", "it", "nd", "wj", "bk", "em", "bd", "sup", "k", "tl", "pn", "sc", "no", "qs"];

export function parseUsfm(raw) {
  let text = raw;

  for (const tag of STRIP_CONTENT_TAGS) {
    text = text.replace(new RegExp(`\\\\${tag}\\s*\\+?.*?\\\\${tag}\\*`, "gs"), "");
  }
  for (const tag of UNWRAP_TAGS) {
    text = text.replace(new RegExp(`\\\\${tag}\\*`, "g"), "");
    text = text.replace(new RegExp(`\\\\${tag}(\\s+|(?=\\S))`, "g"), "");
  }

  const idMatch = text.match(/^\\id\s+(\S+)/m);
  const bookId = idMatch ? idMatch[1].toUpperCase() : null;
  const hMatch = text.match(/^\\h\s+(.+)$/m);
  const toc1Match = text.match(/^\\toc1\s+(.+)$/m);
  const name = (hMatch ? hMatch[1] : toc1Match ? toc1Match[1] : bookId ?? "").trim();
  const nameLong = (toc1Match ? toc1Match[1] : name).trim();

  const lines = text.split("\n");
  const chapters = [];
  let currentChapter = null;
  let currentVerses = [];
  let currentVerseNum = null;
  let currentVerseBuf = "";

  const flushVerse = () => {
    if (currentVerseNum !== null) {
      const t = currentVerseBuf.replace(/\s+/g, " ").trim();
      if (t) currentVerses.push({ number: currentVerseNum, text: t });
    }
    currentVerseBuf = "";
    currentVerseNum = null;
  };

  const flushChapter = () => {
    flushVerse();
    if (currentChapter !== null && currentVerses.length > 0) {
      chapters.push({
        number: currentChapter,
        reference: `${name} ${currentChapter}`,
        verses: currentVerses,
      });
    }
    currentVerses = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const chapterMatch = line.match(/^\\c\s+(\d+)/);
    if (chapterMatch) {
      flushChapter();
      currentChapter = Number(chapterMatch[1]);
      continue;
    }

    const verseMatch = line.match(/^\\v\s+(\d+)\s?(.*)$/);
    if (verseMatch) {
      flushVerse();
      currentVerseNum = Number(verseMatch[1]);
      currentVerseBuf = verseMatch[2] ?? "";
      continue;
    }

    if (line.startsWith("\\")) {
      const markerMatch = line.match(/^\\(\S+)\s*(.*)$/);
      const marker = markerMatch?.[1] ?? "";
      const rest = markerMatch?.[2] ?? "";
      if (VERSE_CONTINUATION_MARKERS.has(marker) && currentVerseNum !== null && rest) {
        currentVerseBuf += ` ${rest}`;
      }
      continue;
    }

    if (currentVerseNum !== null) currentVerseBuf += ` ${line}`;
  }
  flushChapter();

  if (!bookId || chapters.length === 0) return null;
  return { book: bookId, name, nameLong, chapters };
}
