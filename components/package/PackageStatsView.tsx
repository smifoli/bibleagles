import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { PackageDayList } from "@/components/package/PackageDayList";
import { toDateOnlyString } from "@/lib/format";
import type { PackageStats } from "@/lib/package-stats-data";

function progressRemainingLabel(totalDays: number, daysRemaining: number): string {
  if (totalDays === 0) return "Nenhum dia configurado";
  if (daysRemaining === 0) return "Pacote concluído";
  return `~${daysRemaining} ${daysRemaining === 1 ? "dia restante" : "dias restantes"}`;
}

export function PackageStatsView({ stats, canEdit, currentUserId }: { stats: PackageStats; canEdit: boolean; currentUserId: string }) {
  const today = toDateOnlyString();
  // O dia de hoje sempre aparece destacado no topo, mesmo já lido — senão, ao marcar
  // como lido, ele "sumiria" pra dentro de "Dias lidos" e ficaria fácil perder de vista
  // qual é a leitura do dia enquanto ainda é hoje.
  const todayDay = stats.days.find((day) => day.date === today);
  // Duas pilhas em vez de uma lista cronológica só: o que falta ler (ordenado por
  // data, inclui dias futuros — é a fila do que vem a seguir) embaixo do que já
  // foi lido (onde dá pra ver quem da família já leu cada dia). O dia de hoje não
  // entra em nenhuma das duas — já tem a seção própria acima.
  const unreadDays = stats.days.filter((day) => !day.isReadByMe && day.date !== today);
  const readDays = stats.days.filter((day) => day.isReadByMe && day.date !== today);

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

      {todayDay && (
        <div className="flex flex-col gap-3">
          <div className="text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">Hoje</div>
          <PackageDayList days={[todayDay]} members={stats.members} currentUserId={currentUserId} today={today} />
        </div>
      )}

      {unreadDays.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">
            Próximos no pacote ({unreadDays.length})
          </div>
          <PackageDayList days={unreadDays} members={stats.members} currentUserId={currentUserId} today={today} highlightOverdue />
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
                    <Avatar name={member.name} avatarUrl={member.avatarUrl} colorIndex={index} size="sm" />
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

      {readDays.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">
            Dias lidos ({readDays.length})
          </div>
          <PackageDayList days={readDays} members={stats.members} currentUserId={currentUserId} today={today} />
        </div>
      )}

      {stats.days.length === 0 && <p className="text-[calc(14px*var(--font-scale))] text-text-muted">Nenhum dia configurado neste pacote.</p>}
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
