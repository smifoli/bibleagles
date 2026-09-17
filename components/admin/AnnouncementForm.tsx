"use client";

import { useState, useTransition } from "react";
import { sendAnnouncement } from "@/lib/admin-actions";
import type { AdminMember } from "@/lib/admin-data";

const MAX_LENGTH = 300;

// Envia pra todo mundo exceto quem está enviando — não faz sentido o admin
// receber push do próprio aviso. Confirmação em dois passos (mesmo padrão de
// "Remover membro" em MemberRow): sai pra 3-4 aparelhos reais e não tem como
// desfazer depois de enviado.
export function AnnouncementForm({ members, currentUserId }: { members: AdminMember[]; currentUserId: string }) {
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [sentCount, setSentCount] = useState<number>();
  const [isPending, startTransition] = useTransition();

  const recipients = members.filter((member) => member.id !== currentUserId);
  const trimmed = message.trim();

  function handleSend() {
    setError(undefined);
    startTransition(async () => {
      const result = await sendAnnouncement(trimmed);
      if (result.error) {
        setError(result.error);
        setConfirming(false);
      } else {
        setSentCount(result.sentCount);
        setMessage("");
        setConfirming(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">Avisos</div>
      <div className="flex flex-col gap-3 rounded-[18px] border border-border bg-surface p-4">
        <p className="text-[calc(12px*var(--font-scale))] leading-[1.5] text-text-secondary">
          Manda uma notificação (push + item em Avisos) pra{" "}
          {recipients.length === 0 ? (
            "ninguém — você é o único membro"
          ) : (
            <>
              <span className="font-semibold text-text-primary">
                {recipients.length} {recipients.length === 1 ? "pessoa" : "pessoas"}
              </span>{" "}
              ({recipients.map((member) => member.name.split(" ")[0]).join(", ")})
            </>
          )}
          .
        </p>

        <label className="flex flex-col gap-1">
          <span className="text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[1.5px] text-text-muted">
            Mensagem
          </span>
          <textarea
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setSentCount(undefined);
              setConfirming(false);
            }}
            maxLength={MAX_LENGTH}
            rows={3}
            placeholder="Ex.: Nova atualização no app — dá uma olhada!"
            className="resize-none rounded-[10px] border border-input-border bg-background px-3 py-2.5 font-sans text-[calc(13px*var(--font-scale))] text-ink focus:outline-none focus:border-ink"
          />
          <span className="self-end text-[calc(10px*var(--font-scale))] text-text-muted">
            {message.length}/{MAX_LENGTH}
          </span>
        </label>

        {error && <p className="text-[calc(12px*var(--font-scale))] text-error">{error}</p>}
        {sentCount !== undefined && (
          <p className="text-[calc(12px*var(--font-scale))] font-semibold text-[#5e7350]">
            Enviado pra {sentCount} {sentCount === 1 ? "pessoa" : "pessoas"}.
          </p>
        )}

        {confirming ? (
          <div className="flex flex-col gap-2 rounded-[12px] border border-border bg-background p-3">
            <p className="text-[calc(12px*var(--font-scale))] text-text-secondary">
              Confirma o envio pra {recipients.length} {recipients.length === 1 ? "pessoa" : "pessoas"}? Não dá pra desfazer
              depois de enviado.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <button
                type="button"
                onClick={handleSend}
                disabled={isPending}
                className="text-[calc(12px*var(--font-scale))] font-semibold text-ink disabled:opacity-60"
              >
                {isPending ? "Enviando…" : "Confirmar envio"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={isPending}
                className="text-[calc(12px*var(--font-scale))] font-semibold text-text-muted disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={!trimmed || recipients.length === 0}
            className="self-start rounded-full bg-ink px-5 py-2.5 text-[calc(12px*var(--font-scale))] font-semibold text-background transition-transform active:scale-[0.97] disabled:opacity-40"
          >
            Enviar aviso
          </button>
        )}
      </div>
    </div>
  );
}
