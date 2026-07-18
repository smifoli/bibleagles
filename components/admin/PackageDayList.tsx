"use client";

import { PackagePassageFields } from "@/components/admin/PackagePassageFields";
import type { Passage } from "@/types/database";

export interface EditableDay {
  key: string;
  date: string;
  title: string;
  passages: Passage[];
}

function blankPassage(): Passage {
  return { book: "GEN", chapter_start: 1, verse_start: null, chapter_end: null, verse_end: null };
}

export function newEditableDay(overrides: Partial<EditableDay> = {}): EditableDay {
  return {
    key: crypto.randomUUID(),
    date: "",
    title: "",
    passages: [blankPassage()],
    ...overrides,
  };
}

interface PackageDayListProps {
  days: EditableDay[];
  onChange: (days: EditableDay[]) => void;
}

export function PackageDayList({ days, onChange }: PackageDayListProps) {
  function updateDay(index: number, patch: Partial<EditableDay>) {
    onChange(days.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  }

  function removeDay(index: number) {
    onChange(days.filter((_, i) => i !== index));
  }

  function moveDay(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= days.length) return;
    const next = [...days];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addDay() {
    onChange([...days, newEditableDay()]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[2px] text-text-muted">
          Dias do pacote ({days.length})
        </span>
        <button type="button" onClick={addDay} className="text-[11px] font-semibold text-ink">
          + Adicionar dia
        </button>
      </div>

      {days.length === 0 && (
        <p className="rounded-[14px] border border-border bg-surface px-4 py-6 text-center text-xs text-text-muted">
          Nenhum dia ainda. Gere automaticamente acima ou adicione um dia manual.
        </p>
      )}

      {days.map((day, index) => (
        <div key={day.key} className="flex flex-col gap-2.5 rounded-[14px] border border-border bg-surface p-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={day.date}
              onChange={(event) => updateDay(index, { date: event.target.value })}
              className="rounded-[8px] border border-input-border bg-background px-2 py-1.5 text-xs text-ink"
            />
            <input
              value={day.title}
              onChange={(event) => updateDay(index, { title: event.target.value })}
              placeholder="Título do dia"
              className="flex-1 rounded-[8px] border border-input-border bg-background px-2 py-1.5 text-xs text-ink"
            />
          </div>

          {day.passages.map((passage, passageIndex) => (
            <PackagePassageFields
              key={passageIndex}
              passage={passage}
              onChange={(next) =>
                updateDay(index, { passages: day.passages.map((p, i) => (i === passageIndex ? next : p)) })
              }
              onRemove={day.passages.length > 1 ? () => updateDay(index, { passages: day.passages.filter((_, i) => i !== passageIndex) }) : null}
            />
          ))}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => updateDay(index, { passages: [...day.passages, blankPassage()] })}
              className="text-[11px] font-semibold text-text-muted"
            >
              + Adicionar passagem
            </button>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => moveDay(index, -1)} disabled={index === 0} className="text-[11px] font-semibold text-text-muted disabled:opacity-30">
                ↑
              </button>
              <button type="button" onClick={() => moveDay(index, 1)} disabled={index === days.length - 1} className="text-[11px] font-semibold text-text-muted disabled:opacity-30">
                ↓
              </button>
              <button type="button" onClick={() => removeDay(index)} className="text-[11px] font-semibold text-error">
                Remover dia
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
