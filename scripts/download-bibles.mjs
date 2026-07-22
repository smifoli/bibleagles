// Baixa o texto completo das versões bíblicas de domínio público / licença livre
// listadas em lib/bible-versions.ts e grava como JSON estático em data/bibles/,
// para o app parar de depender de chamadas ao vivo à API.Bible (lib/bible-data.ts lê
// esses arquivos diretamente).
//
// Duas fontes, dependendo de version.source.provider:
//   - "api.bible": um capítulo por requisição (rate-limited + resumível — ver abaixo).
//   - "ebible.org": baixa um .zip USFM único e faz o parse localmente (scripts/lib/usfm.mjs).
//
// Uso:
//   npm run bible:download
//   npm run bible:download -- --force        (re-baixa mesmo o que já existe)
//   npm run bible:download -- --only=BLT,KJV (baixa só essas siglas)
//
// A parte de api.bible é resumível: por padrão pula livros cujo arquivo já existe, então
// se a cota diária (5.000 req/dia no plano gratuito) acabar no meio, rode de novo depois
// (no dia seguinte, ou com uma chave nova) que ele continua de onde parou.

import { mkdir, writeFile, access, readdir, readFile, mkdtemp, rm } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import path from "path";

const execFileAsync = promisify(execFile);

const BIBLE_API_BASE_URL = "https://api.scripture.api.bible/v1";
const EBIBLE_BASE_URL = "https://ebible.org/Scriptures";
const DATA_DIR = path.join(process.cwd(), "data", "bibles");
const REQUEST_DELAY_MS = 120;
const MAX_RETRIES = 5;

// Mantido em sincronia manual com BIBLE_VERSIONS em lib/bible-versions.ts.
// NVI fica de fora de propósito: é texto licenciado à parte, importado uma única vez
// com scripts/import-nvi.mjs — não com este script.
const VERSIONS = [
  { abbreviation: "BLT", source: { provider: "ebible.org", id: "porbr2018" } },
  { abbreviation: "ONBV", source: { provider: "ebible.org", id: "poronbv" } },
  { abbreviation: "WEB", source: { provider: "api.bible", bibleId: "9879dbb7cfe39e4d-04" } },
  { abbreviation: "KJV", source: { provider: "api.bible", bibleId: "de4e12af7f28f599-02" } },
  { abbreviation: "RVR09", source: { provider: "api.bible", bibleId: "592420522e16049f-01" } },
  { abbreviation: "VBL", source: { provider: "api.bible", bibleId: "482ddd53705278cc-02" } },
  { abbreviation: "DB1885", source: { provider: "api.bible", bibleId: "41f25b97f468e10b-01" } },
  // Alemão removido temporariamente (lento demais) — ver comentário em lib/bible-versions.ts.
  // { abbreviation: "L1912", source: { provider: "api.bible", bibleId: "926aa5efbc5e04e2-01" } },
  // { abbreviation: "ELO", source: { provider: "api.bible", bibleId: "95410db44ef800c1-01" } },
];

const CONTENT_PARAMS = {
  "content-type": "json",
  "include-notes": "false",
  "include-titles": "false",
  "include-chapter-numbers": "false",
  "include-verse-numbers": "true",
};

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyArg = args.find((arg) => arg.startsWith("--only="));
const only = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",")) : null;

let requestCount = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

// ── api.bible ────────────────────────────────────────────────────────────

async function apiFetch(apiKey, pathname, params) {
  const url = new URL(`${BIBLE_API_BASE_URL}${pathname}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await sleep(REQUEST_DELAY_MS);
    requestCount++;
    const response = await fetch(url.toString(), { headers: { "api-key": apiKey } });

    if (response.ok) {
      const json = await response.json();
      return json.data;
    }

    if (response.status === 429) {
      if (attempt === MAX_RETRIES) throw new Error("QUOTA_EXHAUSTED");
      const backoff = 2000 * 2 ** attempt;
      console.warn(`  429 recebido, aguardando ${backoff}ms (tentativa ${attempt + 1}/${MAX_RETRIES})...`);
      await sleep(backoff);
      continue;
    }

    if (response.status >= 500 && attempt < MAX_RETRIES) {
      const backoff = 1000 * 2 ** attempt;
      console.warn(`  ${response.status} recebido, aguardando ${backoff}ms...`);
      await sleep(backoff);
      continue;
    }

    throw new Error(`API.Bible respondeu ${response.status} para ${pathname}`);
  }

  throw new Error(`Esgotadas as tentativas para ${pathname}`);
}

// A API.Bible representa o texto como uma árvore USX/JSON: marcadores de versículo
// ("verse", attrs.number) seguidos por nós de texto até o próximo marcador.
function extractVerses(content) {
  const verses = [];
  let currentNumber = null;
  let buffer = "";

  const flush = () => {
    if (currentNumber !== null) {
      const text = buffer.replace(/\s+/g, " ").trim();
      if (text) verses.push({ number: currentNumber, text });
    }
    buffer = "";
  };

  const visit = (node) => {
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

async function downloadBookFromApiBible(apiKey, bibleId, book, outDir) {
  const chapterList = await apiFetch(apiKey, `/bibles/${bibleId}/books/${book.id}/chapters`);
  const chapters = [];

  for (const chapterMeta of chapterList) {
    if (chapterMeta.number === "intro") continue;

    const data = await apiFetch(apiKey, `/bibles/${bibleId}/chapters/${chapterMeta.id}`, CONTENT_PARAMS);
    chapters.push({
      number: Number(chapterMeta.number),
      reference: data.reference,
      verses: extractVerses(data.content),
    });
  }

  const bookFile = { book: book.id, name: book.name, nameLong: book.nameLong, chapters };
  await writeFile(path.join(outDir, `${book.id}.json`), JSON.stringify(bookFile), "utf-8");
}

async function downloadFromApiBible(apiKey, version, outDir) {
  const { bibleId } = version.source;
  const books = await apiFetch(apiKey, `/bibles/${bibleId}/books`);

  for (const book of books) {
    const outPath = path.join(outDir, `${book.id}.json`);
    if (!force && (await fileExists(outPath))) {
      console.log(`  ${book.id}: já existe, pulando`);
      continue;
    }

    process.stdout.write(`  ${book.id}...`);
    try {
      await downloadBookFromApiBible(apiKey, bibleId, book, outDir);
      console.log(" ok");
    } catch (err) {
      if (err.message === "QUOTA_EXHAUSTED") throw err;
      console.log(` falhou: ${err.message}`);
    }
  }
}

// ── eBible.org ───────────────────────────────────────────────────────────

async function downloadFromEbible(version, outDir) {
  const { parseUsfm } = await import("./lib/usfm.mjs");
  const { id } = version.source;

  const tmpDir = await mkdtemp(path.join(tmpdir(), "bibleagles-ebible-"));
  try {
    const zipUrl = `${EBIBLE_BASE_URL}/${id}_usfm.zip`;
    console.log(`  baixando ${zipUrl}...`);
    const response = await fetch(zipUrl);
    if (!response.ok) throw new Error(`eBible.org respondeu ${response.status} para ${id}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const zipPath = path.join(tmpDir, `${id}.zip`);
    await writeFile(zipPath, buffer);

    await execFileAsync("unzip", ["-o", "-q", zipPath, "-d", tmpDir]);

    const usfmFiles = (await readdir(tmpDir)).filter((name) => name.endsWith(".usfm"));
    for (const fileName of usfmFiles) {
      const raw = await readFile(path.join(tmpDir, fileName), "utf-8");
      const parsed = parseUsfm(raw);
      if (!parsed) {
        console.log(`  ${fileName}: sem capítulos reconhecidos, pulando`);
        continue;
      }

      const outPath = path.join(outDir, `${parsed.book}.json`);
      if (!force && (await fileExists(outPath))) {
        console.log(`  ${parsed.book}: já existe, pulando`);
        continue;
      }

      await writeFile(outPath, JSON.stringify(parsed), "utf-8");
      console.log(`  ${parsed.book}: ok (${parsed.chapters.length} capítulos)`);
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

// ── orquestração ─────────────────────────────────────────────────────────

async function run() {
  const versions = only ? VERSIONS.filter((v) => only.has(v.abbreviation)) : VERSIONS;
  const needsApiKey = versions.some((v) => v.source.provider === "api.bible");
  const apiKey = process.env.BIBLE_API_KEY;
  if (needsApiKey && !apiKey) {
    console.error("BIBLE_API_KEY não definida. Use: npm run bible:download");
    process.exit(1);
  }

  for (const version of versions) {
    console.log(`\n=== ${version.abbreviation} (${version.source.provider}) ===`);
    const outDir = path.join(DATA_DIR, version.abbreviation);
    await mkdir(outDir, { recursive: true });

    try {
      if (version.source.provider === "api.bible") {
        await downloadFromApiBible(apiKey, version, outDir);
      } else {
        await downloadFromEbible(version, outDir);
      }
    } catch (err) {
      if (err.message === "QUOTA_EXHAUSTED") {
        console.error(
          `\nCota da API.Bible esgotada depois de ${requestCount} requisições. ` +
            `Rode "npm run bible:download" de novo mais tarde (ou amanhã) — livros já baixados são pulados automaticamente.`
        );
        process.exit(2);
      }
      throw err;
    }
  }

  console.log(`\nConcluído. ${requestCount} requisições à API.Bible no total.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
