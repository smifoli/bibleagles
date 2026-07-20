"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { updateAvatarUrl, updateProfileName } from "@/lib/profile-actions";
import { createClient } from "@/lib/supabase/client";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function ProfileHeader({
  userId,
  name,
  email,
  avatarUrl,
}: {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  function handleSave() {
    setError(undefined);
    startTransition(async () => {
      const result = await updateProfileName(value);
      if (result.error) setError(result.error);
      else setEditing(false);
    });
  }

  function handleCancel() {
    setValue(name);
    setError(undefined);
    setEditing(false);
  }

  async function handleAvatarFileSelected(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Escolha uma imagem.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("A imagem precisa ter até 5MB.");
      return;
    }

    setError(undefined);
    setUploading(true);

    const supabase = createClient();
    const extension = file.type.split("/")[1] || "jpg";
    const path = `${userId}/avatar.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setError("Não foi possível enviar a foto.");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    // Caminho é fixo por usuário — sem cache-bust, o navegador/CDN seguraria a foto antiga.
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

    const result = await updateAvatarUrl(publicUrl);
    setUploading(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  function handleRemoveAvatar() {
    setError(undefined);
    startTransition(async () => {
      const result = await updateAvatarUrl(null);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-center gap-2.5 py-1 pb-2">
      <div className="relative">
        <Avatar name={name} avatarUrl={avatarUrl} size="lg" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Trocar foto de perfil"
          className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-ink text-[calc(11px*var(--font-scale))] text-background disabled:opacity-60"
        >
          {uploading ? "…" : "📷"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleAvatarFileSelected(file);
          }}
        />
      </div>

      {avatarUrl && !editing && (
        <button
          type="button"
          onClick={handleRemoveAvatar}
          disabled={isPending}
          className="text-[calc(11px*var(--font-scale))] font-semibold text-text-muted disabled:opacity-60"
        >
          Remover foto
        </button>
      )}

      {editing ? (
        <div className="flex w-full max-w-[240px] flex-col items-center gap-2">
          <input
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-full rounded-[10px] border border-input-border bg-background px-3 py-2 text-center text-[calc(13px*var(--font-scale))] text-ink focus:border-ink focus:outline-none"
          />
          {error && <p className="text-[calc(12px*var(--font-scale))] text-error">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-full bg-ink px-4 py-1.5 text-[calc(12px*var(--font-scale))] font-semibold text-background disabled:opacity-60"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-full border border-input-border px-4 py-1.5 text-[calc(12px*var(--font-scale))] font-semibold text-text-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-center">
            <div className="text-[calc(18px*var(--font-scale))] font-semibold text-text-primary">{name}</div>
            <div className="mt-0.5 text-[calc(12px*var(--font-scale))] text-text-muted">{email}</div>
          </div>
          {error && <p className="text-[calc(12px*var(--font-scale))] text-error">{error}</p>}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full border border-input-border px-[18px] py-2 text-[calc(12px*var(--font-scale))] font-semibold text-text-secondary"
          >
            Editar perfil
          </button>
        </>
      )}
    </div>
  );
}
