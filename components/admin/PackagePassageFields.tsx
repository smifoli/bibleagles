"use client";

import { BOOK_ORDER, getBookMeta } from "@/lib/bible-books";
import type { Passage } from "@/types/database";

interface PackagePassageFieldsProps {
  passage: Passage;
  onChange: (next: Passage) => void;
  onRemove: (() => void) | null;
}

function toNullableInt(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function PackagePassageFields({ passage, onChange, onRemove }: PackagePassageFieldsProps) {
  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-input-border bg-background p-2.5">
      <div className="flex items-center gap-2">
        <select
          value={passage.book}
          onChange={(event) => onChange({ ...passage, book: event.target.value })}
          className="flex-1 rounded-[8px] border border-input-border bg-surface px-2 py-1.5 text-xs text-ink"
        >
          {BOOK_ORDER.map((bookId) => (
            <option key={bookId} value={bookId}>
              {getBookMeta(bookId)?.name ?? bookId}
            </option>
          ))}
        </select>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-[11px] font-semibold text-text-muted">
            Remover
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <NumberField
          label="Cap. início"
          value={passage.chapter_start}
          onChange={(value) => onChange({ ...passage, chapter_start: value ?? 1 })}
          required
        />
        <NumberField
          label="Vers. início"
          value={passage.verse_start}
          onChange={(value) => onChange({ ...passage, verse_start: value })}
        />
        <NumberField
          label="Cap. fim"
          value={passage.chapter_end}
          onChange={(value) => onChange({ ...passage, chapter_end: value })}
        />
        <NumberField
          label="Vers. fim"
          value={passage.verse_end}
          onChange={(value) => onChange({ ...passage, verse_end: value })}
        />
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[8px] font-semibold uppercase tracking-[1px] text-text-muted">{label}</span>
      <input
        type="number"
        min={1}
        required={required}
        value={value ?? ""}
        onChange={(event) => onChange(toNullableInt(event.target.value))}
        className="rounded-[8px] border border-input-border bg-surface px-1.5 py-1 text-xs text-ink"
      />
    </label>
  );
}
