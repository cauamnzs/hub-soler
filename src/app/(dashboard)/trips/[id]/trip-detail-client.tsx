"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  Plus,
  X,
  Receipt,
  Boxes,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Package,
} from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { updateTripStatus, createExpense } from "../actions";
import type {
  Trip,
  TripExpense,
  TripStatus,
  ExpenseType,
  BatchWithProduct,
} from "@/types/database";

// ============================================================
// HELPERS
// ============================================================

const STATUS_OPTIONS: { value: TripStatus; label: string }[] = [
  { value: "planning", label: "Planejando" },
  { value: "in_transit", label: "Em Trânsito" },
  { value: "consolidada", label: "Consolidada" },
];

const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  mercadoria: "Mercadoria",
  passagem_aerea: "Passagem Aérea",
  hotel: "Hotel",
  suborno_taxa_extra: "Taxa / Suborno",
  frete: "Frete",
  outros: "Outros",
};

const EXPENSE_TYPE_COLORS: Record<ExpenseType, string> = {
  mercadoria: "bg-violet-500/15 text-violet-400",
  passagem_aerea: "bg-blue-500/15 text-blue-400",
  hotel: "bg-cyan-500/15 text-cyan-400",
  suborno_taxa_extra: "bg-red-500/15 text-red-400",
  frete: "bg-amber-500/15 text-amber-400",
  outros: "bg-muted text-muted-foreground",
};

// ============================================================
// STATUS DROPDOWN (calls updateTripStatus server action)
// ============================================================

function StatusDropdown({
  tripId,
  value,
}: {
  tripId: string;
  value: TripStatus;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState<TripStatus>(value);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const colorMap: Record<TripStatus, string> = {
    planning: "border-border text-muted-foreground",
    in_transit: "border-blue-500/40 text-blue-400",
    consolidada: "border-emerald-500/40 text-emerald-400",
  };

  const currentLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;

  function handleChange(next: TripStatus) {
    setOpen(false);
    if (next === status) return;
    startTransition(async () => {
      setStatus(next); // optimistic
      const result = await updateTripStatus(tripId, next);
      if ("error" in result) {
        setStatus(status); // rollback
        toast({ variant: "error", title: "Erro ao atualizar status", description: result.error });
      }
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted",
          colorMap[status],
          isPending && "opacity-60 cursor-not-allowed",
        )}
      >
        {currentLabel}
        <ChevronDown
          size={12}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-xl border border-border bg-card p-1 shadow-lg">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleChange(opt.value)}
                className={cn(
                  "flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-muted",
                  opt.value === status ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {opt.label}
                {opt.value === status && (
                  <CheckCircle2 size={12} className="ml-auto text-emerald-400" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// ADD EXPENSE MODAL (calls createExpense server action)
// ============================================================

interface ExpenseForm {
  description: string;
  amount_brl: string;
  expense_type: ExpenseType;
}

const DEFAULT_EXP_FORM: ExpenseForm = {
  description: "",
  amount_brl: "",
  expense_type: "outros",
};

function AddExpenseModal({
  open,
  tripId,
  onClose,
}: {
  open: boolean;
  tripId: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<ExpenseForm>(DEFAULT_EXP_FORM);
  const [errors, setErrors] = useState<Partial<ExpenseForm>>({});

  function validate(): boolean {
    const next: Partial<ExpenseForm> = {};
    const val = parseFloat(form.amount_brl);
    if (!form.amount_brl || isNaN(val) || val <= 0) next.amount_brl = "Valor inválido";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const fd = new FormData();
    fd.set("trip_id", tripId);
    fd.set("description", form.description.trim());
    fd.set("expense_type", form.expense_type);
    fd.set("amount_brl", form.amount_brl);

    startTransition(async () => {
      const result = await createExpense(null, fd);
      if ("error" in result) {
        toast({ variant: "error", title: "Erro ao lançar despesa", description: result.error });
      } else {
        toast({ variant: "success", title: "Despesa lançada!", description: "Rateio recalculado pelo banco." });
        setForm(DEFAULT_EXP_FORM);
        setErrors({});
        onClose();
      }
    });
  }

  function handleClose() {
    setForm(DEFAULT_EXP_FORM);
    setErrors({});
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md animate-fade-in rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Lançar Despesa</h2>
            <p className="text-xs text-muted-foreground">
              Será rateada automaticamente entre os itens válidos.
            </p>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Tipo */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tipo de Despesa</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(EXPENSE_TYPE_LABELS) as ExpenseType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...form, expense_type: type })}
                  className={cn(
                    "rounded-lg border py-2 text-xs font-medium transition-colors",
                    form.expense_type === type
                      ? cn("border-transparent", EXPENSE_TYPE_COLORS[type])
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {EXPENSE_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Descrição</label>
            <input
              type="text"
              placeholder="ex: Gasolina, Táxi, Gorjeta alfândega..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary focus:bg-background"
            />
          </div>

          {/* Valor */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Valor (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.amount_brl}
                onChange={(e) => setForm({ ...form, amount_brl: e.target.value })}
                className={cn(
                  "w-full rounded-lg border bg-muted/50 py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary focus:bg-background",
                  errors.amount_brl ? "border-destructive" : "border-border",
                )}
              />
            </div>
            {errors.amount_brl && (
              <p className="mt-1 text-[11px] text-destructive">{errors.amount_brl}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={handleClose}
            className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-opacity",
              isPending
                ? "cursor-not-allowed bg-muted text-muted-foreground"
                : "bg-foreground text-background hover:opacity-90",
            )}
          >
            {isPending ? "Lançando..." : "Lançar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN CLIENT COMPONENT
// ============================================================

export function TripDetailClient({
  trip,
  expenses,
  batches,
}: {
  trip: Trip;
  expenses: TripExpense[];
  batches: BatchWithProduct[];
}) {
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  const exchangeRate = trip.final_exchange_rate ?? trip.estimated_exchange_rate;

  // Financial summary — computed from DB values
  const totalExpensesBRL = expenses.reduce((s, e) => s + e.amount_brl, 0);
  const totalProductsBRL = batches.reduce(
    (s, b) => s + b.purchase_price_usd * exchangeRate,
    0,
  );
  const totalInvestedBRL = totalExpensesBRL + totalProductsBRL;
  const totalValidUnits = batches.reduce((s, b) => s + b.qty_valid, 0);
  const totalLostUnits = batches.reduce((s, b) => s + b.qty_lost_seized, 0);

  // Batches with DB-computed absorption costs
  const batchesWithCost = batches.filter(
    (b) => b.real_unit_cost_brl !== null && b.qty_valid > 0,
  );

  const avgMarkup =
    batchesWithCost.length > 0
      ? batchesWithCost.reduce((s, b) => s + (b.products?.base_markup ?? 45), 0) /
        batchesWithCost.length
      : 0;

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">

        {/* Breadcrumb + Header */}
        <div>
          <Link
            href="/trips"
            className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={12} />
            Viagens
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{trip.name}</h1>
            <StatusDropdown tripId={trip.id} value={trip.status} />
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase",
                trip.origin === "PY"
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-blue-500/15 text-blue-400",
              )}
            >
              {trip.origin === "EUA" ? "🇺🇸" : "🇵🇾"} {trip.origin}
            </span>
          </div>
          {trip.notes && (
            <p className="mt-1 text-sm text-muted-foreground">{trip.notes}</p>
          )}
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              label: "Total Investido",
              value: formatBRL(totalInvestedBRL),
              sub: "Produtos + Despesas",
              icon: DollarSign,
              color: "text-blue-400",
              bg: "bg-blue-500/10",
            },
            {
              label: "Em Produtos (USD→BRL)",
              value: formatBRL(totalProductsBRL),
              sub: `Câmbio: R$ ${exchangeRate.toFixed(2)}`,
              icon: Package,
              color: "text-violet-400",
              bg: "bg-violet-500/10",
            },
            {
              label: "Despesas Extras",
              value: formatBRL(totalExpensesBRL),
              sub: `${expenses.length} lançamentos rateados`,
              icon: Receipt,
              color: "text-amber-400",
              bg: "bg-amber-500/10",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-xl border border-border bg-card p-5">
                <div className={cn("mb-3 inline-flex rounded-lg p-2", card.bg)}>
                  <Icon size={16} className={card.color} />
                </div>
                <p className="text-xl font-semibold tabular-nums">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/60">{card.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Exchange Rate Alert */}
        {trip.final_exchange_rate &&
          trip.final_exchange_rate > trip.estimated_exchange_rate && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-amber-400">Desvio de Câmbio Detectado</p>
                <p className="text-xs text-muted-foreground">
                  Câmbio final (R$ {trip.final_exchange_rate.toFixed(2)}) é{" "}
                  {(
                    ((trip.final_exchange_rate - trip.estimated_exchange_rate) /
                      trip.estimated_exchange_rate) *
                    100
                  ).toFixed(1)}
                  % acima do estimado (R$ {trip.estimated_exchange_rate.toFixed(2)}). Os custos
                  reais foram recalculados automaticamente pelo banco.
                </p>
              </div>
            </div>
          )}

        {/* Split Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* LEFT: Expenses */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <Receipt size={15} className="text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Despesas Extras</h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {expenses.length}
                  </span>
                </div>
                <button
                  onClick={() => setExpenseModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90"
                >
                  <Plus size={12} />
                  Lançar Despesa
                </button>
              </div>

              {expenses.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <Receipt size={28} className="text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground">Nenhuma despesa lançada ainda.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {expenses.map((exp) => (
                    <div key={exp.id} className="flex items-center gap-3 px-5 py-3.5">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                          EXPENSE_TYPE_COLORS[exp.expense_type],
                        )}
                      >
                        {EXPENSE_TYPE_LABELS[exp.expense_type]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-medium">{exp.description ?? "—"}</p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {new Date(exp.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <span className="shrink-0 tabular-nums text-sm font-semibold">
                        {formatBRL(exp.amount_brl)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {expenses.length > 0 && (
                <div className="flex items-center justify-between border-t border-border px-5 py-3">
                  <span className="text-xs font-medium text-muted-foreground">Total Despesas Extras</span>
                  <span className="text-sm font-bold text-amber-400 tabular-nums">
                    {formatBRL(totalExpensesBRL)}
                  </span>
                </div>
              )}
            </div>

            {/* Rateio info */}
            {totalValidUnits > 0 && expenses.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/30 px-5 py-4">
                <p className="text-xs font-semibold text-muted-foreground">Rateio por Absorção</p>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-lg font-bold">
                    {formatBRL(totalExpensesBRL / totalValidUnits)}
                  </span>
                  <span className="text-xs text-muted-foreground">por unidade válida</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  {formatBRL(totalExpensesBRL)} ÷ {totalValidUnits} unidades válidas. Absorve
                  perdas de {totalLostUnits} unid. apreendidas.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT: Batches */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                <Boxes size={15} className="text-muted-foreground" />
                <h2 className="text-sm font-semibold">Lotes / Produtos</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  {batches.length}
                </span>
              </div>

              {batches.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12">
                  <Boxes size={28} className="text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground">Nenhum lote vinculado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Produto / SKU</th>
                        <th className="px-4 py-3 font-medium text-center">Comp.</th>
                        <th className="px-4 py-3 font-medium text-center">Perd.</th>
                        <th className="px-4 py-3 font-medium text-center">Válid.</th>
                        <th className="px-4 py-3 font-medium text-right">Custo Real</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((batch) => {
                        const lossRatio =
                          batch.qty_purchased > 0
                            ? batch.qty_lost_seized / batch.qty_purchased
                            : 0;
                        return (
                          <tr
                            key={batch.id}
                            className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <p className="text-xs font-semibold">
                                {batch.products?.name ?? batch.product_sku}
                              </p>
                              <p className="font-mono text-[10px] text-muted-foreground/60">
                                {batch.product_sku}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-center tabular-nums text-sm">
                              {batch.qty_purchased}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={cn(
                                  "tabular-nums text-sm font-medium",
                                  batch.qty_lost_seized > 0
                                    ? "text-destructive"
                                    : "text-muted-foreground",
                                )}
                              >
                                {batch.qty_lost_seized > 0 ? `-${batch.qty_lost_seized}` : "—"}
                              </span>
                              {lossRatio > 0.2 && (
                                <span className="ml-1 text-[10px] text-destructive">
                                  ({(lossRatio * 100).toFixed(0)}%)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-semibold tabular-nums text-emerald-400">
                                {batch.qty_valid}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {batch.real_unit_cost_brl != null ? (
                                <div className="flex flex-col items-end">
                                  <span className="font-semibold tabular-nums text-sm">
                                    {formatBRL(batch.real_unit_cost_brl)}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground/60">
                                    USD {batch.purchase_price_usd.toFixed(2)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Pendente</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Margin Analysis — reads DB-computed values from recalculate_trip_costs() trigger */}
        {batchesWithCost.length > 0 && (
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <TrendingUp size={15} className="text-emerald-400" />
              <h2 className="text-sm font-semibold">Análise de Margem</h2>
              <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                Custeio por Absorção
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Produto</th>
                    <th className="px-5 py-3 font-medium text-right">Custo Direto</th>
                    <th className="px-5 py-3 font-medium text-right">+ Rateio</th>
                    <th className="px-5 py-3 font-medium text-right">Custo Real</th>
                    <th className="px-5 py-3 font-medium text-right">Preço Sugerido</th>
                    <th className="px-5 py-3 font-medium text-right">Preço Final</th>
                    <th className="px-5 py-3 font-medium text-right">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => {
                    if (batch.real_unit_cost_brl == null || batch.qty_valid === 0) return null;

                    const directCost = batch.purchase_price_usd * exchangeRate;
                    const rateioCost = batch.real_unit_cost_brl - directCost;

                    const margin = batch.final_price_brl
                      ? ((batch.final_price_brl - batch.real_unit_cost_brl) /
                          batch.final_price_brl) *
                        100
                      : null;

                    const targetMargin = batch.products?.base_markup ?? 45;
                    const marginOk = margin === null || margin >= targetMargin * 0.85;

                    return (
                      <tr
                        key={batch.id}
                        className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-xs font-semibold">
                            {batch.products?.name ?? batch.product_sku}
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground/50">
                            {batch.product_sku}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-xs text-muted-foreground">
                          {formatBRL(directCost)}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-xs text-amber-400">
                          + {formatBRL(rateioCost)}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-sm font-semibold">
                          {formatBRL(batch.real_unit_cost_brl)}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-xs text-muted-foreground">
                          {batch.suggested_price_brl ? formatBRL(batch.suggested_price_brl) : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums">
                          {batch.final_price_brl ? (
                            <span className="text-sm font-semibold">
                              {formatBRL(batch.final_price_brl)}
                            </span>
                          ) : (
                            <span className="text-xs italic text-muted-foreground">Aguardando</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {margin !== null ? (
                            <div className="flex items-center justify-end gap-1">
                              {marginOk ? (
                                <TrendingUp size={12} className="text-emerald-400" />
                              ) : (
                                <TrendingDown size={12} className="text-destructive" />
                              )}
                              <span
                                className={cn(
                                  "font-semibold tabular-nums",
                                  marginOk ? "text-emerald-400" : "text-destructive",
                                )}
                              >
                                {margin.toFixed(1)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer summary */}
            <div className="grid grid-cols-2 gap-px border-t border-border sm:grid-cols-4">
              {[
                { label: "Total Investido", value: formatBRL(totalInvestedBRL), color: "" },
                { label: "Unidades Válidas", value: `${totalValidUnits} unid.`, color: "text-emerald-400" },
                {
                  label: "Unidades Perdidas",
                  value: `${totalLostUnits} unid.`,
                  color: totalLostUnits > 0 ? "text-destructive" : "text-muted-foreground",
                },
                { label: "Markup Médio Alvo", value: `${avgMarkup.toFixed(1)}%`, color: "text-violet-400" },
              ].map((s) => (
                <div key={s.label} className="px-5 py-4">
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  <p className={cn("mt-1 text-lg font-bold", s.color)}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AddExpenseModal
        open={expenseModalOpen}
        tripId={trip.id}
        onClose={() => setExpenseModalOpen(false)}
      />
    </>
  );
}
