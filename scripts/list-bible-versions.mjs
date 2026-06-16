const BIBLE_API_BASE_URL = "https://api.scripture.api.bible/v1";

async function run() {
  const apiKey = process.env.BIBLE_API_KEY;
  if (!apiKey) {
    console.error("BIBLE_API_KEY não definida. Use: node --env-file=.env.local scripts/list-bible-versions.mjs");
    process.exit(1);
  }

  const response = await fetch(`${BIBLE_API_BASE_URL}/bibles`, {
    headers: { "api-key": apiKey },
  });

  if (!response.ok) {
    console.error(`API.Bible respondeu ${response.status}: ${await response.text()}`);
    process.exit(1);
  }

  const { data: bibles } = await response.json();

  const rows = bibles
    .map((bible) => ({
      id: bible.id,
      abbreviation: bible.abbreviationLocal || bible.abbreviation,
      name: bible.nameLocal || bible.name,
      language: bible.language?.name,
    }))
    .sort((a, b) => (a.language || "").localeCompare(b.language || ""));

  console.table(rows);
  console.log(
    "\nLocalize as siglas do PRD (NVI, ARA, ACF, NVT, NIV, KJV, ESV, RVR1960, NVI-ES, DHH, LUT, SCH2000, ELB) na tabela acima e copie o `id` correspondente para `bibleId` em lib/bible-versions.ts."
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
