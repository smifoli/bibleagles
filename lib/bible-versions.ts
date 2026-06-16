import type { Language } from "@/types/database";

export interface BibleVersion {
  abbreviation: string;
  name: string;
  language: Language;
  isDefault?: boolean;
  /**
   * ID interno da versão na API.Bible (GET /v1/bibles).
   * Preencher executando `npm run bible:list-versions` após configurar BIBLE_API_KEY.
   */
  bibleId: string | null;
}

/**
 * NVI, ARA, ACF, ESV, RVR1960, NVI-ES, DHH, LUT (2017) e SCH2000 não existem no catálogo
 * da API.Bible — são traduções comerciais nunca licenciadas para a plataforma. A lista abaixo
 * usa as versões reais disponíveis (confirmado via `npm run bible:list-versions`).
 */
export const BIBLE_VERSIONS: BibleVersion[] = [
  { abbreviation: "NVT", name: "Nova Versão Transformadora", language: "pt", isDefault: true, bibleId: "41a6caa722a21d88-01" },
  { abbreviation: "BLT", name: "Bíblia Livre Para Todos", language: "pt", bibleId: "d63894c8d9a7a503-01" },
  { abbreviation: "TfTP", name: "Translation for Translators (PT-BR)", language: "pt", bibleId: "90799bb5b996fddc-01" },
  { abbreviation: "NIV", name: "New International Version", language: "en", isDefault: true, bibleId: "78a9f6124f344018-01" },
  { abbreviation: "KJV", name: "King James Version", language: "en", bibleId: "de4e12af7f28f599-02" },
  { abbreviation: "WEB", name: "World English Bible", language: "en", bibleId: "9879dbb7cfe39e4d-04" },
  { abbreviation: "RVR09", name: "Reina-Valera 1909", language: "es", isDefault: true, bibleId: "592420522e16049f-01" },
  { abbreviation: "BES", name: "La Biblia en Español Sencillo", language: "es", bibleId: "b32b9d1b64b4ef29-01" },
  { abbreviation: "VBL", name: "Versión Biblia Libre", language: "es", bibleId: "482ddd53705278cc-02" },
  { abbreviation: "L1912", name: "Lutherbibel 1912", language: "de", isDefault: true, bibleId: "926aa5efbc5e04e2-01" },
  { abbreviation: "ELO", name: "Darby Unrevidierte Elberfelder", language: "de", bibleId: "95410db44ef800c1-01" },
  { abbreviation: "TKW", name: "Textbibel von Kautzsch und Weizsäcker", language: "de", bibleId: "542b32484b6e38c2-01" },
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
