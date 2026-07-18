"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Passage, PackageStatus } from "@/types/database";

export interface PackageDayInput {
  date: string;
  title: string;
  passages: Passage[];
}

export interface PackageInput {
  title: string;
  description: string;
  status: PackageStatus;
  days: PackageDayInput[];
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "Sessão expirada." } as const;

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { supabase, error: "Apenas administradores podem gerenciar pacotes." } as const;

  return { supabase, user } as const;
}

function validate(input: PackageInput): string | null {
  if (!input.title.trim()) return "Dê um nome ao pacote.";
  if (input.days.length === 0) return "Adicione pelo menos um dia.";
  for (const day of input.days) {
    if (!day.date) return "Todo dia precisa de uma data.";
    if (!day.title.trim()) return "Todo dia precisa de um título.";
    if (day.passages.length === 0) return "Todo dia precisa de pelo menos uma passagem.";
  }
  return null;
}

export async function createPackage(input: PackageInput): Promise<{ error?: string }> {
  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const admin = await requireAdmin();
  if ("error" in admin && admin.error) return { error: admin.error };
  const { supabase, user } = admin as { supabase: Awaited<ReturnType<typeof createClient>>; user: { id: string } };

  const startDate = [...input.days].sort((a, b) => a.date.localeCompare(b.date))[0].date;

  const { data: pkg, error: packageError } = await supabase
    .from("reading_packages")
    .insert({
      title: input.title.trim(),
      description: input.description.trim() || null,
      start_date: startDate,
      status: input.status,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (packageError || !pkg) return { error: "Não foi possível criar o pacote." };

  const { error: daysError } = await supabase.from("reading_plan_days").insert(
    input.days.map((day) => ({ package_id: pkg.id, date: day.date, title: day.title.trim(), passages: day.passages }))
  );

  if (daysError) {
    // Rascunho parcial não é útil pro admin — melhor remover e reportar erro
    // do que deixar um pacote sem nenhum dia configurado.
    await supabase.from("reading_packages").delete().eq("id", pkg.id);
    return { error: "Não foi possível salvar os dias do pacote." };
  }

  revalidatePath("/admin");
  redirect(`/package/${pkg.id}`);
}

export async function updatePackage(packageId: string, input: PackageInput): Promise<{ error?: string }> {
  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const admin = await requireAdmin();
  if ("error" in admin && admin.error) return { error: admin.error };
  const { supabase } = admin as { supabase: Awaited<ReturnType<typeof createClient>>; user: { id: string } };

  const startDate = [...input.days].sort((a, b) => a.date.localeCompare(b.date))[0].date;

  const { error: packageError } = await supabase
    .from("reading_packages")
    .update({ title: input.title.trim(), description: input.description.trim() || null, start_date: startDate, status: input.status })
    .eq("id", packageId);

  if (packageError) return { error: "Não foi possível atualizar o pacote." };

  // Substitui todos os dias em vez de tentar diff — mais simples e seguro dado
  // que só admin chega aqui; observação: isso derruba (cascade) o histórico de
  // reading_progress dos dias removidos/substituídos.
  const { error: deleteError } = await supabase.from("reading_plan_days").delete().eq("package_id", packageId);
  if (deleteError) return { error: "Não foi possível atualizar os dias do pacote." };

  const { error: insertError } = await supabase.from("reading_plan_days").insert(
    input.days.map((day) => ({ package_id: packageId, date: day.date, title: day.title.trim(), passages: day.passages }))
  );
  if (insertError) return { error: "Não foi possível salvar os dias do pacote." };

  revalidatePath("/admin");
  redirect(`/package/${packageId}`);
}
