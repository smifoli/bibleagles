"use client";

import { type ReactNode, useState, useTransition } from "react";
import { LANGUAGE_LABELS, type BibleVersion } from "@/lib/bible-versions";
import { FONT_SIZE_LABELS, FONT_SIZE_ORDER } from "@/lib/font-size";
import { updateFontSize, updatePreferences } from "@/lib/profile-actions";
import type { FontSizePreference, Language } from "@/types/database";

interface PreferencesCardProps {
  version: string;
  language: Language;
  versions: BibleVersion[];
  languages: Language[];
  fontSize: FontSizePreference;
}

export function PreferencesCard({ version, language, versions, languages, fontSize }: PreferencesCardProps) {
  const [currentLanguage, setCurrentLanguage] = useState(language);
  const [currentFontSize, setCurrentFontSize] = useState(fontSize);
  const [, startTransition] = useTransition();

  function handleFontSizeChange(next: FontSizePreference) {
    setCurrentFontSize(next);
    startTransition(async () => {
      await updateFontSize(next);
      // O <html> raiz (onde --font-scale é definida, em app/layout.tsx) só é
      // renderizado na carga inicial do documento — navegação client-side do
      // Next.js nunca re-executa o layout raiz, só o conteúdo abaixo dele.
      // Sem um reload completo, o cookie novo fica salvo mas a letra não muda.
      window.location.reload();
    });
  }

  // Versão padrão não tem mais seletor próprio aqui — o seletor de versão do
  // próprio leitor (ver "version" em ReaderView) já salva a versão atual como
  // novo padrão a cada troca, então essa escolha ficou redundante. Trocar de
  // idioma ainda precisa mandar uma versão junto (preferred_version é campo
  // obrigatório na tabela) — usa a versão padrão desse idioma.
  function handleLanguageChange(next: Language) {
    const options = versions.filter((item) => item.language === next);
    const nextVersion = options.find((item) => item.isDefault)?.abbreviation ?? options[0]?.abbreviation ?? version;
    setCurrentLanguage(next);
    startTransition(async () => {
      await updatePreferences(nextVersion, next);
    });
  }

  return (
    <div className="flex flex-col rounded-[18px] border border-border bg-surface px-4">
      <Row label="Idioma">
        <select
          value={currentLanguage}
          onChange={(event) => handleLanguageChange(event.target.value as Language)}
          className="rounded-[10px] border border-border bg-surface px-3 py-1.5 text-[calc(12px*var(--font-scale))] text-ink"
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
                  ? "rounded-[10px] bg-ink px-2.5 py-1.5 text-[calc(12px*var(--font-scale))] font-semibold text-background"
                  : "rounded-[10px] border border-border bg-surface px-2.5 py-1.5 text-[calc(12px*var(--font-scale))] text-ink"
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
      <span className="text-[calc(13px*var(--font-scale))] text-[#2c2218]">{label}</span>
      {children}
    </div>
  );
}
