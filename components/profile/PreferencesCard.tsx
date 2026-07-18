"use client";

import { type ReactNode, useState, useTransition } from "react";
import type { BibleVersion } from "@/lib/bible-versions";
import { updatePreferences } from "@/lib/profile-actions";
import type { Language } from "@/types/database";

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
}

export function PreferencesCard({ version, language, versions, languages }: PreferencesCardProps) {
  const [currentVersion, setCurrentVersion] = useState(version);
  const [currentLanguage, setCurrentLanguage] = useState(language);
  const [, startTransition] = useTransition();

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
