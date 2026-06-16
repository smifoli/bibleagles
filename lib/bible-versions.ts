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

export const BIBLE_VERSIONS: BibleVersion[] = [
  { abbreviation: "NVI", name: "Nova Versão Internacional", language: "pt", isDefault: true, bibleId: null },
  { abbreviation: "ARA", name: "Almeida Revista e Atualizada", language: "pt", bibleId: null },
  { abbreviation: "ACF", name: "Almeida Corrigida Fiel", language: "pt", bibleId: null },
  { abbreviation: "NVT", name: "Nova Versão Transformadora", language: "pt", bibleId: null },
  { abbreviation: "NIV", name: "New International Version", language: "en", isDefault: true, bibleId: null },
  { abbreviation: "KJV", name: "King James Version", language: "en", bibleId: null },
  { abbreviation: "ESV", name: "English Standard Version", language: "en", bibleId: null },
  { abbreviation: "RVR1960", name: "Reina-Valera 1960", language: "es", isDefault: true, bibleId: null },
  { abbreviation: "NVI-ES", name: "Nueva Versión Internacional", language: "es", bibleId: null },
  { abbreviation: "DHH", name: "Dios Habla Hoy", language: "es", bibleId: null },
  { abbreviation: "LUT", name: "Lutherbibel 2017", language: "de", isDefault: true, bibleId: null },
  { abbreviation: "SCH2000", name: "Schlachter 2000", language: "de", bibleId: null },
  { abbreviation: "ELB", name: "Elberfelder Bibel", language: "de", bibleId: null },
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
