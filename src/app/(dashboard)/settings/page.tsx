"use client";

import { useState } from "react";
import {
  Plug,
  Users,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  Database,
  UserPlus,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// TABS PRIMITIVE (inline — no shadcn install needed)
// ============================================================

type TabId = "integrations" | "team" | "rules";

function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
}) {
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "integrations", label: "Integrações", icon: <Plug size={14} /> },
    { id: "team", label: "Equipe & Acessos", icon: <Users size={14} /> },
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
  const [apiKey, setApiKey] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("idle");

  async function testConnection() {
    if (!apiKey.trim()) return;
    setStatus("testing");
    await new Promise((r) => setTimeout(r, 1200));
    // Mock: keys starting with "slr-" pass, everything else fails
    setStatus(apiKey.trim().toLowerCase().startsWith("slr-") ? "connected" : "error");
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <ShieldCheck size={18} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Bling V3 ERP</h3>
            <p className="text-xs text-muted-foreground">Sincronização de produtos e estoque</p>
          </div>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            API Key (Bearer Token OAuth2)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={show ? "text" : "password"}
                placeholder="slr-xxxxxxxxxxxxxxxx"
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setStatus("idle"); }}
                className="w-full rounded-xl border border-border bg-muted/50 py-2.5 pl-3.5 pr-10 text-sm font-mono outline-none transition-colors focus:border-primary focus:bg-background"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
              >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button
              onClick={testConnection}
              disabled={!apiKey.trim() || status === "testing"}
              className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {status === "testing" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              Testar
            </button>
          </div>
          {status === "connected" && (
            <p className="mt-2 text-[11px] text-emerald-400">
              ✓ Conexão estabelecida — endpoints /produtos e /estoques respondendo.
            </p>
          )}
          {status === "error" && (
            <p className="mt-2 text-[11px] text-destructive">
              ✗ Falha na autenticação. Verifique se a API Key é válida (dica: use prefixo slr-).
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground/80">Endpoints utilizados</p>
          <ul className="mt-2 space-y-1 font-mono text-[11px]">
            <li className="flex justify-between"><span>POST /produtos</span><span className="text-blue-400">create_update</span></li>
            <li className="flex justify-between"><span>PATCH /estoques/:id</span><span className="text-amber-400">stock_deduct</span></li>
            <li className="flex justify-between"><span>GET /produtos/:id</span><span className="text-muted-foreground/60">lookup</span></li>
          </ul>
        </div>
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
// TAB: TEAM
// ============================================================

type UserRole = "admin" | "finance" | "operations" | "marketing";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  avatarColor: string;
  status: "active" | "invited";
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  finance: "Financeiro",
  operations: "Logística",
  marketing: "Marketing",
};

const ROLE_STYLE: Record<UserRole, string> = {
  admin: "bg-violet-500/15 text-violet-400",
  finance: "bg-emerald-500/15 text-emerald-400",
  operations: "bg-blue-500/15 text-blue-400",
  marketing: "bg-amber-500/15 text-amber-400",
};

const INITIAL_TEAM: TeamMember[] = [
  { id: "u1", name: "Rafael Soler", email: "admin@soler.com", role: "admin", avatar: "RS", avatarColor: "from-violet-500 to-purple-700", status: "active" },
  { id: "u2", name: "Isa Soler", email: "ops@soler.com", role: "operations", avatar: "IS", avatarColor: "from-blue-500 to-indigo-700", status: "active" },
  { id: "u3", name: "Cauã Soler", email: "mkt@soler.com", role: "marketing", avatar: "CS", avatarColor: "from-amber-500 to-orange-600", status: "active" },
];

function TeamTab() {
  const [team, setTeam] = useState<TeamMember[]>(INITIAL_TEAM);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("operations");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  function updateRole(id: string, role: UserRole) {
    setTeam((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
  }

  async function handleInvite() {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      setInviteError("E-mail inválido.");
      return;
    }
    if (team.some((m) => m.email === inviteEmail.trim().toLowerCase())) {
      setInviteError("Este e-mail já é membro.");
      return;
    }
    setInviting(true);
    await new Promise((r) => setTimeout(r, 800));
    const initials = inviteEmail.split("@")[0].slice(0, 2).toUpperCase();
    setTeam((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        name: inviteEmail.split("@")[0],
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        avatar: initials,
        avatarColor: "from-zinc-500 to-zinc-700",
        status: "invited",
      },
    ]);
    setInviteEmail("");
    setInviteError("");
    setInviting(false);
  }

  return (
    <div className="space-y-4">
      {/* Member list */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-muted-foreground" />
            <h3 className="text-sm font-semibold">Membros da Equipe</h3>
          </div>
          <span className="text-xs text-muted-foreground">{team.length} membros</span>
        </div>
        <ul className="divide-y divide-border/50">
          {team.map((member) => (
            <li key={member.id} className="flex items-center gap-4 px-5 py-4">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white", member.avatarColor)}>
                {member.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">
                  {member.name}
                  {member.status === "invited" && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      Convite enviado
                    </span>
                  )}
                </p>
                <p className="truncate text-[11px] text-muted-foreground/70">{member.email}</p>
              </div>
              <select
                value={member.role}
                onChange={(e) => updateRole(member.id, e.target.value as UserRole)}
                className={cn(
                  "cursor-pointer rounded-lg border border-transparent px-2.5 py-1.5 text-[11px] font-semibold outline-none transition-colors",
                  ROLE_STYLE[member.role],
                )}
              >
                {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([r, l]) => (
                  <option key={r} value={r}>{l}</option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </div>

      {/* Invite */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus size={15} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold">Convidar Membro</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            placeholder="novo@soler.com"
            value={inviteEmail}
            onChange={(e) => { setInviteEmail(e.target.value); setInviteError(""); }}
            className={cn(
              "min-w-0 flex-1 rounded-xl border bg-muted/50 px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary focus:bg-background",
              inviteError ? "border-destructive" : "border-border",
            )}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as UserRole)}
            className="rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
          >
            {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([r, l]) => (
              <option key={r} value={r}>{l}</option>
            ))}
          </select>
          <button
            onClick={handleInvite}
            disabled={inviting}
            className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-60 hover:opacity-90 transition-opacity"
          >
            {inviting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Convidar
          </button>
        </div>
        {inviteError && <p className="mt-2 text-[11px] text-destructive">{inviteError}</p>}
      </div>
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
  auto_sync_bling: boolean;
  require_trip_for_batch: boolean;
}

function RulesTab() {
  const [rules, setRules] = useState<BusinessRules>({
    default_markup: "45",
    low_stock_alert: "3",
    exchange_alert_pct: "5",
    auto_sync_bling: true,
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
              key: "auto_sync_bling" as const,
              label: "Sincronização automática com Bling",
              description: "Dispara /api/bling/sync automaticamente em toda venda express e aprovação de preço",
            },
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
          Integrações, equipe e regras de negócio do Hub Soler
        </p>
      </div>

      {/* Tab bar */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === "integrations" && <IntegrationsTab />}
      {activeTab === "team" && <TeamTab />}
      {activeTab === "rules" && <RulesTab />}
    </div>
  );
}
