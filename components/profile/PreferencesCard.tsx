"use client";

import { type ReactNode, useState, useTransition } from "react";
import type { BibleVersion } from "@/lib/bible-versions";
import { FONT_SIZE_LABELS, FONT_SIZE_ORDER } from "@/lib/font-size";
import { updateFontSize, updatePreferences } from "@/lib/profile-actions";
import type { FontSizePreference, Language } from "@/types/database";

const LANGUAGE_LABELS: Record<Language, string> = {
  pt: "Português",
  en: "English",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
};

interface PreferencesCardProps {
  version: string;
  language: Language;
  versions: BibleVersion[];
  languages: Language[];
  fontSize: FontSizePreference;
}

export function PreferencesCard({ version, language, versions, languages, fontSize }: PreferencesCardProps) {
  const [currentVersion, setCurrentVersion] = useState(version);
  const [currentLanguage, setCurrentLanguage] = useState(language);
  const [currentFontSize, setCurrentFontSize] = useState(fontSize);
  const [, startTransition] = useTransition();

  function handleFontSizeChange(next: FontSizePreference) {
    setCurrentFontSize(next);
    startTransition(async () => {
      await updateFontSize(next);
      // O <html> raiz (zoom aplicado em app/layout.tsx) só é renderizado na
      // carga inicial do documento — navegação client-side do Next.js nunca
      // re-executa o layout raiz, só o conteúdo abaixo dele. Sem um reload
      // completo, o cookie novo fica salvo mas o zoom não muda na tela.
      window.location.reload();
    });
  }

  const versionsForLanguage = versions.filter((item) => item.language === currentLanguage);
  const safeVersion = versionsForLanguage.some((item) => item.abbreviation === currentVersion)
    ? currentVersion
    : versionsForLanguage[0]?.abbreviation ?? currentVersion;

  function save(nextVersion: string, nextLanguage: Language) {
    startTransition(async () => {
      await updatePreferences(nextVersion, nextLanguage);
    });
  }

  function handleVersionChange(next: string) {
    setCurrentVersion(next);
    save(next, currentLanguage);
  }

  function handleLanguageChange(next: Language) {
    const options = versions.filter((item) => item.language === next);
    const nextVersion = options.find((item) => item.isDefault)?.abbreviation ?? options[0]?.abbreviation ?? currentVersion;
    setCurrentLanguage(next);
    setCurrentVersion(nextVersion);
    save(nextVersion, next);
  }

  return (
    <div className="flex flex-col rounded-[18px] border border-border bg-surface px-4">
      <Row label="Versão padrão">
        <select
          value={safeVersion}
          onChange={(event) => handleVersionChange(event.target.value)}
          className="rounded-[10px] border border-border bg-surface px-3 py-1.5 text-xs text-ink"
        >
          {versionsForLanguage.map((item) => (
            <option key={item.abbreviation} value={item.abbreviation}>
              {item.abbreviation}
            </option>
          ))}
        </select>
      </Row>
      <div className="h-px bg-border" />
      <Row label="Idioma">
        <select
          value={currentLanguage}
          onChange={(event) => handleLanguageChange(event.target.value as Language)}
          className="rounded-[10px] border border-border bg-surface px-3 py-1.5 text-xs text-ink"
        >
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {LANGUAGE_LABELS[lang]}
            </option>
          ))}
        </select>
      </Row>
      <div className="h-px bg-border" />
      <Row label="Tamanho da letra">
        <div className="flex gap-1.5">
          {FONT_SIZE_ORDER.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => handleFontSizeChange(size)}
              className={
                currentFontSize === size
                  ? "rounded-[10px] bg-ink px-2.5 py-1.5 text-xs font-semibold text-background"
                  : "rounded-[10px] border border-border bg-surface px-2.5 py-1.5 text-xs text-ink"
              }
            >
              {FONT_SIZE_LABELS[size]}
            </button>
          ))}
        </div>
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[13px] text-[#2c2218]">{label}</span>
      {children}
    </div>
  );
}
