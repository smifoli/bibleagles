import type { Language } from "@/types/database";

export interface BibleVersion {
  abbreviation: string;
  name: string;
  language: Language;
  isDefault?: boolean;
  /**
   * De onde o texto baixado por `npm run bible:download` para data/bibles/<abbreviation>/
   * veio. Não é usado em runtime — o app lê o JSON local (lib/bible-data.ts); serve só de
   * referência para re-baixar ou trocar a fonte.
   */
  source:
    | { provider: "api.bible"; bibleId: string }
    | { provider: "ebible.org"; id: string };
}

/**
 * Só versões de domínio público / licença livre entram aqui — são as únicas que podem
 * ser baixadas uma vez e empacotadas como JSON estático no app (ver lib/bible-data.ts e
 * scripts/download-bibles.mjs). Traduções comerciais (NVI, ARA, ACF, NVT, NIV, ESV,
 * RVR1960, LUT 2017, SCH2000 etc.) mesmo quando acessíveis ao vivo via API.Bible, não
 * podem ser redistribuídas dentro do app sem licenciamento à parte — por isso ficam de fora.
 *
 * Duas versões por idioma, exceto italiano: não foi encontrada uma segunda tradução
 * italiana de licença livre com o cânon completo (só Diodati 1885). Pode ser adicionada
 * depois se aparecer uma fonte melhor.
 *
 * BLT e ONBV vêm de eBible.org, não da API.Bible: o catálogo da API.Bible só tinha o Novo
 * Testamento do BLT (mirror desatualizado do projeto), enquanto eBible.org tem o cânon
 * completo das duas.
 *
 * Removidas temporariamente (download incompleto):
 *  - Alemão (L1912, ELO): cortado de propósito por ser lento — ver scripts/download-bibles.mjs.
 *  - Espanhol (RVR09, VBL) e italiano (DB1885): a chave da API.Bible bateu no limite MENSAL
 *    (403 "Monthly limit exceeded") no meio do download, então alguns livros/capítulos
 *    ficaram faltando em data/bibles/. Ficam fora do catálogo pra não expor uma versão com
 *    buracos no leitor. Terminar o download (`npm run bible:download -- --only=RVR09,VBL,DB1885,L1912,ELO`)
 *    só é possível depois que a cota da API.Bible resetar (mensal) ou com upgrade de plano —
 *    depois é só devolver as entradas aqui.
 */
export const BIBLE_VERSIONS: BibleVersion[] = [
  { abbreviation: "BLT", name: "Bíblia Livre Para Todos", language: "pt", isDefault: true, source: { provider: "ebible.org", id: "porbr2018" } },
  { abbreviation: "ONBV", name: "Open Nova Bíblia Viva", language: "pt", source: { provider: "ebible.org", id: "poronbv" } },
  { abbreviation: "WEB", name: "World English Bible", language: "en", isDefault: true, source: { provider: "api.bible", bibleId: "9879dbb7cfe39e4d-04" } },
  { abbreviation: "KJV", name: "King James Version", language: "en", source: { provider: "api.bible", bibleId: "de4e12af7f28f599-02" } },
];

export function getVersionByAbbreviation(abbreviation: string): BibleVersion | undefined {
  return BIBLE_VERSIONS.find((version) => version.abbreviation === abbreviation);
}

export function getDefaultVersion(language: Language): BibleVersion {
  const defaultVersion = BIBLE_VERSIONS.find((version) => version.language === language && version.isDefault);
  if (!defaultVersion) {
    throw new Error(`Nenhuma versão padrão configurada para o idioma "${language}".`);
  }
  return defaultVersion;
}

export function getVersionsByLanguage(language: Language): BibleVersion[] {
  return BIBLE_VERSIONS.filter((version) => version.language === language);
}
