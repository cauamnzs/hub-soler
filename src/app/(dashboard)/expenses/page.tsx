"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  X,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Receipt,
  TrendingDown,
  CalendarDays,
  Flame,
  CheckCircle2,
  Clock,
  Tag,
} from "lucide-react";
import { cn, formatBRL, formatDate } from "@/lib/utils";

// ============================================================
// TYPES
// ============================================================

type ExpenseCategory =
  | "Software"
  | "Embalagem"
  | "Marketing"
  | "Contabilidade"
  | "Frete"
  | "Outros";

type ExpenseStatus = "paid" | "pending";

interface GlobalExpense {
  id: string;
  date: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  status: ExpenseStatus;
}

// ============================================================
// MOCK DATA
// ============================================================

const INITIAL_EXPENSES: GlobalExpense[] = [
  {
    id: "exp-1",
    date: "2025-03-01",
    description: "Mensalidade Bling ERP",
    category: "Software",
    amount: 199.9,
    status: "paid",
  },
  {
    id: "exp-2",
    date: "2025-03-03",
    description: "Meta Ads — Campanha Perfumes",
    category: "Marketing",
    amount: 850.0,
    status: "paid",
  },
  {
    id: "exp-3",
    date: "2025-03-05",
    description: "Caixas de Papelão 20×20×20 (500un)",
    category: "Embalagem",
    amount: 420.0,
    status: "paid",
  },
  {
    id: "exp-4",
    date: "2025-03-08",
    description: "Honorários Contábeis — Março",
    category: "Contabilidade",
    amount: 650.0,
    status: "paid",
  },
  {
    id: "exp-5",
    date: "2025-03-10",
    description: "Google Workspace Business",
    category: "Software",
    amount: 89.9,
    status: "paid",
  },
  {
    id: "exp-6",
    date: "2025-03-12",
    description: "Frete Sedex — Clientes Sul/SE",
    category: "Frete",
    amount: 340.0,
    status: "paid",
  },
  {
    id: "exp-7",
    date: "2025-03-18",
    description: "Meta Ads — Remarketing Abril",
    category: "Marketing",
    amount: 600.0,
    status: "pending",
  },
  {
    id: "exp-8",
    date: "2025-03-22",
    description: "Bubble Wrap e Fita Adesiva",
    category: "Embalagem",
    amount: 180.0,
    status: "pending",
  },
  {
    id: "exp-9",
    date: "2025-03-28",
    description: "Mensalidade Vercel Pro",
    category: "Software",
    amount: 120.0,
    status: "pending",
  },
];

// ============================================================
// CONSTANTS
// ============================================================

const CATEGORIES: ExpenseCategory[] = [
  "Software",
  "Embalagem",
  "Marketing",
  "Contabilidade",
  "Frete",
  "Outros",
];

const CATEGORY_STYLE: Record<ExpenseCategory, string> = {
  Software: "bg-violet-500/15 text-violet-400",
  Embalagem: "bg-amber-500/15 text-amber-400",
  Marketing: "bg-pink-500/15 text-pink-400",
  Contabilidade: "bg-blue-500/15 text-blue-400",
  Frete: "bg-emerald-500/15 text-emerald-400",
  Outros: "bg-muted text-muted-foreground",
};

// ============================================================
// HELPERS
// ============================================================

type SortKey = "date" | "description" | "category" | "amount";
type SortDir = "asc" | "desc";

function SortTh({
  label,
  sortKey,
  current,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = current === sortKey;
  return (
    <th className={cn("px-5 py-3", align === "right" && "text-right")}>
      <button
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 text-[11px] uppercase tracking-wide transition-colors hover:text-foreground",
          align === "right" && "ml-auto",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        {active ? (
          dir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />
        ) : (
          <ChevronsUpDown size={11} className="opacity-40" />
        )}
      </button>
    </th>
  );
}

// ============================================================
// NEW EXPENSE MODAL
// ============================================================

interface ExpenseForm {
  date: string;
  description: string;
  category: ExpenseCategory | "";
  amount: string;
  status: ExpenseStatus;
}

const DEFAULT_FORM: ExpenseForm = {
  date: new Date().toISOString().split("T")[0],
  description: "",
  category: "",
  amount: "",
  status: "pending",
};

function NewExpenseModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (e: GlobalExpense) => void;
}) {
  const [form, setForm] = useState<ExpenseForm>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<ExpenseForm>>({});

  function set<K extends keyof ExpenseForm>(key: K, val: ExpenseForm[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<ExpenseForm> = {};
    if (!form.date) next.date = "Data obrigatória";
    if (!form.description.trim()) next.description = "Descrição obrigatória";
    if (!form.category) next.category = "" as ExpenseCategory;
    const amt = parseFloat(form.amount.replace(",", "."));
    if (!form.amount || isNaN(amt) || amt <= 0) next.amount = "Valor inválido";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSave({
      id: `exp-${Date.now()}`,
      date: form.date,
      description: form.description.trim(),
      category: form.category as ExpenseCategory,
      amount: parseFloat(form.amount.replace(",", ".")),
      status: form.status,
    });
    setForm(DEFAULT_FORM);
    setErrors({});
    onClose();
  }

  function handleClose() {
    setForm(DEFAULT_FORM);
    setErrors({});
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md animate-fade-in overflow-hidden rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold">Nova Despesa</h2>
            <p className="text-xs text-muted-foreground">OPEX — custo fixo ou variável da operação</p>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">

          {/* Data + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Data</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className={cn(
                  "w-full rounded-xl border bg-muted/50 px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:bg-background",
                  errors.date ? "border-destructive" : "border-border",
                )}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
              <div className="flex gap-1.5">
                {(["pending", "paid"] as ExpenseStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("status", s)}
                    className={cn(
                      "flex-1 rounded-xl border py-2 text-xs font-semibold transition-colors",
                      form.status === s
                        ? s === "paid"
                          ? "border-transparent bg-emerald-500/20 text-emerald-400"
                          : "border-transparent bg-amber-500/20 text-amber-400"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {s === "paid" ? "Pago" : "Pendente"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Descrição</label>
            <input
              type="text"
              placeholder="ex: Mensalidade Bling ERP"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={cn(
                "w-full rounded-xl border bg-muted/50 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary focus:bg-background",
                errors.description ? "border-destructive" : "border-border",
              )}
            />
            {errors.description && <p className="mt-1 text-[11px] text-destructive">{errors.description}</p>}
          </div>

          {/* Categoria */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Tag size={11} /> Categoria
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => set("category", cat)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    form.category === cat
                      ? CATEGORY_STYLE[cat]
                      : "border border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            {errors.category !== undefined && !form.category && (
              <p className="mt-1 text-[11px] text-destructive">Selecione uma categoria</p>
            )}
          </div>

          {/* Valor */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Valor (R$)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                className={cn(
                  "w-full rounded-xl border bg-muted/50 py-2 pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary focus:bg-background",
                  errors.amount ? "border-destructive" : "border-border",
                )}
              />
            </div>
            {errors.amount && <p className="mt-1 text-[11px] text-destructive">{errors.amount}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border px-6 py-4">
          <button onClick={handleClose} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">
            Cancelar
          </button>
          <button onClick={handleSave} className="flex-1 rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background hover:opacity-90">
            Registrar Despesa
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<GlobalExpense[]>(INITIAL_EXPENSES);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<ExpenseCategory | "all">("all");
  const [filterStatus, setFilterStatus] = useState<ExpenseStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [modalOpen, setModalOpen] = useState(false);

  // ---- Derived stats ----
  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonth = expenses.filter((e) => e.date.startsWith(currentMonth));
  // Fallback: use all data if no current-month entries in mock
  const relevantExpenses = thisMonth.length > 0 ? thisMonth : expenses;

  const totalMonth = relevantExpenses.reduce((s, e) => s + e.amount, 0);
  const paidMonth = relevantExpenses.filter((e) => e.status === "paid").reduce((s, e) => s + e.amount, 0);
  const pendingMonth = relevantExpenses.filter((e) => e.status === "pending").reduce((s, e) => s + e.amount, 0);

  const burnRate = totalMonth / 30;

  const topCategory = useMemo(() => {
    const totals: Partial<Record<ExpenseCategory, number>> = {};
    relevantExpenses.forEach((e) => {
      totals[e.category] = (totals[e.category] ?? 0) + e.amount;
    });
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    return sorted[0] ?? null;
  }, [relevantExpenses]);

  // ---- Table rows ----
  const displayRows = useMemo(() => {
    let rows = expenses.filter((e) => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q || e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
      const matchCat = filterCat === "all" || e.category === filterCat;
      const matchStatus = filterStatus === "all" || e.status === filterStatus;
      return matchSearch && matchCat && matchStatus;
    });

    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.date.localeCompare(b.date);
      else if (sortKey === "description") cmp = a.description.localeCompare(b.description);
      else if (sortKey === "category") cmp = a.category.localeCompare(b.category);
      else if (sortKey === "amount") cmp = a.amount - b.amount;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [expenses, search, filterCat, filterStatus, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function toggleStatus(id: string) {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: e.status === "paid" ? "pending" : "paid" } : e,
      ),
    );
  }

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Despesas Globais</h1>
            <p className="text-sm text-muted-foreground">OPEX — custos fixos e variáveis da operação</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> Nova Despesa
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: "Total do Mês",
              value: formatBRL(totalMonth),
              sub: `${relevantExpenses.length} lançamentos`,
              icon: Receipt,
              color: "text-foreground",
              bg: "bg-muted/40",
            },
            {
              label: "Pago",
              value: formatBRL(paidMonth),
              sub: `${relevantExpenses.filter((e) => e.status === "paid").length} quitados`,
              icon: CheckCircle2,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10",
            },
            {
              label: "Pendente",
              value: formatBRL(pendingMonth),
              sub: `${relevantExpenses.filter((e) => e.status === "pending").length} a pagar`,
              icon: Clock,
              color: "text-amber-400",
              bg: "bg-amber-500/10",
            },
            {
              label: "Burn Rate",
              value: formatBRL(burnRate),
              sub: "gasto médio/dia",
              icon: Flame,
              color: "text-rose-400",
              bg: "bg-rose-500/10",
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl border border-border bg-card p-5">
                <div className={cn("mb-3 inline-flex rounded-lg p-2", s.bg)}>
                  <Icon size={15} className={s.color} />
                </div>
                <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/60">{s.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Category spotlight */}
        {topCategory && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-3">
            <TrendingDown size={15} className="shrink-0 text-amber-400" />
            <p className="text-sm">
              Categoria com maior gasto:{" "}
              <span className={cn("font-semibold", CATEGORY_STYLE[topCategory[0] as ExpenseCategory].split(" ")[1])}>
                {topCategory[0]}
              </span>{" "}
              <span className="text-muted-foreground">— {formatBRL(topCategory[1])}</span>
            </p>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por descrição ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted/50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterCat("all")}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-colors", filterCat === "all" ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:bg-muted")}
            >
              Todas
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(filterCat === cat ? "all" : cat)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  filterCat === cat ? CATEGORY_STYLE[cat] : "border border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1 rounded-lg border border-border p-0.5">
            {(["all", "paid", "pending"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setFilterStatus(v)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  filterStatus === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v === "all" ? "Todos" : v === "paid" ? "Pagos" : "Pendentes"}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={15} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold">Lançamentos</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {displayRows.length} de {expenses.length} despesas
              {displayRows.length > 0 && (
                <span className="ml-2 font-semibold text-foreground">
                  · {formatBRL(displayRows.reduce((s, e) => s + e.amount, 0))}
                </span>
              )}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <SortTh label="Data" sortKey="date" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Descrição" sortKey="description" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Categoria" sortKey="category" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Valor" sortKey="amount" current={sortKey} dir={sortDir} onSort={handleSort} align="right" />
                  <th className="px-5 py-3 text-[11px] uppercase tracking-wide text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((e) => (
                  <tr key={e.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(e.date)}</td>
                    <td className="px-5 py-3 font-medium">{e.description}</td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", CATEGORY_STYLE[e.category])}>
                        {e.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatBRL(e.amount)}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleStatus(e.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors",
                          e.status === "paid"
                            ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                            : "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25",
                        )}
                      >
                        {e.status === "paid" ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                        {e.status === "paid" ? "Pago" : "Pendente"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {displayRows.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <Receipt size={28} className="text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">
                  {search || filterCat !== "all" || filterStatus !== "all"
                    ? "Nenhuma despesa encontrada para este filtro."
                    : "Nenhuma despesa registrada."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <NewExpenseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={(expense) => setExpenses((prev) => [expense, ...prev])}
      />
    </>
  );
}
