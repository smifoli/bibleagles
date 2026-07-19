import Link from "next/link";
import { toDateOnlyString } from "@/lib/format";
import type { PackageStats } from "@/lib/package-stats-data";

const AVATAR_COLORS: { bg: string; text: string }[] = [
  { bg: "#b5723e", text: "#ffffff" },
  { bg: "#c98a52", text: "#ffffff" },
  { bg: "#3d3225", text: "#a08e78" },
  { bg: "#7d6c58", text: "#ffffff" },
];

function progressRemainingLabel(totalDays: number, daysRemaining: number): string {
  if (totalDays === 0) return "Nenhum dia configurado";
  if (daysRemaining === 0) return "Pacote concluído";
  return `~${daysRemaining} ${daysRemaining === 1 ? "dia restante" : "dias restantes"}`;
}

export function PackageStatsView({ stats, canEdit }: { stats: PackageStats; canEdit: boolean }) {
  const today = toDateOnlyString();
  // Só dias já vencidos (passado ou hoje) e não lidos contam como pendentes —
  // dias futuros do plano não entram na lista, mesmo sem leitura ainda.
  const pendingDays = stats.days.filter((day) => !day.isReadByMe && day.readHref && day.date <= today);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Voltar" className="text-[calc(18px*var(--font-scale))] text-text-muted">
            ←
          </Link>
          <div>
            <div className="text-[calc(17px*var(--font-scale))] font-semibold text-text-primary">{stats.title}</div>
            <div className="text-[calc(11px*var(--font-scale))] text-text-muted">
              {stats.statusLabel} · iniciou {stats.startDateLabel}
            </div>
          </div>
        </div>
        {canEdit ? (
          <Link
            href={`/admin/package/${stats.id}/edit`}
            className="whitespace-nowrap rounded-full border border-input-border px-3 py-2 text-[calc(12px*var(--font-scale))] font-semibold text-text-secondary"
          >
            Editar
          </Link>
        ) : null}
      </header>

      <div className="flex flex-col gap-4 rounded-2xl bg-card-dark p-[18px]">
        <div className="flex items-baseline justify-between">
          <span className="text-[calc(26px*var(--font-scale))] font-bold text-[#f7f1e6]">Dia {stats.currentDayNumber}</span>
          <span className="text-[calc(13px*var(--font-scale))] text-[#d8c9b3]">de {stats.totalDays}</span>
        </div>
        <div className="h-[5px] rounded-full bg-[#43382a]">
          <div className="h-full rounded-full bg-[#ece0c8]" style={{ width: `${stats.progressPercent}%` }} />
        </div>
        <div className="text-[calc(12px*var(--font-scale))] text-[#a08e78]">{progressRemainingLabel(stats.totalDays, stats.daysRemaining)}</div>
      </div>

      <div className="flex gap-2">
        <StatBox value={stats.totalComments} label="comentários" />
        <StatBox value={stats.totalHighlights} label="destaques" />
        <StatBox value={stats.totalDaysRead} label="dias lidos" />
      </div>

      {pendingDays.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">
            Pendentes ({pendingDays.length})
          </div>
          <div className="flex flex-col gap-2.5">
            {pendingDays.map((day) => {
              const isOverdue = day.date < today;
              return (
                <Link
                  key={day.id}
                  href={day.readHref!}
                  className={`flex items-center justify-between gap-3 rounded-[14px] border p-3.5 ${
                    isOverdue ? "border-[#e6c4be] bg-[rgba(160,58,42,0.05)]" : "border-border bg-surface"
                  }`}
                >
                  <div className="min-w-0">
                    <div className={`truncate text-[calc(13px*var(--font-scale))] font-semibold ${isOverdue ? "text-error" : "text-ink"}`}>
                      {day.title}
                    </div>
                    <div className={`mt-0.5 text-[calc(11px*var(--font-scale))] ${isOverdue ? "text-error/80" : "text-text-muted"}`}>
                      {day.dateLabel}
                      {day.passageLabel ? ` · ${day.passageLabel}` : ""}
                      {isOverdue ? " · atrasado" : ""}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[calc(11px*var(--font-scale))] font-semibold ${
                      isOverdue ? "bg-error text-background" : "bg-ink text-background"
                    }`}
                  >
                    Ler →
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">Progresso da família</div>
        <div className="flex flex-col gap-3.5 rounded-[18px] border border-border bg-surface p-4">
          {stats.members.length === 0 ? (
            <p className="text-[calc(14px*var(--font-scale))] text-text-muted">Nenhum membro na família ainda.</p>
          ) : (
            stats.members.map((member, index) => (
              <div key={member.id}>
                {index > 0 ? <div className="mb-3.5 h-px bg-border" /> : null}
                <div className="flex flex-col gap-[5px]">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[calc(10px*var(--font-scale))] font-semibold"
                      style={{
                        backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length].bg,
                        color: AVATAR_COLORS[index % AVATAR_COLORS.length].text,
                      }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-[calc(13px*var(--font-scale))] font-semibold text-ink">{member.name}</span>
                    <span className={`text-[calc(12px*var(--font-scale))] ${member.isFullyCompleted ? "font-semibold text-ink" : "text-text-muted"}`}>
                      {member.completedDays} / {stats.totalDays}
                    </span>
                  </div>
                  <div className="h-[5px] rounded-full bg-[#e8dcc6]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${member.percent}%`,
                        backgroundColor: member.isFullyCompleted ? "#2c2218" : "#b3a48c",
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3.5 rounded-[18px] border border-border bg-surface p-4">
        <div className="text-[calc(13px*var(--font-scale))] text-text-secondary">
          Mais ativo:{" "}
          {stats.mostActiveMember ? (
            <span className="font-semibold text-ink">{stats.mostActiveMember.name}</span>
          ) : (
            <span className="text-text-muted">ninguém ainda</span>
          )}
        </div>
        <div className="h-px bg-border" />
        <div className="text-[calc(13px*var(--font-scale))] text-text-secondary">
          Versículo mais comentado:{" "}
          {stats.mostCommentedVerse ? (
            <>
              <span className="font-semibold text-ink">{stats.mostCommentedVerse.reference}</span>{" "}
              <span className="text-text-muted">
                ({stats.mostCommentedVerse.count} {stats.mostCommentedVerse.count === 1 ? "coment." : "coments."})
              </span>
            </>
          ) : (
            <span className="text-text-muted">nenhum ainda</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">Dias do pacote</div>
        <div className="flex flex-col gap-3.5 rounded-[18px] border border-border bg-surface p-4">
          {stats.days.length === 0 ? (
            <p className="text-[calc(14px*var(--font-scale))] text-text-muted">Nenhum dia configurado neste pacote.</p>
          ) : (
            stats.days.map((day, index) => {
              const content = (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {day.isReadByMe && <span className="text-[calc(11px*var(--font-scale))] text-ink">✓</span>}
                      <span className="truncate text-[calc(13px*var(--font-scale))] font-semibold text-ink">{day.title}</span>
                    </div>
                    <div className="mt-0.5 text-[calc(11px*var(--font-scale))] text-text-muted">
                      {day.dateLabel}
                      {day.passageLabel ? ` · ${day.passageLabel}` : ""}
                    </div>
                  </div>
                  {stats.members.length > 0 ? (
                    <span className="shrink-0 whitespace-nowrap text-[calc(11px*var(--font-scale))] text-text-muted">
                      {day.readCount} / {stats.members.length} leram
                    </span>
                  ) : null}
                </div>
              );

              return (
                <div key={day.id}>
                  {index > 0 ? <div className="mb-3.5 h-px bg-border" /> : null}
                  {day.readHref ? (
                    <Link href={day.readHref} className="block">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex-1 rounded-[14px] border border-border bg-background px-2.5 py-3 text-center">
      <div className="text-[calc(22px*var(--font-scale))] font-bold text-ink">{value}</div>
      <div className="mt-[3px] text-[calc(10px*var(--font-scale))] tracking-[0.5px] text-text-muted">{label}</div>
    </div>
  );
}
