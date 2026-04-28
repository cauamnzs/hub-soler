"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import {
  Boxes,
  Plus,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Package,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { createInventoryEntry, updateInventoryBatch, deleteInventoryBatch } from "./actions";
import { Pencil, Trash2 } from "lucide-react";
import type { Category, Trip, InventoryStockRow, ProductWithCategory } from "@/types/database";

// ============================================================
// HELPERS / SUB-COMPONENTS
// ============================================================

type SortKey = "sku" | "name" | "category" | "qty_valid";
type SortDir = "asc" | "desc";

function CategoryBadge({ name, code }: { name: string; code: string }) {
  const colorMap: Record<string, string> = {
    PERF: "bg-violet-500/15 text-violet-400",
    COSM: "bg-pink-500/15 text-pink-400",
    ELET: "bg-blue-500/15 text-blue-400",
    SUPL: "bg-emerald-500/15 text-emerald-400",
    VEST: "bg-amber-500/15 text-amber-400",
    OUTR: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        colorMap[code] ?? "bg-muted text-muted-foreground",
      )}
    >
      {name}
    </span>
  );
}

function StockIndicator({ qty }: { qty: number }) {
  if (qty === 0)
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-destructive">
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
        Zerado
      </span>
    );
  if (qty <= 3)
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        {qty}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      {qty}
    </span>
  );
}

// ============================================================
// EDIT BATCH BUTTON + MODAL
// ============================================================

function EditBatchButton({ row }: { row: InventoryStockRow }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    qty_purchased: row.qty_purchased.toString(),
    qty_lost_seized: row.qty_lost.toString(),
    purchase_price_usd: row.purchase_price_usd.toString(),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("qty_purchased", form.qty_purchased);
    fd.set("qty_lost_seized", form.qty_lost_seized);
    fd.set("purchase_price_usd", form.purchase_price_usd);

    startTransition(async () => {
      const result = await updateInventoryBatch(row.id, fd);
      if ("error" in result) {
        toast({ variant: "error", title: "Erro ao atualizar", description: result.error });
      } else {
        toast({ variant: "success", title: "Lote atualizado!", description: "Custo da viagem recalculado." });
        setIsOpen(false);
      }
    });
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors"
        title="Editar lote"
      >
        <Pencil size={14} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Editar Lote</h2>
            <p className="text-xs text-muted-foreground">{row.name} ({row.sku})</p>
          </div>
          <button onClick={() => setIsOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Qtd. Comprada</label>
              <input
                type="number"
                min="1"
                value={form.qty_purchased}
                onChange={(e) => setForm({ ...form, qty_purchased: e.target.value })}
                className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Qtd. Avariada</label>
              <input
                type="number"
                min="0"
                value={form.qty_lost_seized}
                onChange={(e) => setForm({ ...form, qty_lost_seized: e.target.value })}
                className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Preço de Compra (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.purchase_price_usd}
                onChange={(e) => setForm({ ...form, purchase_price_usd: e.target.value })}
                className="w-full rounded-lg border border-border bg-muted/50 py-2 pl-9 pr-3 text-sm"
                required
              />
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-medium transition-opacity",
                isPending ? "bg-muted text-muted-foreground" : "bg-foreground text-background hover:opacity-90"
              )}
            >
              {isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// DELETE BATCH BUTTON + MODAL
// ============================================================

function DeleteBatchButton({ row }: { row: InventoryStockRow }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteInventoryBatch(row.id);
      if ("error" in result) {
        toast({ variant: "error", title: "Erro ao excluir", description: result.error });
      } else {
        toast({ variant: "success", title: "Lote excluído!", description: "Custo da viagem recalculado." });
        setIsOpen(false);
      }
    });
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-full p-1 text-destructive hover:bg-destructive/10 transition-colors"
        title="Excluir lote"
      >
        <Trash2 size={14} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-destructive/10 p-2">
            <Trash2 size={20} className="text-destructive" />
          </div>
          <h2 className="text-base font-semibold">Confirmar Exclusão</h2>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">
          Excluir lote de <strong>{row.name}</strong>?
          <br />
          <span className="text-xs">
            SKU: {row.sku} • Qtd: {row.qty_purchased} unidades
          </span>
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => setIsOpen(false)}
            className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-opacity",
              isPending ? "bg-muted text-muted-foreground" : "bg-destructive text-white hover:opacity-90"
            )}
          >
            {isPending ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SORT HEADER
// ============================================================

function SortHeader({
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
  align?: "left" | "right" | "center";
}) {
  const active = current === sortKey;
  return (
    <th
      className={cn(
        "px-5 py-3 font-medium",
        align === "right" && "text-right",
        align === "center" && "text-center",
      )}
    >
      <button
        onClick={() => onSort(sortKey)}
        className={cn(
          "flex items-center gap-1 text-[11px] uppercase tracking-wide transition-colors hover:text-foreground",
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
// NEW ENTRY MODAL
// ============================================================

interface EntryForm {
  product_sku: string;
  trip_id: string;
  qty_purchased: string;
  qty_lost_seized: string;
  purchase_price_usd: string;
}

const DEFAULT_FORM: EntryForm = {
  product_sku: "",
  trip_id: "",
  qty_purchased: "",
  qty_lost_seized: "0",
  purchase_price_usd: "0",
};

const ENTRY_CAT_EMOJI: Record<string, string> = {
  PERF: "🦴", COSM: "💄", ELET: "📱", SUPL: "💊", VEST: "👗", OUTR: "📦",
};
const ENTRY_CAT_GRADIENT: Record<string, string> = {
  PERF: "from-violet-500 to-violet-900",
  COSM: "from-pink-500 to-pink-900",
  ELET: "from-blue-500 to-blue-900",
  SUPL: "from-emerald-500 to-emerald-900",
  VEST: "from-amber-500 to-amber-900",
  OUTR: "from-zinc-500 to-zinc-900",
};

function NewEntryModal({
  open,
  activeTrips,
  products,
  onClose,
}: {
  open: boolean;
  activeTrips: Trip[];
  products: ProductWithCategory[];
  onClose: () => void;
}) {
  // Debug: log data availability when modal opens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line no-console
      console.log("[NewEntryModal] Modal opened with data:", {
        activeTripsCount: activeTrips?.length ?? 0,
        productsCount: products?.length ?? 0,
        activeTrips: activeTrips?.map(t => ({ id: t.id, name: t.name, origin: t.origin, status: t.status })),
        firstFewProducts: products?.slice(0, 3).map(p => ({ sku: p.sku, name: p.name, category: p.categories?.name })),
      });
    }
  }, [open, activeTrips, products]);

  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<EntryForm>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<EntryForm>>({});
  const [productSearch, setProductSearch] = useState("");

  const selectedProduct = products.find((p) => p.sku === form.product_sku);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 8);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.brand ?? "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [products, productSearch]);

  function set<K extends keyof EntryForm>(key: K, value: EntryForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<EntryForm> = {};
    if (!form.product_sku) next.product_sku = "Selecione um produto";
    if (!form.trip_id) next.trip_id = "Selecione uma viagem";
    const qty = parseInt(form.qty_purchased);
    if (!form.qty_purchased || isNaN(qty) || qty <= 0)
      next.qty_purchased = "Quantidade inválida";
    const lost = parseInt(form.qty_lost_seized);
    if (isNaN(lost) || lost < 0) next.qty_lost_seized = "Valor inválido";
    if (!isNaN(qty) && !isNaN(lost) && lost > qty)
      next.qty_lost_seized = "Não pode ser maior que a quantidade recebida";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const fd = new FormData();
    fd.set("product_sku", form.product_sku);
    fd.set("trip_id", form.trip_id);
    fd.set("qty_purchased", form.qty_purchased);
    fd.set("qty_lost_seized", form.qty_lost_seized || "0");
    fd.set("purchase_price_usd", form.purchase_price_usd || "0");

    startTransition(async () => {
      const result = await createInventoryEntry(null, fd);
      if ("error" in result) {
        toast({ variant: "error", title: "Erro ao registrar entrada", description: result.error });
      } else {
        toast({ variant: "success", title: "Entrada registrada!", description: `SKU: ${result.sku}` });
        setForm(DEFAULT_FORM);
        setErrors({});
        setProductSearch("");
        onClose();
      }
    });
  }

  function handleClose() {
    setForm(DEFAULT_FORM);
    setErrors({});
    setProductSearch("");
    onClose();
  }

  if (!open) return null;

  const catCode = selectedProduct?.categories?.code ?? "OUTR";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 flex h-[calc(100vh-4rem)] w-full max-w-lg flex-col animate-fade-in overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-base font-semibold">Nova Entrada de Estoque</h2>
            <p className="text-xs text-muted-foreground">
              Selecione um produto cadastrado e configure o lote.
            </p>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Product Search / Selected */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Package size={11} /> Produto
            </label>
            {selectedProduct ? (
              <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl",
                  ENTRY_CAT_GRADIENT[catCode] ?? "from-zinc-500 to-zinc-900",
                )}>
                  {ENTRY_CAT_EMOJI[catCode] ?? "📦"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{selectedProduct.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {selectedProduct.sku}
                    {selectedProduct.brand && (
                      <span className="ml-2 font-sans text-muted-foreground/60">· {selectedProduct.brand}</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { set("product_sku", ""); setProductSearch(""); }}
                  className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar SKU, nome ou marca..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full rounded-xl border border-border bg-muted/50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
                  />
                </div>
                {products.length === 0 ? (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                    <p className="flex items-center gap-2 text-xs text-amber-500">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <strong>Nenhum produto cadastrado no ERP.</strong>
                    </p>
                    <p className="mt-1 text-[11px] text-amber-500/70">
                      Cadastre produtos em <span className="font-semibold">Produtos</span> antes de dar entrada no estoque.
                    </p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <p className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                    Nenhum produto encontrado.
                  </p>
                ) : (
                  <div className="space-y-1 rounded-xl border border-border bg-muted/10 p-1.5">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.sku}
                        type="button"
                        onClick={() => set("product_sku", p.sku)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted"
                      >
                        <div className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-base",
                          ENTRY_CAT_GRADIENT[p.categories?.code ?? "OUTR"] ?? "from-zinc-500 to-zinc-900",
                        )}>
                          {ENTRY_CAT_EMOJI[p.categories?.code ?? "OUTR"] ?? "📦"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {p.sku}
                            {p.brand && (
                              <span className="ml-2 font-sans text-muted-foreground/50">· {p.brand}</span>
                            )}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {errors.product_sku && (
              <p className="mt-1 text-[11px] text-destructive">{errors.product_sku}</p>
            )}
          </div>

          {/* Preço de compra USD */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Preço de Compra (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.purchase_price_usd}
                onChange={(e) => set("purchase_price_usd", e.target.value)}
                className="w-full rounded-lg border border-border bg-muted/50 py-2 pl-7 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary focus:bg-background"
              />
            </div>
          </div>

          {/* Viagem */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5"><Layers size={11} />Viagem de Origem</span>
            </label>
            {activeTrips.length === 0 ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <p className="flex items-center gap-2 text-xs text-amber-500">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <strong>Nenhuma viagem ativa disponível.</strong>
                </p>
                <p className="mt-1 text-[11px] text-amber-500/70">
                  Crie uma viagem em <span className="font-semibold">Viagens</span> ou verifique se as viagens existentes não estão consolidadas.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {activeTrips.map((trip) => (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => set("trip_id", trip.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-xs transition-colors",
                      form.trip_id === trip.id
                        ? "border-primary/50 bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <span className="font-medium">{trip.name}</span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                        trip.origin === "PY"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-blue-500/15 text-blue-400",
                      )}
                    >
                      {trip.origin}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {errors.trip_id && <p className="mt-1 text-[11px] text-destructive">{errors.trip_id}</p>}
          </div>

          {/* Quantidades */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Quantidade Recebida</label>
              <input
                type="number"
                min="1"
                placeholder="0"
                value={form.qty_purchased}
                onChange={(e) => set("qty_purchased", e.target.value)}
                className={cn(
                  "w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary focus:bg-background",
                  errors.qty_purchased ? "border-destructive" : "border-border",
                )}
              />
              {errors.qty_purchased && <p className="mt-1 text-[11px] text-destructive">{errors.qty_purchased}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Avariado / Perdido</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={form.qty_lost_seized}
                onChange={(e) => set("qty_lost_seized", e.target.value)}
                className={cn(
                  "w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary focus:bg-background",
                  errors.qty_lost_seized ? "border-destructive" : "border-border",
                )}
              />
              {errors.qty_lost_seized && <p className="mt-1 text-[11px] text-destructive">{errors.qty_lost_seized}</p>}
            </div>
          </div>

          {/* Preview */}
          {form.qty_purchased && !isNaN(parseInt(form.qty_purchased)) && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs">
              <span className="text-muted-foreground">Recebido:</span>
              <span className="font-semibold">{form.qty_purchased}</span>
              <span className="text-muted-foreground">—</span>
              <span className="text-muted-foreground">Perdido:</span>
              <span className="font-semibold text-destructive">{form.qty_lost_seized || "0"}</span>
              <span className="text-muted-foreground">=</span>
              <span className="ml-auto text-sm font-bold text-emerald-400">
                {Math.max(
                  0,
                  parseInt(form.qty_purchased || "0") - parseInt(form.qty_lost_seized || "0"),
                )}{" "}válidos
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-6 py-4">
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-semibold transition-opacity",
                isPending
                  ? "cursor-not-allowed bg-muted text-muted-foreground"
                  : "bg-foreground text-background hover:opacity-90",
              )}
            >
              {isPending ? "Registrando..." : "Registrar Entrada"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN CLIENT COMPONENT
// ============================================================

export function InventoryClient({
  initialRows,
  categories,
  activeTrips,
  products,
}: {
  initialRows: InventoryStockRow[];
  categories: Category[];
  activeTrips: Trip[];
  products: ProductWithCategory[];
}) {
  // Debug: log props received
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[InventoryClient] Props received:", {
      initialRowsCount: initialRows?.length ?? 0,
      categoriesCount: categories?.length ?? 0,
      activeTripsCount: activeTrips?.length ?? 0,
      productsCount: products?.length ?? 0,
      activeTripsDetails: activeTrips?.slice(0, 3).map(t => ({ id: t.id, name: t.name, origin: t.origin })),
      productsDetails: products?.slice(0, 3).map(p => ({ sku: p.sku, name: p.name })),
    });
  }, [initialRows, categories, activeTrips, products]);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [modalOpen, setModalOpen] = useState(false);


  const displayRows = useMemo(() => {
    let result = initialRows.filter((r) => {
      const matchSearch =
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.sku.toLowerCase().includes(search.toLowerCase()) ||
        (r.brand ?? "").toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCategory === "all" || r.category_id === filterCategory;
      return matchSearch && matchCat;
    });

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "sku") cmp = a.sku.localeCompare(b.sku);
      else if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "category") cmp = a.category_name.localeCompare(b.category_name);
      else if (sortKey === "qty_valid") cmp = a.qty_valid - b.qty_valid;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [initialRows, search, filterCategory, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const totalSKUs = initialRows.length;
  const totalUnits = initialRows.reduce((s, r) => s + r.qty_valid, 0);
  const zeroedOut = initialRows.filter((r) => r.qty_valid === 0).length;
  const lowStock = initialRows.filter((r) => r.qty_valid > 0 && r.qty_valid <= 3).length;

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Estoque</h1>
            <p className="text-sm text-muted-foreground">Catálogo operacional — nenhum dado financeiro exibido.</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            Nova Entrada
          </button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "SKUs Cadastrados", value: totalSKUs, icon: Package, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Unidades Válidas", value: totalUnits, icon: Boxes, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            {
              label: "Estoque Baixo (≤3)",
              value: lowStock,
              icon: Boxes,
              color: lowStock > 0 ? "text-amber-400" : "text-muted-foreground",
              bg: lowStock > 0 ? "bg-amber-500/10" : "bg-muted/30",
            },
            {
              label: "Zerados",
              value: zeroedOut,
              icon: Boxes,
              color: zeroedOut > 0 ? "text-destructive" : "text-muted-foreground",
              bg: zeroedOut > 0 ? "bg-destructive/10" : "bg-muted/30",
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl border border-border bg-card p-5">
                <div className={cn("mb-3 inline-flex rounded-lg p-2", s.bg)}>
                  <Icon size={15} className={s.color} />
                </div>
                <p className={cn("text-2xl font-semibold", s.color)}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar SKU, nome ou marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted/50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterCategory("all")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                filterCategory === "all"
                  ? "bg-foreground text-background"
                  : "border border-border text-muted-foreground hover:bg-muted",
              )}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(filterCategory === cat.id ? "all" : cat.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  filterCategory === cat.id
                    ? "bg-foreground text-background"
                    : "border border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Boxes size={15} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold">Catálogo de Estoque</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {displayRows.length} de {initialRows.length} itens
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <SortHeader label="SKU" sortKey="sku" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Nome do Produto" sortKey="name" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Categoria" sortKey="category" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Viagem de Origem
                  </th>
                  <SortHeader label="Estoque Válido" sortKey="qty_valid" current={sortKey} dir={sortDir} onSort={handleSort} align="right" />
                  <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row) => (
                  <tr
                    key={row.id}
                    className="group border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs text-muted-foreground">{row.sku}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium">{row.name}</p>
                      {row.brand && (
                        <p className="text-[11px] text-muted-foreground/60">{row.brand}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <CategoryBadge name={row.category_name} code={row.category_code} />
                    </td>
                    <td className="px-5 py-3.5">
                      {row.trip_name ? (
                        <span className="text-xs text-muted-foreground">{row.trip_name}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <StockIndicator qty={row.qty_valid} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <EditBatchButton row={row} />
                        <DeleteBatchButton row={row} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {displayRows.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Boxes size={32} className="text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">
                  {search || filterCategory !== "all"
                    ? "Nenhum item encontrado para este filtro."
                    : "Nenhum produto cadastrado."}
                </p>
                {!search && filterCategory === "all" && (
                  <button
                    onClick={() => setModalOpen(true)}
                    className="text-xs font-medium text-blue-400 hover:underline"
                  >
                    Registrar primeira entrada
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <NewEntryModal
        open={modalOpen}
        activeTrips={activeTrips}
        products={products}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
