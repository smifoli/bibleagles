import type { ReadingCalendarData } from "@/lib/profile-data";

export function ReadingCalendar({ calendar }: { calendar: ReadingCalendarData }) {
  return (
    <div className="flex flex-col gap-3.5 rounded-[18px] border border-border bg-surface p-4">
      <div className="grid grid-cols-7 gap-[5px]">
        {calendar.weekdayLabels.map((label, index) => (
          <span key={index} className="text-center text-[calc(10px*var(--font-scale))] font-semibold text-[#a3927d]">
            {label}
          </span>
        ))}
        {Array.from({ length: calendar.leadingBlanks }).map((_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {calendar.days.map((entry) => (
          <span
            key={entry.day}
            className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[calc(11px*var(--font-scale))] ${
              entry.status === "read"
                ? "bg-ink font-semibold text-[#f5efe4]"
                : entry.status === "today"
                  ? "border-[1.5px] border-[#b3a48c] bg-border font-bold text-ink"
                  : "text-[#c0ad94]"
            }`}
          >
            {entry.day}
          </span>
        ))}
      </div>
      <p className="text-center text-[calc(12px*var(--font-scale))] text-text-muted">
        {calendar.readCount} {calendar.readCount === 1 ? "dia lido" : "dias lidos"} em {calendar.monthNameLower}
      </p>
    </div>
  );
}
