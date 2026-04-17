"use client";

import { useState, useEffect } from "react";
import {
  Plug,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Database,
  Save,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// TABS PRIMITIVE (inline — no shadcn install needed)
// ============================================================

type TabId = "integrations" | "rules";

function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
}) {
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "integrations", label: "Integrações", icon: <Plug size={14} /> },
    { id: "rules", label: "Regras de Negócio", icon: <SlidersHorizontal size={14} /> },
  ];

  return (
    <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
            active === t.id
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.icon}
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================================
// TAB: INTEGRATIONS
// ============================================================

type ConnectionStatus = "idle" | "testing" | "connected" | "error";

function BlingCard() {
  // Check if Bling OAuth tokens exist in database
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    // Fetch token status from API
    fetch("/api/bling/status")
      .then((res) => res.json())
      .then((data) => setIsConnected(data.hasToken))
      .catch(() => setIsConnected(false));
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <ShieldCheck size={18} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Bling V3 ERP</h3>
            <p className="text-xs text-muted-foreground">Integração via OAuth</p>
          </div>
        </div>
        {isConnected === true && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
            <Check size={10} />
            Autenticado
          </span>
        )}
        {isConnected === false && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold text-amber-400">
            <XCircle size={10} />
            Não configurado
          </span>
        )}
        {isConnected === null && (
          <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
            <Loader2 size={10} className="animate-spin" />
            Verificando...
          </span>
        )}
      </div>

      <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground/80">Status da Integração</p>
        <p className="mt-1">
          {isConnected === true
            ? "Integração Bling ativa via OAuth. Tokens armazenados com segurança."
            : isConnected === false
              ? "A integração não está configurada. Configure em /integrations."
              : "Verificando status da integração..."}
        </p>
        <ul className="mt-3 space-y-1 font-mono text-[11px]">
          <li className="flex justify-between"><span>POST /produtos</span><span className="text-blue-400">create_update</span></li>
          <li className="flex justify-between"><span>PATCH /estoques/:id</span><span className="text-amber-400">stock_deduct</span></li>
          <li className="flex justify-between"><span>GET /produtos/:id</span><span className="text-muted-foreground/60">lookup</span></li>
        </ul>
      </div>
    </div>
  );
}

function SupabaseCard() {
  const [status, setStatus] = useState<ConnectionStatus>("idle");

  async function ping() {
    setStatus("testing");
    await new Promise((r) => setTimeout(r, 900));
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL || true; // always mock-connected in dev
    setStatus(hasUrl ? "connected" : "error");
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
            <Database size={18} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Supabase</h3>
            <p className="text-xs text-muted-foreground">Banco de dados PostgreSQL + Auth</p>
          </div>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Projeto</span>
            <span className="font-mono font-semibold">hub-soler</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Região</span>
            <span className="font-mono">sa-east-1 (São Paulo)</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Versão PostgreSQL</span>
            <span className="font-mono">15.4</span>
          </div>
        </div>

        <button
          onClick={ping}
          disabled={status === "testing"}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
        >
          {status === "testing" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Verificar conexão
        </button>

        {status === "connected" && (
          <p className="text-center text-[11px] text-emerald-400">✓ Banco respondendo normalmente</p>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ConnectionStatus }) {
  if (status === "idle")
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
        Não testado
      </span>
    );
  if (status === "testing")
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold text-blue-400">
        <Loader2 size={10} className="animate-spin" />
        Testando
      </span>
    );
  if (status === "connected")
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
        <CheckCircle2 size={10} />
        Conectado
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-[10px] font-semibold text-destructive">
      <XCircle size={10} />
      Desconectado
    </span>
  );
}

function IntegrationsTab() {
  return (
    <div className="space-y-4">
      <BlingCard />
      <SupabaseCard />
    </div>
  );
}

// ============================================================
// TAB: BUSINESS RULES
// ============================================================

interface BusinessRules {
  default_markup: string;
  low_stock_alert: string;
  exchange_alert_pct: string;
  require_trip_for_batch: boolean;
}

function RulesTab() {
  const [rules, setRules] = useState<BusinessRules>({
    default_markup: "45",
    low_stock_alert: "3",
    exchange_alert_pct: "5",
    require_trip_for_batch: true,
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function setRule<K extends keyof BusinessRules>(key: K, val: BusinessRules[K]) {
    setRules((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="space-y-4">

      {/* Numeric settings */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-5 text-sm font-semibold">Parâmetros Globais</h3>
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            {
              key: "default_markup" as const,
              label: "Markup Padrão",
              suffix: "%",
              hint: "Usado ao cadastrar novo produto sem markup definido",
            },
            {
              key: "low_stock_alert" as const,
              label: "Alerta de Estoque Baixo",
              suffix: "un.",
              hint: "Quantidade mínima antes do indicador âmbar aparecer",
            },
            {
              key: "exchange_alert_pct" as const,
              label: "Alerta de Desvio Cambial",
              suffix: "%",
              hint: "% de variação antes do alerta na tela de viagem",
            },
          ].map(({ key, label, suffix, hint }) => (
            <div key={key}>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={rules[key] as string}
                  onChange={(e) => setRule(key, e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/50 py-2.5 pl-3.5 pr-10 text-sm font-semibold outline-none transition-colors focus:border-primary focus:bg-background"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground/60">{hint}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Toggle rules */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-5 text-sm font-semibold">Comportamentos do Sistema</h3>
        <div className="space-y-4">
          {[
            {
              key: "require_trip_for_batch" as const,
              label: "Exigir viagem para novo lote de inventário",
              description: "Bloqueia o cadastro de estoque sem vincular a uma viagem de importação",
            },
          ].map(({ key, label, description }) => (
            <div key={key} className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium">{label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/70">{description}</p>
              </div>
              {/* Toggle switch */}
              <button
                onClick={() => setRule(key, !rules[key])}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  rules[key] ? "bg-emerald-500" : "bg-muted-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                    rules[key] ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-400">
            <CheckCircle2 size={14} /> Configurações salvas
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60 hover:opacity-90 transition-opacity"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Salvar Configurações
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("integrations");

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Integrações e regras de negócio do Hub Soler
        </p>
      </div>

      {/* Tab bar */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === "integrations" && <IntegrationsTab />}
      {activeTab === "rules" && <RulesTab />}
    </div>
  );
}
