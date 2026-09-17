import Link from "next/link";
import type { TodayTask } from "@/lib/home-data";

interface TodayReadingCardProps {
  tasks: TodayTask[];
}

function readHref(task: TodayTask): string {
  if (!task.firstPassage) return `/package/${task.packageId}`;
  return `/read/${task.firstPassage.book}/${task.firstPassage.chapter_start}?planDay=${task.planDayId}&from=${encodeURIComponent("/")}`;
}

// Unidade da checklist é o capítulo pendente, não o plano — "X de Y lidos" responde
// de cara "já terminei hoje?" mesmo com vários pacotes ativos ao mesmo tempo. Quem
// já leu colapsa numa linha riscada (tick verde) em vez de ocupar o espaço de um
// card inteiro, que é o que fazia o segundo plano de sempre parecer secundário.
export function TodayReadingCard({ tasks }: TodayReadingCardProps) {
  const doneCount = tasks.filter((task) => task.done).length;
  const pendingTasks = tasks.filter((task) => !task.done);
  const sortedTasks = [...pendingTasks, ...tasks.filter((task) => task.done)];
  const nextTask = pendingTasks[0];

  return (
    <div className="flex flex-col gap-4 rounded-[20px] bg-card-dark p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="mb-1 text-[calc(9px*var(--font-scale))] font-semibold uppercase tracking-[1.5px] text-[#a08e78]">
            Sua leitura de hoje
          </div>
          <div className="text-[calc(17px*var(--font-scale))] font-semibold text-[#f7f1e6]">
            {doneCount} de {tasks.length} {tasks.length === 1 ? "capítulo lido" : "capítulos lidos"}
          </div>
        </div>
        {pendingTasks.length > 0 && (
          <span className="shrink-0 whitespace-nowrap rounded-full border border-[#4a3d2c] px-2.5 py-1 text-[calc(10px*var(--font-scale))] tracking-wide text-[#cdbb9e]">
            {pendingTasks.length} {pendingTasks.length === 1 ? "pendente" : "pendentes"}
          </span>
        )}
      </div>

      <div className="flex flex-col">
        {sortedTasks.map((task, index) => (
          <Link
            key={task.packageId}
            href={readHref(task)}
            className={`flex items-center gap-3 py-2.5 transition-transform active:scale-[0.98] ${index > 0 ? "border-t border-[#43382a]" : ""}`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                task.done ? "bg-[#8fa876] text-[#23301c]" : "border-[1.5px] border-[#6a5a45]"
              }`}
            >
              {task.done && "✓"}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block truncate text-[calc(14px*var(--font-scale))] font-semibold ${
                  task.done ? "text-[#a08e78] line-through decoration-[#5c4c38]" : "text-[#f7f1e6]"
                }`}
              >
                {task.chapterTitle}
              </span>
              <span className="mt-0.5 block truncate text-[calc(11px*var(--font-scale))] text-[#a08e78]">
                {task.packageTitle} · dia {task.dayNumber} de {task.totalDays}
                {!task.done && task.pendingCount > 1 && ` · +${task.pendingCount - 1} atrasado${task.pendingCount - 1 === 1 ? "" : "s"}`}
              </span>
            </span>
            <span aria-hidden className="shrink-0 text-[13px] text-[#a08e78]">
              ›
            </span>
          </Link>
        ))}
      </div>

      {nextTask ? (
        <Link
          href={readHref(nextTask)}
          className="self-end rounded-full bg-[#f3ebdc] px-[18px] py-2.5 text-[calc(12px*var(--font-scale))] font-semibold text-card-dark transition-transform active:scale-[0.96]"
        >
          Continuar em {nextTask.chapterTitle}
        </Link>
      ) : (
        <div className="text-[calc(11px*var(--font-scale))] font-semibold text-[#9fb389]">Você está em dia com todos os planos</div>
      )}
    </div>
  );
}
