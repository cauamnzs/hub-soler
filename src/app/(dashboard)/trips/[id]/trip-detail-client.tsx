"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  RefreshCw,
} from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { updateTripStatus, createExpense, updateTrip, deleteTrip, updateExpense, deleteExpense, getProducts, createBatch } from "../actions";
import { Pencil, Trash2, Settings2, Search, PackagePlus } from "lucide-react";
import type { ProductCatalogItem } from "../actions";
import type {
  Trip,
  TripExpense,
  TripStatus,
  ExpenseType,
  BatchWithProduct,
} from "@/types/database";

// ============================================================
// BLING SYNC BUTTON
// ============================================================

function BlingSyncButton({
  tripId,
  tripStatus,
  batches,
}: {
  tripId: string;
  tripStatus: TripStatus;
  batches: BatchWithProduct[];
}) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isPlanning = tripStatus === "planning";
  const productCount = batches.length;

  function handleSync() {
    startTransition(async () => {
      const batchIds = batches.map((b) => b.id);
      console.log("[Bling Sync] Simulação de sincronização iniciada", {
        tripId,
        batchIds,
        productCount,
      });
      toast({
        variant: "success",
        title: "Simulação de Sincronização iniciada",
        description: `${productCount} produtos seriam sincronizados com o Bling.`,
      });
      setIsOpen(false);
    });
  }

  return (
    <>
      <div className="relative group">
        <button
          onClick={() => setIsOpen(true)}
          disabled={isPlanning}
          className={
            isPlanning
              ? "flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-50 cursor-not-allowed"
              : "flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          }
        >
          <RefreshCw size={12} />
          Sincronizar com Bling
        </button>
        {isPlanning && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] text-background shadow-lg">
            Mude o status para Consolidada antes de sincronizar
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground"></div>
          </div>
        )}
      </div>

      {/* Modal de Confirmação */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md animate-fade-in rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-blue-500/15 p-2">
                <RefreshCw size={20} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Sincronizar com Bling</h3>
                <p className="text-xs text-muted-foreground">Confirme os dados antes de prosseguir</p>
              </div>
            </div>

            <div className="mb-6 rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-foreground">
                Isso enviará <strong>{productCount} produto(s)</strong> para o Bling e atualizará os estoques e preços.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Deseja continuar?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleSync}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "Sincronizando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

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
// EDIT TRIP MODAL
// ============================================================

interface EditTripForm {
  name: string;
  estimated_exchange_rate: string;
  final_exchange_rate: string;
  notes: string;
}

function EditTripModal({
  open,
  trip,
  onClose,
  onSuccess,
}: {
  open: boolean;
  trip: Trip;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<EditTripForm>({
    name: trip.name,
    estimated_exchange_rate: trip.estimated_exchange_rate.toString(),
    final_exchange_rate: trip.final_exchange_rate?.toString() || "",
    notes: trip.notes || "",
  });
  const [errors, setErrors] = useState<Partial<EditTripForm>>({});

  function validate(): boolean {
    const next: Partial<EditTripForm> = {};
    if (!form.name.trim()) next.name = "Nome obrigatório";
    const estRate = parseFloat(form.estimated_exchange_rate);
    if (isNaN(estRate) || estRate <= 0) next.estimated_exchange_rate = "Câmbio inválido";
    if (form.final_exchange_rate) {
      const finalRate = parseFloat(form.final_exchange_rate);
      if (isNaN(finalRate) || finalRate <= 0) next.final_exchange_rate = "Câmbio inválido";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const fd = new FormData();
    fd.set("name", form.name.trim());
    fd.set("estimated_exchange_rate", form.estimated_exchange_rate);
    if (form.final_exchange_rate) fd.set("final_exchange_rate", form.final_exchange_rate);
    else fd.set("final_exchange_rate", "");
    fd.set("notes", form.notes.trim());

    startTransition(async () => {
      const result = await updateTrip(trip.id, fd);
      if ("error" in result) {
        toast({ variant: "error", title: "Erro ao atualizar viagem", description: result.error });
      } else {
        toast({ variant: "success", title: "Viagem atualizada!", description: "As alterações foram salvas." });
        onSuccess();
        onClose();
      }
    });
  }

  function handleClose() {
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
            <h2 className="text-base font-semibold">Editar Viagem</h2>
            <p className="text-xs text-muted-foreground">
              Altere os dados da viagem e do câmbio.
            </p>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Nome da Viagem</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={cn(
                "w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm outline-none transition-colors",
                errors.name ? "border-destructive" : "border-border",
              )}
            />
            {errors.name && <p className="mt-1 text-[11px] text-destructive">{errors.name}</p>}
          </div>

          {/* Exchange Rates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Câmbio Estimado</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.estimated_exchange_rate}
                  onChange={(e) => setForm({ ...form, estimated_exchange_rate: e.target.value })}
                  className={cn(
                    "w-full rounded-lg border bg-muted/50 py-2 pl-9 pr-3 text-sm outline-none transition-colors",
                    errors.estimated_exchange_rate ? "border-destructive" : "border-border",
                  )}
                />
              </div>
              {errors.estimated_exchange_rate && <p className="mt-1 text-[11px] text-destructive">{errors.estimated_exchange_rate}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Câmbio Final</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.final_exchange_rate}
                  onChange={(e) => setForm({ ...form, final_exchange_rate: e.target.value })}
                  placeholder="Opcional"
                  className={cn(
                    "w-full rounded-lg border bg-muted/50 py-2 pl-9 pr-3 text-sm outline-none transition-colors",
                    errors.final_exchange_rate ? "border-destructive" : "border-border",
                  )}
                />
              </div>
              {errors.final_exchange_rate && <p className="mt-1 text-[11px] text-destructive">{errors.final_exchange_rate}</p>}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm outline-none transition-colors"
            />
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
            {isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DELETE TRIP MODAL
// ============================================================

function DeleteTripModal({
  open,
  tripName,
  onClose,
  onConfirm,
  isPending,
}: {
  open: boolean;
  tripName: string;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm animate-fade-in rounded-2xl border border-destructive/20 bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle size={20} className="text-destructive" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-destructive">Excluir Viagem</h2>
            <p className="text-xs text-muted-foreground">Esta ação não pode ser desfeita.</p>
          </div>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">
          Tem certeza que deseja excluir a viagem <strong className="text-foreground">{tripName}</strong>? 
          Todas as despesas e lotes vinculados serão removidos permanentemente.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-opacity",
              isPending
                ? "cursor-not-allowed bg-destructive/50 text-white"
                : "bg-destructive text-white hover:opacity-90",
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
// ADD BATCH MODAL — Combobox searchable para produtos
// ============================================================

interface BatchFormState {
  product_sku: string;
  qty_purchased: string;
  qty_lost_seized: string;
  purchase_price_usd: string;
}

const DEFAULT_BATCH_FORM: BatchFormState = {
  product_sku: "",
  qty_purchased: "",
  qty_lost_seized: "0",
  purchase_price_usd: "",
};

function AddBatchModal({
  open,
  tripId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  tripId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<BatchFormState>(DEFAULT_BATCH_FORM);
  const [errors, setErrors] = useState<Partial<BatchFormState>>({});
  
  // Combobox state
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductCatalogItem | null>(null);
  const [showProductList, setShowProductList] = useState(false);

  // Search products when searchTerm changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchTerm.trim().length >= 2 || searchTerm.trim() === "") {
        setIsSearching(true);
        getProducts(searchTerm.trim()).then((data) => {
          setProducts(data);
          setIsSearching(false);
        });
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  function validate(): boolean {
    const next: Partial<BatchFormState> = {};
    if (!form.product_sku) next.product_sku = "Selecione um produto";
    if (!form.qty_purchased || parseInt(form.qty_purchased) <= 0) next.qty_purchased = "Quantidade inválida";
    if (!form.purchase_price_usd || parseFloat(form.purchase_price_usd) <= 0) next.purchase_price_usd = "Preço inválido";
    const lost = parseInt(form.qty_lost_seized) || 0;
    const purchased = parseInt(form.qty_purchased) || 0;
    if (lost > purchased) next.qty_lost_seized = "Não pode ser maior que a quantidade comprada";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSelectProduct(product: ProductCatalogItem) {
    setSelectedProduct(product);
    setForm({ ...form, product_sku: product.sku });
    setSearchTerm(`${product.name} (${product.sku})`);
    setShowProductList(false);
    setErrors({ ...errors, product_sku: undefined });
  }

  function handleSubmit() {
    if (!validate()) return;
    const fd = new FormData();
    fd.set("trip_id", tripId);
    fd.set("product_sku", form.product_sku);
    fd.set("qty_purchased", form.qty_purchased);
    fd.set("qty_lost_seized", form.qty_lost_seized);
    fd.set("purchase_price_usd", form.purchase_price_usd);

    startTransition(async () => {
      const result = await createBatch(null, fd);
      if ("error" in result) {
        toast({ variant: "error", title: "Erro ao criar lote", description: result.error });
      } else {
        toast({ variant: "success", title: "Lote criado!", description: "Produto vinculado à viagem." });
        setForm(DEFAULT_BATCH_FORM);
        setSelectedProduct(null);
        setSearchTerm("");
        onSuccess();
        onClose();
      }
    });
  }

  function handleClose() {
    setForm(DEFAULT_BATCH_FORM);
    setSelectedProduct(null);
    setSearchTerm("");
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
            <h2 className="text-base font-semibold">Novo Lote de Produtos</h2>
            <p className="text-xs text-muted-foreground">
              Vincule um produto do catálogo a esta viagem.
            </p>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Product Combobox */}
          <div className="relative">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Produto <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowProductList(true);
                  if (selectedProduct && e.target.value !== `${selectedProduct.name} (${selectedProduct.sku})`) {
                    setSelectedProduct(null);
                    setForm({ ...form, product_sku: "" });
                  }
                }}
                onFocus={() => setShowProductList(true)}
                placeholder="Buscar por nome, SKU ou marca..."
                className={cn(
                  "w-full rounded-lg border bg-muted/50 py-2 pl-9 pr-3 text-sm outline-none transition-colors",
                  errors.product_sku ? "border-destructive" : "border-border",
                )}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-3 w-3 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
                </div>
              )}
            </div>
            
            {errors.product_sku && <p className="mt-1 text-[11px] text-destructive">{errors.product_sku}</p>}

            {/* Product List Dropdown */}
            {showProductList && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowProductList(false)} 
                />
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                  <div className="max-h-60 overflow-auto py-1">
                    {products.length === 0 ? (
                      <div className="px-3 py-4 text-center">
                        <p className="text-xs text-muted-foreground">Nenhum produto encontrado</p>
                        <Link
                          href="/products"
                          onClick={() => setShowProductList(false)}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
                        >
                          <PackagePlus size={12} />
                          Cadastrar Novo Produto
                        </Link>
                      </div>
                    ) : (
                      products.map((product) => (
                        <button
                          key={product.sku}
                          type="button"
                          onClick={() => handleSelectProduct(product)}
                          className="w-full px-3 py-2 text-left hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{product.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {product.brand} • {product.model} • {product.variant}
                              </p>
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground/60">
                              {product.sku}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  {products.length > 0 && (
                    <div className="border-t border-border px-3 py-2">
                      <Link
                        href="/products"
                        onClick={() => setShowProductList(false)}
                        className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        <PackagePlus size={12} />
                        Cadastrar produto não listado
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Quantities */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Qtd. Comprada <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={form.qty_purchased}
                onChange={(e) => setForm({ ...form, qty_purchased: e.target.value })}
                className={cn(
                  "w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm outline-none transition-colors",
                  errors.qty_purchased ? "border-destructive" : "border-border",
                )}
              />
              {errors.qty_purchased && <p className="mt-1 text-[11px] text-destructive">{errors.qty_purchased}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Qtd. Avariada/Apreendida
              </label>
              <input
                type="number"
                min="0"
                value={form.qty_lost_seized}
                onChange={(e) => setForm({ ...form, qty_lost_seized: e.target.value })}
                className={cn(
                  "w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm outline-none transition-colors",
                  errors.qty_lost_seized ? "border-destructive" : "border-border",
                )}
              />
              {errors.qty_lost_seized && <p className="mt-1 text-[11px] text-destructive">{errors.qty_lost_seized}</p>}
            </div>
          </div>

          {/* Purchase Price */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Preço de Compra (USD) <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.purchase_price_usd}
                onChange={(e) => setForm({ ...form, purchase_price_usd: e.target.value })}
                className={cn(
                  "w-full rounded-lg border bg-muted/50 py-2 pl-9 pr-3 text-sm outline-none transition-colors",
                  errors.purchase_price_usd ? "border-destructive" : "border-border",
                )}
              />
            </div>
            {errors.purchase_price_usd && <p className="mt-1 text-[11px] text-destructive">{errors.purchase_price_usd}</p>}
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
            onClick={handleSubmit}
            disabled={isPending}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-opacity",
              isPending
                ? "cursor-not-allowed bg-muted text-muted-foreground"
                : "bg-foreground text-background hover:opacity-90",
            )}
          >
            {isPending ? "Criando..." : "Criar Lote"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditExpenseModal({
  open,
  expense,
  onClose,
  onSuccess,
}: {
  open: boolean;
  expense: TripExpense | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<ExpenseForm>({
    description: expense?.description || "",
    amount_brl: expense ? (expense.amount_brl / 100).toFixed(2) : "",
    expense_type: expense?.expense_type || "outros",
  });
  const [errors, setErrors] = useState<Partial<ExpenseForm>>({});

  // Reset form when expense changes
  useEffect(() => {
    if (expense) {
      setForm({
        description: expense.description || "",
        amount_brl: expense.amount_brl.toString(),
        expense_type: expense.expense_type,
      });
    }
  }, [expense]);

  function validate(): boolean {
    const next: Partial<ExpenseForm> = {};
    const val = parseFloat(form.amount_brl);
    if (!form.amount_brl || isNaN(val) || val <= 0) next.amount_brl = "Valor inválido";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave() {
    if (!expense || !validate()) return;
    const fd = new FormData();
    fd.set("trip_id", expense.trip_id);
    fd.set("description", form.description.trim());
    fd.set("expense_type", form.expense_type);
    fd.set("amount_brl", form.amount_brl);

    startTransition(async () => {
      const result = await updateExpense(expense.id, fd);
      if ("error" in result) {
        toast({ variant: "error", title: "Erro ao atualizar despesa", description: result.error });
      } else {
        toast({ variant: "success", title: "Despesa atualizada!", description: "Custos recalculados automaticamente." });
        onSuccess();
        onClose();
      }
    });
  }

  function handleClose() {
    setErrors({});
    onClose();
  }

  if (!open || !expense) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md animate-fade-in rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Editar Despesa</h2>
            <p className="text-xs text-muted-foreground">
              Altere os dados da despesa. O rateio será recalculado.
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
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm outline-none transition-colors"
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
                value={form.amount_brl}
                onChange={(e) => setForm({ ...form, amount_brl: e.target.value })}
                className={cn(
                  "w-full rounded-lg border bg-muted/50 py-2 pl-9 pr-3 text-sm outline-none transition-colors",
                  errors.amount_brl ? "border-destructive" : "border-border",
                )}
              />
            </div>
            {errors.amount_brl && <p className="mt-1 text-[11px] text-destructive">{errors.amount_brl}</p>}
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
            {isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// MAIN CLIENT COMPONENT
// ============================================================

export function TripDetailClient({
  trip: initialTrip,
  expenses: initialExpenses,
  batches: initialBatches,
}: {
  trip: Trip;
  expenses: TripExpense[];
  batches: BatchWithProduct[];
}) {
  const [trip, setTrip] = useState<Trip>(initialTrip);
  const [expenses, setExpenses] = useState<TripExpense[]>(initialExpenses);
  const [batches] = useState<BatchWithProduct[]>(initialBatches);
  
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editTripModalOpen, setEditTripModalOpen] = useState(false);
  const [deleteTripModalOpen, setDeleteTripModalOpen] = useState(false);
  const [editExpenseModalOpen, setEditExpenseModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<TripExpense | null>(null);
  const [isDeletingTrip, startDeleteTransition] = useTransition();
  const [isDeletingExpense, startDeleteExpenseTransition] = useTransition();
  
  const { toast } = useToast();
  const router = useRouter();

  const exchangeRate = trip.final_exchange_rate ?? trip.estimated_exchange_rate;

  // Financial summary — computed from DB values
  const totalExpensesBRL = expenses.reduce((s, e) => s + e.amount_brl, 0);
  const totalProductsBRL = batches.reduce(
    (s, b) => s + b.purchase_price_usd * b.qty_purchased * exchangeRate,
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

  // Handlers
  function handleDeleteTrip() {
    startDeleteTransition(async () => {
      const result = await deleteTrip(trip.id);
      if ("error" in result) {
        toast({ variant: "error", title: "Erro ao excluir", description: result.error });
      } else {
        toast({ variant: "success", title: "Viagem excluída!" });
        router.push("/trips");
      }
    });
  }

  function handleDeleteExpense(expenseId: string) {
    startDeleteExpenseTransition(async () => {
      const result = await deleteExpense(expenseId, trip.id);
      if ("error" in result) {
        toast({ variant: "error", title: "Erro ao excluir", description: result.error });
      } else {
        toast({ variant: "success", title: "Despesa removida!", description: "Custos recalculados." });
        setExpenses(expenses.filter((e) => e.id !== expenseId));
      }
    });
  }

  function handleEditExpense(expense: TripExpense) {
    setSelectedExpense(expense);
    setEditExpenseModalOpen(true);
  }

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
            
            {/* Bling Sync + Edit/Delete buttons */}
            <div className="ml-auto flex items-center gap-2">
              <BlingSyncButton
                tripId={trip.id}
                tripStatus={trip.status}
                batches={batches}
              />
              <button
                onClick={() => setEditTripModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                <Settings2 size={12} />
                Editar
              </button>
              <button
                onClick={() => setDeleteTripModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={12} />
                Excluir
              </button>
            </div>
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
                    <div key={exp.id} className="flex items-center gap-3 px-5 py-3.5 group">
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
                      
                      {/* Edit/Delete icons */}
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => handleEditExpense(exp)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Editar despesa"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          disabled={isDeletingExpense}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          title="Excluir despesa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
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

      <EditTripModal
        open={editTripModalOpen}
        trip={trip}
        onClose={() => setEditTripModalOpen(false)}
        onSuccess={() => {
          // Refresh trip data from server
          window.location.reload();
        }}
      />

      <DeleteTripModal
        open={deleteTripModalOpen}
        tripName={trip.name}
        onClose={() => setDeleteTripModalOpen(false)}
        onConfirm={handleDeleteTrip}
        isPending={isDeletingTrip}
      />

      <EditExpenseModal
        open={editExpenseModalOpen}
        expense={selectedExpense}
        onClose={() => {
          setEditExpenseModalOpen(false);
          setSelectedExpense(null);
        }}
        onSuccess={() => {
          // Refresh expenses from server
          window.location.reload();
        }}
      />
    </>
  );
}
