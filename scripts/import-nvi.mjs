// Importa o texto da NVI (Nova Versão Internacional) de um JSON licenciado fornecido
// diretamente (formato "bible_databases": [{ abbrev, chapters: [[versículo, ...], ...] }])
// e grava no mesmo formato { book, name, nameLong, chapters } usado por data/bibles/
// (ver scripts/download-bibles.mjs). Diferente das outras versões, a NVI não pode ser
// baixada via api.bible/ebible.org (ver comentário em lib/bible-versions.ts) — o texto vem
// de uma cópia licenciada à parte, por isso este é um script manual e não faz parte de
// `npm run bible:download`.
//
// Uso:
//   node scripts/import-nvi.mjs --source=/caminho/para/pt_nvi.json

import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "bibles");
const BLT_DIR = path.join(DATA_DIR, "BLT");

// Ordem canônica dos 66 livros (Gênesis → Apocalipse), na mesma ordem em que aparecem
// no JSON de origem — usada para casar cada entrada `abbrev` com o código de 3 letras
// (GEN, EXO, ...) já usado internamente pelo app (ver data/bibles/BLT/*.json).
const BOOK_ORDER = [
  "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA",
  "1KI", "2KI", "1CH", "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO",
  "ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS", "JOL", "AMO",
  "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL", "MAT",
  "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP",
  "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE",
  "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
];

async function run() {
  const sourceArg = process.argv.find((arg) => arg.startsWith("--source="));
  if (!sourceArg) {
    console.error("Uso: node scripts/import-nvi.mjs --source=/caminho/para/pt_nvi.json");
    process.exit(1);
  }
  const sourcePath = sourceArg.slice("--source=".length);

  const raw = (await readFile(sourcePath, "utf-8")).replace(/^﻿/, "");
  const books = JSON.parse(raw);

  if (books.length !== BOOK_ORDER.length) {
    throw new Error(`Esperava ${BOOK_ORDER.length} livros no JSON de origem, encontrei ${books.length}.`);
  }

  const outDir = path.join(DATA_DIR, "NVI");
  await mkdir(outDir, { recursive: true });

  for (let i = 0; i < books.length; i++) {
    const source = books[i];
    const code = BOOK_ORDER[i];

    const bltRaw = await readFile(path.join(BLT_DIR, `${code}.json`), "utf-8");
    const blt = JSON.parse(bltRaw);

    if (source.chapters.length !== blt.chapters.length) {
      throw new Error(
        `${code}: origem tem ${source.chapters.length} capítulos, BLT tem ${blt.chapters.length} — abortando (provável desalinhamento de ordem).`
      );
    }

    const chapters = source.chapters.map((verseTexts, chapterIdx) => {
      const number = chapterIdx + 1;
      return {
        number,
        reference: `${blt.name} ${number}`,
        verses: verseTexts.map((text, verseIdx) => ({ number: verseIdx + 1, text: text.trim() })),
      };
    });

    const bookFile = { book: code, name: blt.name, nameLong: blt.nameLong, chapters };
    await writeFile(path.join(outDir, `${code}.json`), JSON.stringify(bookFile), "utf-8");
    console.log(`  ${code}: ok (${chapters.length} capítulos)`);
  }

  console.log(`\nConcluído. ${books.length} livros gravados em ${outDir}.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
