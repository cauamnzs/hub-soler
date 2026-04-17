"use client";

import { Suspense, useActionState, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ShieldCheck, UserPlus, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { registerAction, type RegisterActionState } from "./actions";

// ============================================================
// PAGE
// ============================================================

function RegisterForm() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";
  const [actionState, formAction, isPending] = useActionState<
    RegisterActionState,
    FormData
  >(registerAction, {});
  const lastErrorRef = useRef<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const error = actionState?.error;
    if (!error || lastErrorRef.current === error) return;
    lastErrorRef.current = error;

    toast({
      variant: "destructive",
      title: "Falha no cadastro",
      description: error,
    });
  }, [actionState, toast]);

  useEffect(() => {
    if (actionState?.success) {
      toast({
        variant: "success",
        title: "Conta criada!",
        description: "Verifique seu e-mail para confirmar o cadastro.",
      });
    }
  }, [actionState, toast]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">

      {/* ---- Subtle background atmosphere ---- */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* Top-left glow */}
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-violet-600/8 blur-3xl" />
        {/* Bottom-right glow */}
        <div className="absolute -bottom-40 -right-20 h-[500px] w-[500px] rounded-full bg-emerald-600/8 blur-3xl" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--border)) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* ---- Register Card ---- */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">

          {/* Card top accent bar */}
          <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />

          <div className="px-8 pb-8 pt-7">

            {/* ---- Logo ---- */}
            <div className="mb-8 flex flex-col items-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 shadow-lg shadow-emerald-900/40">
                <UserPlus size={26} className="text-white" strokeWidth={1.75} />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Criar Conta</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Soler Shop — Backoffice
              </p>
            </div>

            {/* ---- Form ---- */}
            <form action={formAction} noValidate className="space-y-4">
              <input type="hidden" name="redirectTo" value={redirectTo} />

              {/* Full Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="fullName"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  Nome Completo
                </label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Seu nome completo"
                  name="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isPending || actionState?.success}
                  className={cn(
                    "w-full rounded-xl border bg-muted/50 px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:bg-background disabled:opacity-50",
                    actionState?.error
                      ? "border-destructive/70 focus:border-destructive"
                      : "border-border focus:border-primary/60",
                  )}
                />
              </div>

              {/* E-mail */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@soler.com"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending || actionState?.success}
                  className={cn(
                    "w-full rounded-xl border bg-muted/50 px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:bg-background disabled:opacity-50",
                    actionState?.error
                      ? "border-destructive/70 focus:border-destructive"
                      : "border-border focus:border-primary/60",
                  )}
                />
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending || actionState?.success}
                    className={cn(
                      "w-full rounded-xl border bg-muted/50 py-2.5 pl-3.5 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:bg-background disabled:opacity-50",
                      actionState?.error
                        ? "border-destructive/70 focus:border-destructive"
                        : "border-border focus:border-primary/60",
                    )}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Invite Code */}
              <div className="space-y-1.5">
                <label
                  htmlFor="inviteCode"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  Código de Convite
                </label>
                <input
                  id="inviteCode"
                  type="text"
                  placeholder="XXXX-XXXX"
                  name="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  disabled={isPending || actionState?.success}
                  className={cn(
                    "w-full rounded-xl border bg-muted/50 px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:bg-background disabled:opacity-50 uppercase",
                    actionState?.error
                      ? "border-destructive/70 focus:border-destructive"
                      : "border-border focus:border-primary/60",
                  )}
                />
                <p className="text-[10px] text-muted-foreground/60">
                  O código é necessário para criar uma conta.
                </p>
              </div>

              {/* Error message */}
              {actionState?.error && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs text-destructive">
                  {actionState.error}
                </p>
              )}

              {/* Success message */}
              {actionState?.success && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-center">
                  <p className="text-sm font-medium text-emerald-400">
                    Conta criada com sucesso!
                  </p>
                  <p className="mt-1 text-xs text-emerald-400/80">
                    Verifique seu e-mail para confirmar.
                  </p>
                  <Link
                    href="/login"
                    className="mt-2 inline-block text-xs font-semibold text-emerald-400 hover:underline"
                  >
                    Ir para o login →
                  </Link>
                </div>
              )}

              {/* Submit */}
              {!actionState?.success && (
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    "Criar Conta"
                  )}
                </button>
              )}
            </form>

            {/* ---- Back to login ---- */}
            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={12} />
                Já tem uma conta? Entrar
              </Link>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-4 text-center text-[11px] text-muted-foreground/40">
          Ambiente de produção — acesso restrito por convite
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
