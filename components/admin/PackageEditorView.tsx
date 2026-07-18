"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PackageDayList, type EditableDay } from "@/components/admin/PackageDayList";
import { generateAutoPlanDays } from "@/lib/package-generator";
import { createPackage, updatePackage } from "@/lib/package-admin-actions";
import { BOOK_ORDER, getBookMeta } from "@/lib/bible-books";
import { toDateOnlyString } from "@/lib/format";
import type { EditablePackage } from "@/lib/package-admin-data";
import type { PackageStatus } from "@/types/database";

type PackageType = "auto" | "manual";

interface PackageEditorViewProps {
  mode: "new" | "edit";
  packageId?: string;
  initial?: EditablePackage;
  bookChapterCounts: Record<string, number>;
}

function toEditableDays(days: EditablePackage["days"] | undefined): EditableDay[] {
  return (days ?? []).map((day) => ({ key: crypto.randomUUID(), date: day.date, title: day.title, passages: day.passages }));
}

export function PackageEditorView({ mode, packageId, initial, bookChapterCounts }: PackageEditorViewProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [days, setDays] = useState<EditableDay[]>(() => toEditableDays(initial?.days));
  const [type, setType] = useState<PackageType>("auto");

  const [autoBook, setAutoBook] = useState(BOOK_ORDER[0]);
  const [autoChapterStart, setAutoChapterStart] = useState(1);
  const [autoChapterEnd, setAutoChapterEnd] = useState(bookChapterCounts[BOOK_ORDER[0]] ?? 1);
  const [autoPace, setAutoPace] = useState(1);
  const [autoStartDate, setAutoStartDate] = useState(toDateOnlyString());

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleGenerate() {
    const bookName = getBookMeta(autoBook)?.name ?? autoBook;
    const generated = generateAutoPlanDays(autoBook, bookName, autoChapterStart, autoChapterEnd, Math.max(1, autoPace), autoStartDate);
    setDays(generated.map((day) => ({ key: crypto.randomUUID(), ...day })));
  }

  function handleSave(status: PackageStatus) {
    setError(undefined);
    const input = {
      title,
      description,
      status,
      days: days.map(({ date, title: dayTitle, passages }) => ({ date, title: dayTitle, passages })),
    };

    startTransition(async () => {
      const result =
        mode === "edit" && packageId ? await updatePackage(packageId, input) : await createPackage(input);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link href="/admin" aria-label="Voltar" className="text-lg text-text-muted">
          ←
        </Link>
        <h1 className="text-[17px] font-semibold text-text-primary">
          {mode === "edit" ? "Editar pacote" : "Novo pacote"}
        </h1>
      </header>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text-muted">Nome</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-[10px] border border-input-border bg-surface px-3 py-2.5 text-[13px] text-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text-muted">Descrição</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            className="rounded-[10px] border border-input-border bg-surface px-3 py-2.5 text-[13px] text-ink"
          />
        </label>
      </div>

      {mode === "new" && (
        <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-surface p-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("auto")}
              className={
                type === "auto"
                  ? "rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-background"
                  : "rounded-full border border-input-border px-4 py-1.5 text-xs font-semibold text-text-muted"
              }
            >
              Automático
            </button>
            <button
              type="button"
              onClick={() => setType("manual")}
              className={
                type === "manual"
                  ? "rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-background"
                  : "rounded-full border border-input-border px-4 py-1.5 text-xs font-semibold text-text-muted"
              }
            >
              Manual
            </button>
          </div>

          {type === "auto" ? (
            <div className="flex flex-col gap-2.5">
              <label className="flex flex-col gap-1">
                <span className="text-[9px] font-semibold uppercase tracking-[1px] text-text-muted">Livro</span>
                <select
                  value={autoBook}
                  onChange={(event) => {
                    const bookId = event.target.value;
                    setAutoBook(bookId);
                    setAutoChapterStart(1);
                    setAutoChapterEnd(bookChapterCounts[bookId] ?? 1);
                  }}
                  className="rounded-[8px] border border-input-border bg-background px-2 py-1.5 text-xs text-ink"
                >
                  {BOOK_ORDER.map((bookId) => (
                    <option key={bookId} value={bookId}>
                      {getBookMeta(bookId)?.name ?? bookId}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[9px] font-semibold uppercase tracking-[1px] text-text-muted">Cap. início</span>
                  <input
                    type="number"
                    min={1}
                    max={bookChapterCounts[autoBook] ?? 1}
                    value={autoChapterStart}
                    onChange={(event) => setAutoChapterStart(Number(event.target.value) || 1)}
                    className="rounded-[8px] border border-input-border bg-background px-2 py-1.5 text-xs text-ink"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[9px] font-semibold uppercase tracking-[1px] text-text-muted">Cap. fim</span>
                  <input
                    type="number"
                    min={1}
                    max={bookChapterCounts[autoBook] ?? 1}
                    value={autoChapterEnd}
                    onChange={(event) => setAutoChapterEnd(Number(event.target.value) || 1)}
                    className="rounded-[8px] border border-input-border bg-background px-2 py-1.5 text-xs text-ink"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[9px] font-semibold uppercase tracking-[1px] text-text-muted">Cap./dia</span>
                  <input
                    type="number"
                    min={1}
                    value={autoPace}
                    onChange={(event) => setAutoPace(Number(event.target.value) || 1)}
                    className="rounded-[8px] border border-input-border bg-background px-2 py-1.5 text-xs text-ink"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[9px] font-semibold uppercase tracking-[1px] text-text-muted">Data de início</span>
                <input
                  type="date"
                  value={autoStartDate}
                  onChange={(event) => setAutoStartDate(event.target.value)}
                  className="rounded-[8px] border border-input-border bg-background px-2 py-1.5 text-xs text-ink"
                />
              </label>

              <Button type="button" variant="secondary" onClick={handleGenerate}>
                Gerar dias
              </Button>
            </div>
          ) : (
            <p className="text-xs text-text-muted">
              Use "+ Adicionar dia" abaixo pra montar o pacote dia a dia.
            </p>
          )}
        </div>
      )}

      <PackageDayList days={days} onChange={setDays} />

      {error && <p className="text-xs text-error">{error}</p>}

      <div className="flex flex-col gap-2.5">
        <Button type="button" variant="primary" disabled={pending} onClick={() => handleSave("active")}>
          Salvar e ativar
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => handleSave("draft")}>
          Salvar rascunho
        </Button>
      </div>
    </div>
  );
}
