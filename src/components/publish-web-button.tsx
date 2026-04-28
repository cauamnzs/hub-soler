"use client";

import { useState, useTransition } from "react";
import {
  Globe,
  X,
  ImageIcon,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { publishToWebCatalog } from "@/app/(dashboard)/products/actions";

// Category styling (copied from products-client)
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

export interface PublishableItem {
  sku: string;
  name: string;
  brand: string | null;
  category_code?: string;
}

interface PublishWebButtonProps {
  item: PublishableItem;
  categoryCode?: string;
}

export function PublishWebButton({ item, categoryCode }: PublishWebButtonProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  }

  function handleClose() {
    if (isPending) return;
    setIsOpen(false);
    setPrice("");
    setDescription("");
    setIsActive(true);
    setFile(null);
    setPreview(null);
  }

  function handleSubmit() {
    const parsed = parseFloat(price);
    if (!price || isNaN(parsed) || parsed <= 0) {
      toast({ variant: "error", title: "Preço inválido", description: "Informe um valor maior que zero." });
      return;
    }

    const fd = new FormData();
    fd.set("sku", item.sku);
    fd.set("name", item.name);
    fd.set("brand", item.brand ?? "");
    fd.set("price", price);
    fd.set("description", description);
    fd.set("is_active", String(isActive));
    if (file) fd.set("file", file);

    startTransition(async () => {
      const result = await publishToWebCatalog(null, fd);
      if ("error" in result) {
        toast({ variant: "error", title: "Erro ao publicar", description: result.error });
      } else {
        toast({
          variant: "success",
          title: "✨ Publicado no Soler Shop!",
          description: `SKU ${item.sku} está no catálogo da vitrine.`,
        });
        handleClose();
      }
    });
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-full p-1 text-amber-400 transition-colors hover:bg-amber-400/10"
        title="Publicar no Soler Shop"
      >
        <Globe size={16} />
      </button>
    );
  }

  const catCode = categoryCode ?? item.category_code ?? "OUTR";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative z-10 flex max-h-[calc(100vh-3rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-amber-500/20 bg-card shadow-2xl">

        {/* Header */}
        <div className="shrink-0 border-b border-border px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Globe size={16} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Publicar no Soler Shop</h2>
                <p className="text-xs text-muted-foreground">
                  Define os dados de vitrine — catálogo público
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isPending}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              <X size={16} />
            </button>
          </div>

          {/* Product identity (readonly) */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl",
                AVATAR_GRADIENT[catCode] ?? "from-zinc-500 to-zinc-800",
              )}
            >
              {CATEGORY_EMOJI[catCode] ?? "📦"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {item.sku}
                {item.brand && (
                  <span className="ml-2 font-sans text-muted-foreground/60">
                    · {item.brand}
                  </span>
                )}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
              ERP → Vitrine
            </span>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">

          {/* Preço */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Preço de Venda Final (R$){" "}
              <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-amber-500/60 focus:bg-background"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Descrição Premium
              </label>
              <button
                onClick={() => setDescription(`VIBE: [01 - Cítrico/Amadeirado/Doce]
NOME: [Ex: Amanhecer Fresco]
NOTAS: [Ex: Cítrico e Off-White. A pureza do orvalho matinal em um frasco de cristal.]
FIXAÇÃO: [Ex: Longa duração, ideal para noites quentes.]`)}
                className="flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-[11px] font-medium text-amber-400 transition-colors hover:bg-amber-500/10 hover:border-amber-500/30"
              >
                <Sparkles size={12} />
                Template: Perfume de Luxo
              </button>
            </div>
            <textarea
              placeholder="Fragrância exclusiva com notas de..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm outline-none transition-colors focus:border-amber-500/60 focus:bg-background"
            />
          </div>

          {/* Foto */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Foto Premium
            </label>
            {preview ? (
              <div className="relative overflow-hidden rounded-xl border border-border">
                <img
                  src={preview}
                  alt="Preview"
                  className="h-40 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1 hover:bg-black/80"
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
            ) : (
              <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 text-muted-foreground transition-colors hover:border-amber-500/60 hover:bg-amber-500/10">
                <ImageIcon size={22} />
                <span className="text-xs">Clique para selecionar imagem</span>
                <span className="text-[10px] text-muted-foreground/50">
                  JPG, PNG, WebP — máx. 10 MB
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          {/* Status no site */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Publicar como Ativo</p>
              <p className="text-xs text-muted-foreground">
                Produto visível no Soler Shop imediatamente
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              title={isActive ? "Desativar" : "Ativar"}
            >
              {isActive ? (
                <ToggleRight size={28} className="text-emerald-400" />
              ) : (
                <ToggleLeft size={28} className="text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-6 py-4">
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              disabled={isPending}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-opacity",
                isPending
                  ? "cursor-not-allowed bg-amber-500/40 text-black/60"
                  : "bg-amber-500 text-black hover:opacity-90",
              )}
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {file ? "Fazendo upload..." : "Publicando..."}
                </>
              ) : (
                <>
                  <Globe size={14} />
                  Publicar no Soler Shop
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
