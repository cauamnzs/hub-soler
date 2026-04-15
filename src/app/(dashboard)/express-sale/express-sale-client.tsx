"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  X,
  Minus,
  Plus,
  Zap,
  Package,
  CheckCircle2,
  Clock,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { createExpressSale } from "./actions";
import type { InventoryStockRow } from "@/types/database";

// ============================================================
// TYPES
// ============================================================

interface CatalogItem {
  batch_id: string;
  sku: string;
  name: string;
  brand: string | null;
  category_name: string;
  category_code: string;
  qty_valid: number;
}

interface SaleRecord {
  id: string;
  product_name: string;
  sku: string;
  qty: number;
  price_brl: number;
  sold_at: string;
}

// ============================================================
// HELPERS
// ============================================================

const CATEGORY_EMOJI: Record<string, string> = {
  PERF: "🧴",
  COSM: "💄",
  ELET: "📱",
  SUPL: "💊",
  VEST: "👕",
  OUTR: "📦",
};

function skuToGradient(sku: string): string {
  const gradients = [
    "from-violet-600 to-purple-900",
    "from-blue-600 to-indigo-900",
    "from-rose-600 to-pink-900",
    "from-emerald-600 to-teal-900",
    "from-amber-500 to-orange-800",
    "from-cyan-500 to-blue-800",
  ];
  const idx =
    sku.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % gradients.length;
  return gradients[idx];
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-amber-400/30 text-amber-300 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

// ============================================================
// MAIN CLIENT COMPONENT
// ============================================================

export function ExpressSaleClient({
  catalogRows,
}: {
  catalogRows: InventoryStockRow[];
}) {
  const { toast } = useToast();

  // Aggregate by SKU (FIFO — first batch_id per SKU)
  const catalog = useMemo((): CatalogItem[] => {
    const bysku = new Map<string, CatalogItem>();
    for (const row of catalogRows) {
      const existing = bysku.get(row.sku);
      if (existing) {
        existing.qty_valid += row.qty_valid;
      } else {
        bysku.set(row.sku, {
          batch_id: row.id,
          sku: row.sku,
          name: row.name,
          brand: row.brand,
          category_name: row.category_name,
          category_code: row.category_code,
          qty_valid: row.qty_valid,
        });
      }
    }
    return Array.from(bysku.values());
  }, [catalogRows]);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [qty, setQty] = useState(1);
  const [salePrice, setSalePrice] = useState("");
  const [priceError, setPriceError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [salesLog, setSalesLog] = useState<SaleRecord[]>([]);

  const searchRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog.filter((c) => c.qty_valid > 0);
    return catalog.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.sku.toLowerCase().includes(q) ||
        (c.brand ?? "").toLowerCase().includes(q),
    );
  }, [query, catalog]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Enter" && selected && salePrice && !confirming) {
        handleConfirm();
      }
      if (e.key === "Escape") {
        if (searchOpen) {
          setSearchOpen(false);
          setQuery("");
        } else {
          clearSelection();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, salePrice, confirming, searchOpen]);

  function selectItem(item: CatalogItem) {
    setSelected(item);
    setQty(1);
    setSalePrice("");
    setPriceError("");
    setQuery("");
    setSearchOpen(false);
  }

  function clearSelection() {
    setSelected(null);
    setQty(1);
    setSalePrice("");
    setPriceError("");
  }

  const handleConfirm = useCallback(async () => {
    if (!selected) return;

    const price = parseFloat(salePrice.replace(",", "."));
    if (!salePrice || isNaN(price) || price <= 0) {
      setPriceError("Informe o valor de venda");
      return;
    }
    if (qty > selected.qty_valid) {
      toast({
        variant: "error",
        title: "Estoque insuficiente",
        description: `Disponível: ${selected.qty_valid} unidade(s) de ${selected.name}.`,
      });
      return;
    }

    setConfirming(true);

    try {
      // 1. Call Bling sync API
      const res = await fetch("/api/bling/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: selected.sku,
          name: selected.name,
          final_selling_price: price,
          valid_stock: Math.max(0, selected.qty_valid - qty),
          action: "stock_deduct",
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        mocked?: boolean;
        error?: string;
      };

      if (!res.ok) {
        toast({
          variant: "error",
          title: "Falha na sincronização",
          description: data.error ?? `Bling retornou HTTP ${res.status}.`,
        });
        return;
      }

      // 2. Persist sale in express_sales table
      const fd = new FormData();
      fd.set("batch_id", selected.batch_id);
      fd.set("qty_sold", String(qty));
      fd.set("sale_price_brl", String(price));
      const saleResult = await createExpressSale(null, fd);

      if ("error" in saleResult) {
        toast({
          variant: "error",
          title: "Venda não registrada no banco",
          description: saleResult.error,
        });
        return;
      }

      const record: SaleRecord = {
        id: saleResult.id,
        product_name: selected.name,
        sku: selected.sku,
        qty,
        price_brl: price,
        sold_at: new Date().toISOString(),
      };
      setSalesLog((prev) => [record, ...prev]);

      toast({
        variant: "success",
        title: "Saída registrada com sucesso!",
        description: `${qty}× ${selected.name} deduzido do Hub.${data.mocked ? " (Bling: modo simulado)" : " Bling V3 sincronizado."}`,
      });

      clearSelection();
      searchRef.current?.focus();
    } catch {
      toast({
        variant: "error",
        title: "Erro de conexão",
        description: "Não foi possível alcançar a API. Tente novamente.",
      });
    } finally {
      setConfirming(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, qty, salePrice, toast]);

  const totalSoldToday = salesLog.reduce((s, r) => s + r.qty * r.price_brl, 0);

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
          <Zap size={11} className="fill-current" />
          Venda Express — PDV WhatsApp / Instagram
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Registrar Saída</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Busque o produto, informe o valor e confirme em segundos.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl border-2 bg-card px-5 py-4 shadow-lg transition-colors",
            searchOpen || !selected
              ? "border-primary/50 shadow-primary/10"
              : "border-border",
          )}
        >
          <Search
            size={22}
            className={cn(
              "shrink-0 transition-colors",
              searchOpen ? "text-foreground" : "text-muted-foreground",
            )}
          />
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar por nome, SKU ou marca...  ⌘K"
            value={query}
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
              if (selected) clearSelection();
            }}
            className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground/40"
          />
          {(query || selected) && (
            <button
              onClick={() => {
                setQuery("");
                clearSelection();
                searchRef.current?.focus();
              }}
              className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Results dropdown */}
        {searchOpen && query.trim() && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setSearchOpen(false)} />
            <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
              {results.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Package size={24} className="text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
                </div>
              ) : (
                <ul>
                  {results.map((item) => {
                    const emoji = CATEGORY_EMOJI[item.category_code] ?? "📦";
                    const outOfStock = item.qty_valid === 0;
                    return (
                      <li key={item.sku}>
                        <button
                          onClick={() => !outOfStock && selectItem(item)}
                          disabled={outOfStock}
                          className={cn(
                            "flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors",
                            outOfStock
                              ? "cursor-not-allowed opacity-40"
                              : "hover:bg-muted",
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl",
                              skuToGradient(item.sku),
                            )}
                          >
                            {emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {highlight(item.name, query)}
                            </p>
                            <p className="font-mono text-[11px] text-muted-foreground/70">
                              {highlight(item.sku, query)}
                              {item.brand && (
                                <span className="ml-2 font-sans not-italic">· {item.brand}</span>
                              )}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p
                              className={cn(
                                "text-sm font-bold",
                                outOfStock
                                  ? "text-destructive"
                                  : item.qty_valid <= 3
                                    ? "text-amber-400"
                                    : "text-emerald-400",
                              )}
                            >
                              {outOfStock ? "Zerado" : `${item.qty_valid} un.`}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{item.category_name}</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {/* Product card */}
      {selected && (
        <div className="mt-6 animate-fade-in">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div
              className={cn(
                "flex items-center gap-5 bg-gradient-to-r p-6",
                skuToGradient(selected.sku),
              )}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-5xl backdrop-blur-sm">
                {CATEGORY_EMOJI[selected.category_code] ?? "📦"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xl font-bold text-white">{selected.name}</p>
                <p className="font-mono text-sm text-white/60">{selected.sku}</p>
                {selected.brand && (
                  <p className="mt-0.5 text-sm text-white/50">{selected.brand}</p>
                )}
              </div>
              <button
                onClick={clearSelection}
                className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* Stock + Category */}
              <div className="flex items-center gap-4">
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-center">
                  <p className="text-[11px] text-muted-foreground">Estoque Atual</p>
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      selected.qty_valid <= 3 ? "text-amber-400" : "text-emerald-400",
                    )}
                  >
                    {selected.qty_valid}
                  </p>
                  <p className="text-[10px] text-muted-foreground">unidades</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-center">
                  <p className="text-[11px] text-muted-foreground">Categoria</p>
                  <p className="mt-1 text-sm font-semibold">{selected.category_name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground/60">[{selected.category_code}]</p>
                </div>
              </div>

              {/* Qty + Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">
                    Quantidade a Vender
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={selected.qty_valid}
                      value={qty}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        if (!isNaN(v) && v >= 1) setQty(v);
                      }}
                      className="h-10 w-full rounded-xl border border-border bg-muted/50 text-center text-lg font-bold outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => setQty((q) => Math.min(selected.qty_valid, q + 1))}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {qty > selected.qty_valid && (
                    <p className="mt-1 text-[11px] text-destructive">
                      Máximo disponível: {selected.qty_valid}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">
                    Valor de Venda (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={salePrice}
                      onChange={(e) => {
                        setSalePrice(e.target.value);
                        setPriceError("");
                      }}
                      className={cn(
                        "h-10 w-full rounded-xl border bg-muted/50 py-2 pl-10 pr-4 text-lg font-bold outline-none transition-colors focus:bg-background",
                        priceError
                          ? "border-destructive focus:border-destructive"
                          : "border-border focus:border-primary",
                      )}
                    />
                  </div>
                  {priceError && (
                    <p className="mt-1 text-[11px] text-destructive">{priceError}</p>
                  )}
                </div>
              </div>

              {/* Order summary */}
              {salePrice && !isNaN(parseFloat(salePrice)) && (
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-5 py-3">
                  <span className="text-sm text-muted-foreground">Total da venda</span>
                  <span className="text-xl font-bold">
                    {formatBRL(qty * parseFloat(salePrice.replace(",", ".")))}
                  </span>
                </div>
              )}

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                disabled={confirming || qty > selected.qty_valid}
                className={cn(
                  "relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl py-4 text-base font-bold transition-all",
                  confirming || qty > selected.qty_valid
                    ? "cursor-not-allowed bg-muted text-muted-foreground"
                    : "bg-foreground text-background shadow-lg hover:opacity-90 active:scale-[0.99]",
                )}
              >
                {confirming ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
                    Sincronizando com Bling...
                  </>
                ) : (
                  <>
                    <Zap size={18} className="fill-current" />
                    Confirmar Saída
                    <kbd className="ml-1 rounded border border-background/20 bg-background/10 px-2 py-0.5 text-xs font-normal">
                      Enter
                    </kbd>
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-muted-foreground/50">
                <Sparkles size={10} className="mr-1 inline text-amber-400/60" />
                Estoque deduzido no Hub + gatilho Bling V3 + registro no banco.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selected && !query && (
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-border bg-card text-4xl shadow-inner">
            🧴
          </div>
          <div>
            <p className="font-semibold text-muted-foreground">Busque um produto para começar</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Digite o nome, SKU ou marca no campo acima
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground/40">
            <kbd className="rounded border border-border bg-muted px-2 py-1 font-mono">⌘K</kbd>
            <span>para focar a busca</span>
            <span className="mx-1">·</span>
            <kbd className="rounded border border-border bg-muted px-2 py-1 font-mono">Enter</kbd>
            <span>para confirmar</span>
            <span className="mx-1">·</span>
            <kbd className="rounded border border-border bg-muted px-2 py-1 font-mono">Esc</kbd>
            <span>para limpar</span>
          </div>
        </div>
      )}

      {/* Sales log */}
      {salesLog.length > 0 && (
        <div className="mt-10 animate-fade-in">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag size={15} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold">Vendas desta sessão</h2>
            </div>
            <span className="text-xs font-semibold text-emerald-400">
              Total: {formatBRL(totalSoldToday)}
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <ul className="divide-y divide-border/50">
              {salesLog.map((sale) => (
                <li key={sale.id} className="flex items-center gap-4 px-5 py-3">
                  <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{sale.product_name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground/60">{sale.sku}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">
                      {formatBRL(sale.qty * sale.price_brl)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {sale.qty}× ·{" "}
                      <span className="inline-flex items-center gap-0.5">
                        <Clock size={9} />
                        {new Date(sale.sold_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
