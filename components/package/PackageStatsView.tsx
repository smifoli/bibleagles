import Link from "next/link";
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
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Voltar" className="text-lg text-text-muted">
            ←
          </Link>
          <div>
            <div className="text-[17px] font-semibold text-text-primary">{stats.title}</div>
            <div className="text-[11px] text-text-muted">
              {stats.statusLabel} · iniciou {stats.startDateLabel}
            </div>
          </div>
        </div>
        {canEdit ? (
          <Link
            href={`/admin/package/${stats.id}/edit`}
            className="whitespace-nowrap rounded-full border border-input-border px-3 py-2 text-xs font-semibold text-text-secondary"
          >
            Editar
          </Link>
        ) : null}
      </header>

      <div className="flex flex-col gap-4 rounded-2xl bg-card-dark p-[18px]">
        <div className="flex items-baseline justify-between">
          <span className="text-[26px] font-bold text-[#f7f1e6]">Dia {stats.currentDayNumber}</span>
          <span className="text-[13px] text-[#d8c9b3]">de {stats.totalDays}</span>
        </div>
        <div className="h-[5px] rounded-full bg-[#43382a]">
          <div className="h-full rounded-full bg-[#ece0c8]" style={{ width: `${stats.progressPercent}%` }} />
        </div>
        <div className="text-xs text-[#a08e78]">{progressRemainingLabel(stats.totalDays, stats.daysRemaining)}</div>
      </div>

      <div className="flex gap-2">
        <StatBox value={stats.totalComments} label="comentários" />
        <StatBox value={stats.totalHighlights} label="destaques" />
        <StatBox value={stats.totalDaysRead} label="dias lidos" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-[2px] text-text-muted">Progresso da família</div>
        <div className="flex flex-col gap-3.5 rounded-[18px] border border-border bg-surface p-4">
          {stats.members.length === 0 ? (
            <p className="text-sm text-text-muted">Nenhum membro na família ainda.</p>
          ) : (
            stats.members.map((member, index) => (
              <div key={member.id}>
                {index > 0 ? <div className="mb-3.5 h-px bg-border" /> : null}
                <div className="flex flex-col gap-[5px]">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                      style={{
                        backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length].bg,
                        color: AVATAR_COLORS[index % AVATAR_COLORS.length].text,
                      }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-[13px] font-semibold text-ink">{member.name}</span>
                    <span className={`text-xs ${member.isFullyCompleted ? "font-semibold text-ink" : "text-text-muted"}`}>
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
        <div className="text-[13px] text-text-secondary">
          Mais ativo:{" "}
          {stats.mostActiveMember ? (
            <span className="font-semibold text-ink">{stats.mostActiveMember.name}</span>
          ) : (
            <span className="text-text-muted">ninguém ainda</span>
          )}
        </div>
        <div className="h-px bg-border" />
        <div className="text-[13px] text-text-secondary">
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
        <div className="text-[10px] font-semibold uppercase tracking-[2px] text-text-muted">Dias do pacote</div>
        <div className="flex flex-col gap-3.5 rounded-[18px] border border-border bg-surface p-4">
          {stats.days.length === 0 ? (
            <p className="text-sm text-text-muted">Nenhum dia configurado neste pacote.</p>
          ) : (
            stats.days.map((day, index) => (
              <div key={day.id}>
                {index > 0 ? <div className="mb-3.5 h-px bg-border" /> : null}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-ink">{day.title}</div>
                    <div className="mt-0.5 text-[11px] text-text-muted">
                      {day.dateLabel}
                      {day.passageLabel ? ` · ${day.passageLabel}` : ""}
                    </div>
                  </div>
                  {stats.members.length > 0 ? (
                    <span className="whitespace-nowrap text-[11px] text-text-muted">
                      {day.readCount} / {stats.members.length} leram
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex-1 rounded-[14px] border border-border bg-background px-2.5 py-3 text-center">
      <div className="text-[22px] font-bold text-ink">{value}</div>
      <div className="mt-[3px] text-[10px] tracking-[0.5px] text-text-muted">{label}</div>
    </div>
  );
}
