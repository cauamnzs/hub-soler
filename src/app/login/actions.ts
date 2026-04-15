"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface LoginActionState {
  error?: string;
}

function normalizeRedirectPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/login")) return "/";
  return value;
}

function mapSupabaseSignInError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return "E-mail ou senha inválidos.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Confirme seu e-mail antes de entrar.";
  }
  return "Não foi possível autenticar no momento. Tente novamente.";
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = normalizeRedirectPath(formData.get("redirectTo"));

  if (!email || !password) {
    return { error: "Preencha e-mail e senha." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: mapSupabaseSignInError(error.message) };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (/invalid login credentials/i.test(message)) {
      return { error: "E-mail ou senha inválidos." };
    }
    return {
      error: "Falha de autenticação. Verifique sua conexão e tente novamente.",
    };
  }

  redirect(redirectTo);
}

export async function logoutAction() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Even if sign-out fails, force redirect to login for safety.
  }

  redirect("/login");
}
