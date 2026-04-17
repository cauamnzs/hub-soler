"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface RegisterActionState {
  error?: string;
  success?: boolean;
}

function normalizeRedirectPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/login")) return "/";
  return value;
}

export async function registerAction(
  _prevState: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const inviteCode = String(formData.get("inviteCode") ?? "").trim().toUpperCase();
  const redirectTo = normalizeRedirectPath(formData.get("redirectTo"));

  // ---- 1. Validation ----
  if (!fullName || fullName.length < 3) {
    return { error: "Nome completo deve ter pelo menos 3 caracteres." };
  }

  if (!email || !email.includes("@")) {
    return { error: "E-mail inválido." };
  }

  if (!password || password.length < 6) {
    return { error: "Senha deve ter pelo menos 6 caracteres." };
  }

  if (!inviteCode) {
    return { error: "Código de convite é obrigatório." };
  }

  const supabase = await createClient();

  // ---- 2. Verify invite code ----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invite, error: inviteError } = await (supabase.from("invite_codes") as any)
    .select("id, code, used, used_by, expires_at")
    .eq("code", inviteCode)
    .single();

  if (inviteError || !invite) {
    return { error: "Código de convite inválido." };
  }

  if (invite.used) {
    return { error: "Este código de convite já foi utilizado." };
  }

  // Check expiration
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { error: "Este código de convite expirou." };
  }

  // ---- 3. Create user in Supabase Auth ----
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (authError) {
    if (authError.message.includes("already registered")) {
      return { error: "Este e-mail já está registrado." };
    }
    return { error: `Erro ao criar conta: ${authError.message}` };
  }

  if (!authData.user) {
    return { error: "Erro inesperado ao criar usuário." };
  }

  const userId = authData.user.id;

  // ---- 4. Mark invite code as used ----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from("invite_codes") as any)
    .update({
      used: true,
      used_by: userId,
      used_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  if (updateError) {
    console.error("[register] Failed to mark invite as used:", updateError);
    // Don't fail registration, but log the error
  }

  // ---- 5. Profile is auto-created by trigger, but ensure it has the correct name ----
  // The trigger handle_new_user should have created the profile
  // Let's update it with the full name from the form
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: profileError } = await (supabase.from("profiles") as any)
    .update({
      full_name: fullName,
    })
    .eq("id", userId);

  if (profileError) {
    console.error("[register] Failed to update profile:", profileError);
  }

  return { success: true };
}
