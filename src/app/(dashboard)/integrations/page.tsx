import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Plug,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Package,
  Zap,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import type { BlingToken } from "@/types/database";

// ============================================================
// Bling Token Queries
// ============================================================

async function getBlingToken(): Promise<BlingToken | null> {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch Bling token (id=1 for single org)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qb = supabase.from("bling_tokens") as any;
  const { data, error } = await qb
    .select("*")
    .eq("id", 1)
    .single();

  if (error || !data) return null;
  return data as BlingToken;
}

// ============================================================
// Components
// ============================================================

function ConnectionBadge({ connected, expiresAt }: { connected: boolean; expiresAt?: string }) {
  if (!connected) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
        <XCircle size={12} />
        Desconectado
      </span>
    );
  }

  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : true;
  
  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-500">
        <AlertCircle size={12} />
        Token Expirado
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-500">
      <CheckCircle2 size={12} />
      Conectado
    </span>
  );
}

function IntegrationCard({
  title,
  description,
  icon: Icon,
  connected,
  expiresAt,
  docsUrl,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  connected: boolean;
  expiresAt?: string;
  docsUrl: string;
}) {
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

  return (
    <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg">
      <div className="flex items-start gap-4 p-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg">
          <Icon className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
            <ConnectionBadge connected={connected} expiresAt={expiresAt} />
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-muted/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {connected && !isExpired && expiresAt ? (
              <span className="flex items-center gap-1.5">
                <RefreshCw size={12} />
                Expira em {formatDateTime(expiresAt)}
              </span>
            ) : connected && isExpired ? (
              <span className="text-amber-500">Re-autenticação necessária</span>
            ) : (
              <span>Clique para conectar sua conta</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ExternalLink size={12} />
              Docs
            </Link>
            {!connected || isExpired ? (
              <a
                href="/api/bling/auth"
                className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90"
              >
                <Plug size={12} />
                Conectar
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-500">
                <CheckCircle2 size={12} />
                Ativo
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Page (Server Component)
// ============================================================

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;
  const blingToken = await getBlingToken();

  // Handle query params for OAuth callback feedback
  const success = params?.success === "true";
  const error = params?.error;

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integrações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conecte-se com marketplaces, ERPs e ferramentas externas.
          </p>
        </div>
        <Link
          href="/settings"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          ← Voltar para Configurações
        </Link>
      </div>

      {/* Feedback banners */}
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          <CheckCircle2 size={16} />
          <span className="font-medium">Bling V3 conectado com sucesso!</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <XCircle size={16} />
          <span className="font-medium">Erro:</span>
          <span>{decodeURIComponent(error)}</span>
        </div>
      )}

      {/* Integration Cards */}
      <div className="grid gap-6">
        <IntegrationCard
          title="Bling V3"
          description="Sincronização de produtos, estoque e pedidos com o ERP Bling. Requer conta ativa no Bling."
          icon={Package}
          connected={!!blingToken && new Date(blingToken.expires_at) > new Date()}
          expiresAt={blingToken?.expires_at}
          docsUrl="https://developer.bling.com.br/docs/autenticacao/overview"
        />

        {/* Future integrations placeholder */}
        <div className="group overflow-hidden rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center transition-colors hover:border-border hover:bg-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Zap size={24} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-muted-foreground">Mais integrações em breve</h3>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Mercado Livre, Shopify, WooCommerce e outras plataformas estão no roadmap.
          </p>
        </div>
      </div>

      {/* Environment Check */}
      <div className="rounded-xl border border-border bg-muted/30 p-5">
        <h3 className="mb-3 text-sm font-semibold">Status do Ambiente</h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className={cn(
              "h-2 w-2 rounded-full",
              process.env.BLING_CLIENT_ID ? "bg-emerald-500" : "bg-destructive"
            )} />
            <span className="text-muted-foreground">BLING_CLIENT_ID:</span>
            <span className={process.env.BLING_CLIENT_ID ? "text-emerald-500" : "text-destructive"}>
              {process.env.BLING_CLIENT_ID ? "Configurado" : "Não configurado"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "h-2 w-2 rounded-full",
              process.env.BLING_CLIENT_SECRET ? "bg-emerald-500" : "bg-destructive"
            )} />
            <span className="text-muted-foreground">BLING_CLIENT_SECRET:</span>
            <span className={process.env.BLING_CLIENT_SECRET ? "text-emerald-500" : "text-destructive"}>
              {process.env.BLING_CLIENT_SECRET ? "Configurado" : "Não configurado"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "h-2 w-2 rounded-full",
              process.env.BLING_STATE ? "bg-emerald-500" : "bg-amber-500"
            )} />
            <span className="text-muted-foreground">BLING_STATE (CSRF):</span>
            <span className={process.env.BLING_STATE ? "text-emerald-500" : "text-amber-500"}>
              {process.env.BLING_STATE ? "Configurado" : "Usando padrão"}
            </span>
          </div>
        </div>
        {!process.env.BLING_CLIENT_ID && (
          <p className="mt-3 text-xs text-destructive">
            Configure BLING_CLIENT_ID e BLING_CLIENT_SECRET no seu .env.local
          </p>
        )}
      </div>
    </div>
  );
}
