export type CalendarDayStatus = "read" | "today" | "missed" | "empty";

export interface CalendarDay {
  day: number;
  status: CalendarDayStatus;
}

export interface CalendarGridProps {
  weekdayLabels: string[];
  leadingBlanks: number;
  days: CalendarDay[];
  onSelectDay?: (day: CalendarDay) => void;
}

const STATUS_CLASSES: Record<CalendarDayStatus, string> = {
  read: "bg-ink font-semibold text-[#f5efe4]",
  today: "border-[1.5px] border-[#b3a48c] bg-border font-bold text-ink",
  missed: "text-[#c0ad94]",
  empty: "text-[#c0ad94]",
};

// Versão genérica/apresentacional de components/profile/ReadingCalendar.tsx — recebe os dias já
// resolvidos via props, sem depender de lib/profile-data.
export function CalendarGrid({ weekdayLabels, leadingBlanks, days, onSelectDay }: CalendarGridProps) {
  return (
    <div className="grid grid-cols-7 gap-[5px]">
      {weekdayLabels.map((label, index) => (
        <span key={index} className="text-center text-[calc(10px*var(--font-scale))] font-semibold text-[#a3927d]">
          {label}
        </span>
      ))}
      {Array.from({ length: leadingBlanks }).map((_, index) => (
        <span key={`blank-${index}`} />
      ))}
      {days.map((entry) => {
        const dayClasses = `mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[calc(11px*var(--font-scale))] ${STATUS_CLASSES[entry.status]}`;

        if (onSelectDay) {
          return (
            <button key={entry.day} type="button" onClick={() => onSelectDay(entry)} className={dayClasses}>
              {entry.day}
            </button>
          );
        }

        return (
          <span key={entry.day} className={dayClasses}>
            {entry.day}
          </span>
        );
      })}
    </div>
  );
}
