"use client";

import { Suspense, useActionState, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { loginAction, type LoginActionState } from "./actions";

// ============================================================
// MOCK PROFILES
// ============================================================

interface MockProfile {
  label: string;
  email: string;
  password: string;
  color: string;
}

const MOCK_PROFILES: MockProfile[] = [
  {
    label: "Admin",
    email: "admin@soler.com",
    password: "admin123",
    color: "text-violet-400 hover:bg-violet-500/10",
  },
  {
    label: "Logística",
    email: "ops@soler.com",
    password: "ops123",
    color: "text-blue-400 hover:bg-blue-500/10",
  },
  {
    label: "Financeiro",
    email: "finance@soler.com",
    password: "fin123",
    color: "text-emerald-400 hover:bg-emerald-500/10",
  },
  {
    label: "Marketing",
    email: "mkt@soler.com",
    password: "mkt123",
    color: "text-amber-400 hover:bg-amber-500/10",
  },
];

// ============================================================
// PAGE
// ============================================================

function LoginForm() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";
  const [actionState, formAction, isPending] = useActionState<
    LoginActionState,
    FormData
  >(loginAction, {});
  const lastErrorRef = useRef<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const error = actionState?.error;
    if (!error || lastErrorRef.current === error) return;
    lastErrorRef.current = error;

    toast({
      variant: "destructive",
      title: "Falha no login",
      description: error,
    });
  }, [actionState, toast]);

  function fillProfile(profile: MockProfile) {
    setEmail(profile.email);
    setPassword(profile.password);
  }

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
        <div className="absolute -bottom-40 -right-20 h-[500px] w-[500px] rounded-full bg-blue-600/8 blur-3xl" />
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

      {/* ---- Login Card ---- */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">

          {/* Card top accent bar */}
          <div className="h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

          <div className="px-8 pb-8 pt-7">

            {/* ---- Logo ---- */}
            <div className="mb-8 flex flex-col items-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 shadow-lg shadow-violet-900/40">
                <ShieldCheck size={26} className="text-white" strokeWidth={1.75} />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Soler Shop</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Backoffice — Hub Operacional
              </p>
            </div>

            {/* ---- Form ---- */}
            <form action={formAction} noValidate className="space-y-4">
              <input type="hidden" name="redirectTo" value={redirectTo} />

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
                  disabled={isPending}
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
                    autoComplete="current-password"
                    placeholder="••••••••"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
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

              {/* Error message */}
              {actionState?.error && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs text-destructive">
                  {actionState.error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  "Entrar no Backoffice"
                )}
              </button>
            </form>

            {/* ---- Dev mock profiles ---- */}
            <div className="mt-7 border-t border-border/50 pt-5">
              <div className="mb-3 flex items-center gap-1.5">
                <Zap size={10} className="text-muted-foreground/40" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                  Acesso rápido (dev)
                </p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {MOCK_PROFILES.map((p) => (
                  <button
                    key={p.email}
                    type="button"
                    onClick={() => fillProfile(p)}
                    disabled={isPending}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-40",
                      p.color,
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-4 text-center text-[11px] text-muted-foreground/40">
          Ambiente de desenvolvimento — autenticação simulada
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
