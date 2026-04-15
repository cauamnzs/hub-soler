"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Package,
  Plus,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Tag,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { buildSkuPreview } from "@/lib/sku";
import { useToast } from "@/components/ui/toast";
import { createProduct, toggleProductActive } from "./actions";
import type { ProductWithCategory, Category } from "@/types/database";

// ============================================================
// CONSTANTS
// ============================================================

const CATEGORY_EMOJI: Record<string, string> = {
  PERF: "🧴",
  COSM: "💄",
  ELET: "📱",
  SUPL: "💊",
  VEST: "👕",
  OUTR: "📦",
};

const AVATAR_GRADIENT: Record<string, string> = {
  PERF: "from-violet-600 to-purple-900",
  COSM: "from-rose-500 to-pink-900",
  ELET: "from-blue-500 to-indigo-900",
  SUPL: "from-emerald-500 to-teal-900",
  VEST: "from-amber-500 to-orange-800",
  OUTR: "from-zinc-500 to-zinc-800",
};

const CATEGORY_BADGE: Record<string, string> = {
  PERF: "bg-violet-500/15 text-violet-400",
  COSM: "bg-pink-500/15 text-pink-400",
  ELET: "bg-blue-500/15 text-blue-400",
  SUPL: "bg-emerald-500/15 text-emerald-400",
  VEST: "bg-amber-500/15 text-amber-400",
  OUTR: "bg-muted text-muted-foreground",
};

// ============================================================
// BADGE / CELL COMPONENTS
// ============================================================

function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        CATEGORY_BADGE[category.code] ?? "bg-muted text-muted-foreground",
      )}
    >
      {category.name}
    </span>
  );
}

function MarkupBar({ value }: { value: number }) {
  const pct = Math.min(100, value);
  const color =
    value >= 55 ? "bg-emerald-500" : value >= 40 ? "bg-blue-500" : "bg-amber-500";
  const textColor =
    value >= 55 ? "text-emerald-400" : value >= 40 ? "text-blue-400" : "text-amber-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn("w-9 text-right text-sm font-semibold tabular-nums", textColor)}>
        {value}%
      </span>
    </div>
  );
}

// ============================================================
// SORT HEADER
// ============================================================

type SortKey = "sku" | "name" | "category" | "base_markup" | "created_at";
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
// NEW PRODUCT MODAL
// ============================================================

interface ProductForm {
  name: string;
  brand: string;
  category_id: string;
  model: string;
  variant: string;
  base_markup: string;
  weight_kg: string;
}

const DEFAULT_FORM: ProductForm = {
  name: "",
  brand: "",
  category_id: "",
  model: "",
  variant: "",
  base_markup: "45",
  weight_kg: "",
};

function NewProductModal({
  open,
  categories,
  existingSkus,
  onClose,
  onCreated,
}: {
  open: boolean;
  categories: Category[];
  existingSkus: Set<string>;
  onClose: () => void;
  onCreated: (sku: string) => void;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<ProductForm>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<ProductForm>>({});

  const selectedCat = categories.find((c) => c.id === form.category_id);
  const skuPreview = buildSkuPreview(
    selectedCat?.code ?? "",
    form.model,
    form.variant,
  );
  const skuComplete = !skuPreview.includes("?");
  const skuCollision = skuComplete && existingSkus.has(skuPreview);

  function set<K extends keyof ProductForm>(key: K, val: ProductForm[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<ProductForm> = {};
    if (!form.name.trim()) next.name = "Nome obrigatório";
    if (!form.category_id) next.category_id = "Selecione uma categoria";
    if (!form.model.trim()) next.model = "Modelo obrigatório";
    if (!form.variant.trim()) next.variant = "Variante obrigatória";
    const markup = parseFloat(form.base_markup);
    if (!form.base_markup || isNaN(markup) || markup < 1 || markup > 999)
      next.base_markup = "Markup inválido (1–999%)";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave() {
    if (!validate() || skuCollision) return;

    const fd = new FormData();
    fd.set("name", form.name.trim());
    fd.set("brand", form.brand.trim());
    fd.set("category_id", form.category_id);
    fd.set("model", form.model.trim());
    fd.set("variant", form.variant.trim());
    fd.set("base_markup", form.base_markup);
    if (form.weight_kg) fd.set("weight_kg", form.weight_kg);

    startTransition(async () => {
      const result = await createProduct(null, fd);
      if ("error" in result) {
        toast({ variant: "error", title: "Erro ao cadastrar", description: result.error });
      } else {
        toast({
          variant: "success",
          title: "Produto cadastrado!",
          description: `SKU gerado: ${result.sku}`,
        });
        onCreated(result.sku);
        setForm(DEFAULT_FORM);
        setErrors({});
        onClose();
      }
    });
  }

  function handleClose() {
    setForm(DEFAULT_FORM);
    setErrors({});
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 flex h-[calc(100vh-3rem)] w-full max-w-lg animate-fade-in flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">

        {/* Header + SKU Preview */}
        <div className="shrink-0 border-b border-border px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold">Novo Produto</h2>
              <p className="text-xs text-muted-foreground">
                Cadastro no catálogo mestre — SKU gerado automaticamente.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          <div
            className={cn(
              "mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
              skuCollision
                ? "border-destructive/40 bg-destructive/5"
                : skuComplete
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border bg-muted/30",
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl",
                selectedCat
                  ? (AVATAR_GRADIENT[selectedCat.code] ?? "from-zinc-500 to-zinc-800")
                  : "from-zinc-600 to-zinc-900",
              )}
            >
              {selectedCat ? (CATEGORY_EMOJI[selectedCat.code] ?? "📦") : "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                SKU Gerado
              </p>
              <p
                className={cn(
                  "font-mono text-lg font-black tracking-wider",
                  skuCollision
                    ? "text-destructive"
                    : skuComplete
                      ? "text-emerald-400"
                      : "text-muted-foreground/40",
                )}
              >
                {skuPreview}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                skuCollision
                  ? "bg-destructive/20 text-destructive"
                  : skuComplete
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {skuCollision ? "Duplicado" : skuComplete ? "Válido" : "Incompleto"}
            </span>
          </div>
          {skuCollision && (
            <p className="mt-1.5 text-[11px] text-destructive">
              Este SKU já existe. Altere Modelo ou Variante.
            </p>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">

          {/* Categoria */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Tag size={11} /> Categoria
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => {
                const isSelected = form.category_id === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => set("category_id", cat.id)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors",
                      isSelected
                        ? cn("border-transparent", CATEGORY_BADGE[cat.code] ?? "bg-muted text-muted-foreground")
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <span className="text-base">{CATEGORY_EMOJI[cat.code] ?? "📦"}</span>
                    <span>
                      {cat.name}
                      <span className="ml-1 font-mono opacity-40">[{cat.code}]</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.category_id && (
              <p className="mt-1 text-[11px] text-destructive">{errors.category_id}</p>
            )}
          </div>

          {/* Nome + Marca + Peso */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Nome do Produto
              </label>
              <input
                type="text"
                placeholder="ex: Dior Sauvage EDP"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={cn(
                  "w-full rounded-xl border bg-muted/50 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary focus:bg-background",
                  errors.name ? "border-destructive" : "border-border",
                )}
              />
              {errors.name && (
                <p className="mt-1 text-[11px] text-destructive">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Marca <span className="text-muted-foreground/50">(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="ex: Dior"
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary focus:bg-background"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Peso (kg) <span className="text-muted-foreground/50">(opcional)</span>
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                placeholder="0.350"
                value={form.weight_kg}
                onChange={(e) => set("weight_kg", e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary focus:bg-background"
              />
            </div>
          </div>

          {/* Modelo + Variante */}
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Composição do SKU
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Modelo{" "}
                  <span className="font-mono text-[10px] text-primary/70">→ 4 chars</span>
                </label>
                <input
                  type="text"
                  placeholder="ex: Sauvage"
                  value={form.model}
                  maxLength={20}
                  onChange={(e) => set("model", e.target.value)}
                  className={cn(
                    "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary",
                    errors.model ? "border-destructive" : "border-border",
                  )}
                />
                {errors.model && (
                  <p className="mt-1 text-[11px] text-destructive">{errors.model}</p>
                )}
                {form.model && (
                  <p className="mt-1 font-mono text-[10px] text-primary/70">
                    → {form.model.toUpperCase().replace(/\s+/g, "").slice(0, 4).padEnd(4, "?")}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Variante{" "}
                  <span className="font-mono text-[10px] text-primary/70">→ 3 chars</span>
                </label>
                <input
                  type="text"
                  placeholder="ex: 60ml, 100G"
                  value={form.variant}
                  maxLength={20}
                  onChange={(e) => set("variant", e.target.value)}
                  className={cn(
                    "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary",
                    errors.variant ? "border-destructive" : "border-border",
                  )}
                />
                {errors.variant && (
                  <p className="mt-1 text-[11px] text-destructive">{errors.variant}</p>
                )}
                {form.variant && (
                  <p className="mt-1 font-mono text-[10px] text-primary/70">
                    →{" "}
                    {form.variant
                      .toUpperCase()
                      .replace(/\s+/g, "")
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 3)
                      .padEnd(3, "?")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Base Markup */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Margem Padrão (Base Markup %)
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="999"
                  value={form.base_markup}
                  onChange={(e) => set("base_markup", e.target.value)}
                  className={cn(
                    "w-full rounded-xl border bg-muted/50 py-2 pl-3 pr-10 text-sm outline-none transition-colors focus:border-primary focus:bg-background",
                    errors.base_markup ? "border-destructive" : "border-border",
                  )}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
              <div className="flex gap-1">
                {[30, 45, 60, 80].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => set("base_markup", String(preset))}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                      form.base_markup === String(preset)
                        ? "bg-foreground text-background"
                        : "border border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
            {errors.base_markup && (
              <p className="mt-1 text-[11px] text-destructive">{errors.base_markup}</p>
            )}
            {form.base_markup && !isNaN(parseFloat(form.base_markup)) && (
              <div className="mt-2">
                <MarkupBar value={parseFloat(form.base_markup)} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-6 py-4">
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={skuCollision || isPending}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-opacity",
                skuCollision || isPending
                  ? "cursor-not-allowed bg-muted text-muted-foreground"
                  : "bg-foreground text-background hover:opacity-90",
              )}
            >
              {isPending ? "Cadastrando..." : "Cadastrar Produto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TOGGLE ACTIVE BUTTON (inline in table)
// ============================================================

function ToggleActiveButton({ sku, isActive }: { sku: string; isActive: boolean }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleProductActive(sku, isActive);
      if ("error" in result) {
        toast({ variant: "error", title: "Erro", description: result.error });
      }
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        "rounded-full p-1 transition-colors",
        isPending ? "opacity-50" : "hover:bg-muted",
      )}
      title={isActive ? "Desativar produto" : "Ativar produto"}
    >
      {isActive ? (
        <ToggleRight size={22} className="text-emerald-400" />
      ) : (
        <ToggleLeft size={22} className="text-muted-foreground" />
      )}
    </button>
  );
}

// ============================================================
// MAIN CLIENT COMPONENT
// ============================================================

export function ProductsClient({
  initialProducts,
  categories,
}: {
  initialProducts: ProductWithCategory[];
  categories: Category[];
}) {
  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [modalOpen, setModalOpen] = useState(false);

  const existingSkus = useMemo(
    () => new Set(initialProducts.map((p) => p.sku)),
    [initialProducts],
  );

  const displayRows = useMemo(() => {
    let rows = initialProducts.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.brand ?? "").toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q);
      const matchCat = filterCat === "all" || p.category_id === filterCat;
      const matchActive =
        filterActive === "all" ||
        (filterActive === "active" && p.is_active) ||
        (filterActive === "inactive" && !p.is_active);
      return matchSearch && matchCat && matchActive;
    });

    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "sku") cmp = a.sku.localeCompare(b.sku);
      else if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "category") {
        const ca = a.categories?.name ?? "";
        const cb = b.categories?.name ?? "";
        cmp = ca.localeCompare(cb);
      } else if (sortKey === "base_markup") cmp = a.base_markup - b.base_markup;
      else if (sortKey === "created_at")
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [initialProducts, search, filterCat, filterActive, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const totalProducts = initialProducts.length;
  const activeProducts = initialProducts.filter((p) => p.is_active).length;
  const avgMarkup =
    totalProducts > 0
      ? initialProducts.reduce((s, p) => s + p.base_markup, 0) / totalProducts
      : 0;

  const topCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    initialProducts.forEach((p) => {
      counts[p.category_id] = (counts[p.category_id] ?? 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? { name: categoryById[top[0]]?.name ?? "—", count: top[1] } : null;
  }, [initialProducts, categoryById]);

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">

        {/* Page header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Catálogo de Produtos</h1>
            <p className="text-sm text-muted-foreground">
              Entidade mestre — Nome, Categoria e Margem Padrão. Estoque físico em{" "}
              <span className="text-blue-400">Inventário</span>.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            Novo Produto
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: "Total de SKUs",
              value: totalProducts,
              sub: "no catálogo mestre",
              color: "text-foreground",
              bg: "bg-muted/40",
              icon: Package,
            },
            {
              label: "Ativos",
              value: activeProducts,
              sub: `${totalProducts - activeProducts} inativos`,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10",
              icon: ToggleRight,
            },
            {
              label: "Markup Médio",
              value: `${avgMarkup.toFixed(1)}%`,
              sub: "margem padrão do catálogo",
              color: "text-blue-400",
              bg: "bg-blue-500/10",
              icon: Tag,
            },
            {
              label: "Categoria Top",
              value: topCategory?.name ?? "—",
              sub: topCategory ? `${topCategory.count} produtos` : "—",
              color: "text-violet-400",
              bg: "bg-violet-500/10",
              icon: Package,
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

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Buscar SKU, nome, marca..."
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

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterCat("all")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                filterCat === "all"
                  ? "bg-foreground text-background"
                  : "border border-border text-muted-foreground hover:bg-muted",
              )}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCat(filterCat === cat.id ? "all" : cat.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  filterCat === cat.id
                    ? "bg-foreground text-background"
                    : "border border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {CATEGORY_EMOJI[cat.code]} {cat.name}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1 rounded-lg border border-border p-0.5">
            {(["all", "active", "inactive"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setFilterActive(v)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  filterActive === v
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v === "all" ? "Todos" : v === "active" ? "Ativos" : "Inativos"}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Package size={15} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold">Catálogo Mestre</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {displayRows.length} de {totalProducts} produtos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="w-12 px-5 py-3" />
                  <SortTh label="SKU" sortKey="sku" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Nome do Produto" sortKey="name" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Categoria" sortKey="category" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Markup" sortKey="base_markup" current={sortKey} dir={sortDir} onSort={handleSort} align="right" />
                  <SortTh label="Cadastrado" sortKey="created_at" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((product) => {
                  const category = product.categories ?? categoryById[product.category_id];
                  return (
                    <tr
                      key={product.sku}
                      className={cn(
                        "group border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors",
                        !product.is_active && "opacity-50",
                      )}
                    >
                      <td className="px-5 py-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg",
                            category ? (AVATAR_GRADIENT[category.code] ?? "from-zinc-500 to-zinc-800") : "from-zinc-500 to-zinc-800",
                          )}
                        >
                          {category ? (CATEGORY_EMOJI[category.code] ?? "📦") : "📦"}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          {product.sku}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium">{product.name}</p>
                        {product.brand && (
                          <p className="text-[11px] text-muted-foreground/60">
                            {product.brand}
                            {product.variant && ` · ${product.variant}`}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {category && <CategoryBadge category={category} />}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <MarkupBar value={product.base_markup} />
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {formatDate(product.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <ToggleActiveButton sku={product.sku} isActive={product.is_active} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {displayRows.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Package size={32} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <NewProductModal
        open={modalOpen}
        categories={categories}
        existingSkus={existingSkus}
        onClose={() => setModalOpen(false)}
        onCreated={() => setModalOpen(false)}
      />
    </>
  );
}
