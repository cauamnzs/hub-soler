"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Plane,
  Plus,
  ArrowUpRight,
  Calendar,
  DollarSign,
  X,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { createTrip } from "./actions";
import type { Trip, TripOrigin, TripStatus } from "@/types/database";

// ============================================================
// BADGES
// ============================================================

function OriginBadge({ origin }: { origin: TripOrigin }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        origin === "PY"
          ? "bg-amber-500/15 text-amber-400"
          : "bg-blue-500/15 text-blue-400",
      )}
    >
      {origin === "EUA" ? "🇺🇸" : "🇵🇾"} {origin}
    </span>
  );
}

function StatusBadge({ status }: { status: TripStatus }) {
  const map: Record<TripStatus, { label: string; className: string }> = {
    planning: { label: "Planejando", className: "bg-muted text-muted-foreground" },
    in_transit: { label: "Em Trânsito", className: "bg-blue-500/15 text-blue-400" },
    consolidada: { label: "Consolidada", className: "bg-emerald-500/15 text-emerald-400" },
  };
  const c = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        c.className,
      )}
    >
      {c.label}
    </span>
  );
}

// ============================================================
// NEW TRIP DIALOG (uses createTrip Server Action)
// ============================================================

interface NewTripForm {
  name: string;
  origin: TripOrigin;
  start_date: string;
  estimated_exchange_rate: string;
}

const DEFAULT_FORM: NewTripForm = {
  name: "",
  origin: "PY",
  start_date: "",
  estimated_exchange_rate: "",
};

function NewTripDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<NewTripForm>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<NewTripForm>>({});

  function validate(): boolean {
    const next: Partial<NewTripForm> = {};
    if (!form.name.trim()) next.name = "Nome obrigatório";
    if (!form.start_date) next.start_date = "Data obrigatória";
    const rate = parseFloat(form.estimated_exchange_rate);
    if (!form.estimated_exchange_rate || isNaN(rate) || rate <= 0)
      next.estimated_exchange_rate = "Câmbio inválido";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave() {
    if (!validate()) return;

    const fd = new FormData();
    fd.set("name", form.name.trim());
    fd.set("origin", form.origin);
    fd.set("start_date", form.start_date);
    fd.set("estimated_exchange_rate", form.estimated_exchange_rate);

    startTransition(async () => {
      const result = await createTrip(null, fd);
      if ("error" in result) {
        toast({ variant: "error", title: "Erro ao criar viagem", description: result.error });
      } else {
        toast({ variant: "success", title: "Viagem criada!", description: form.name });
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
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative z-10 w-full max-w-md animate-fade-in rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Nova Viagem</h2>
            <p className="text-xs text-muted-foreground">
              Preencha os dados iniciais da operação.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Nome */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Nome da Viagem
            </label>
            <input
              type="text"
              placeholder="ex: CDE Jun/2025"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={cn(
                "w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:bg-background",
                errors.name ? "border-destructive" : "border-border",
              )}
            />
            {errors.name && (
              <p className="mt-1 text-[11px] text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Origem */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Origem
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["PY", "EUA"] as TripOrigin[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setForm({ ...form, origin: o })}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                    form.origin === o
                      ? o === "PY"
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                        : "border-blue-500/50 bg-blue-500/10 text-blue-400"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {o === "PY" ? "🇵🇾 Paraguai" : "🇺🇸 Estados Unidos"}
                </button>
              ))}
            </div>
          </div>

          {/* Data início */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Data de Início
            </label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className={cn(
                "w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:bg-background",
                errors.start_date ? "border-destructive" : "border-border",
              )}
            />
            {errors.start_date && (
              <p className="mt-1 text-[11px] text-destructive">{errors.start_date}</p>
            )}
          </div>

          {/* Câmbio estimado */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Câmbio Estimado (R$/USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="5.35"
                value={form.estimated_exchange_rate}
                onChange={(e) =>
                  setForm({ ...form, estimated_exchange_rate: e.target.value })
                }
                className={cn(
                  "w-full rounded-lg border bg-muted/50 py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:bg-background",
                  errors.estimated_exchange_rate
                    ? "border-destructive"
                    : "border-border",
                )}
              />
            </div>
            {errors.estimated_exchange_rate && (
              <p className="mt-1 text-[11px] text-destructive">
                {errors.estimated_exchange_rate}
              </p>
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
            {isPending ? "Criando..." : "Criar Viagem"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN CLIENT COMPONENT
// ============================================================

export function TripsClient({ initialTrips }: { initialTrips: Trip[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeCount = initialTrips.filter((t) => t.status !== "consolidada").length;

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Viagens</h1>
            <p className="text-sm text-muted-foreground">
              {initialTrips.length} viagens cadastradas &bull;{" "}
              <span className="text-blue-400">{activeCount} ativas</span>
            </p>
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            Nova Viagem
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Planejando",
              count: initialTrips.filter((t) => t.status === "planning").length,
              color: "text-muted-foreground",
              dot: "bg-muted-foreground",
            },
            {
              label: "Em Trânsito",
              count: initialTrips.filter((t) => t.status === "in_transit").length,
              color: "text-blue-400",
              dot: "bg-blue-400",
            },
            {
              label: "Consolidadas",
              count: initialTrips.filter((t) => t.status === "consolidada").length,
              color: "text-emerald-400",
              dot: "bg-emerald-400",
            },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card px-5 py-4">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className={cn("mt-1 text-2xl font-semibold", s.color)}>{s.count}</p>
            </div>
          ))}
        </div>

        {/* Trips table */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <Plane size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold">Todas as Viagens</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Nome da Viagem</th>
                  <th className="px-5 py-3 font-medium">Origem</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      Data Início
                    </span>
                  </th>
                  <th className="px-5 py-3 font-medium text-right">
                    <span className="flex items-center justify-end gap-1">
                      <DollarSign size={12} />
                      Câmbio Est.
                    </span>
                  </th>
                  <th className="px-5 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {initialTrips.map((trip) => (
                  <tr
                    key={trip.id}
                    className="group border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-medium">{trip.name}</span>
                      {trip.notes && (
                        <p className="mt-0.5 truncate max-w-[220px] text-[11px] text-muted-foreground/60">
                          {trip.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <OriginBadge origin={trip.origin} />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={trip.status} />
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {formatDate(trip.start_date)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      <div className="flex flex-col items-end">
                        <span className="font-medium">
                          R$ {trip.estimated_exchange_rate.toFixed(2)}
                        </span>
                        {trip.final_exchange_rate && (
                          <span
                            className={cn(
                              "text-[11px]",
                              trip.final_exchange_rate > trip.estimated_exchange_rate
                                ? "text-destructive"
                                : "text-emerald-400",
                            )}
                          >
                            Final: R$ {trip.final_exchange_rate.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/trips/${trip.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all"
                      >
                        Detalhes
                        <ArrowUpRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {initialTrips.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Plane size={32} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma viagem cadastrada.
                </p>
                <button
                  onClick={() => setDialogOpen(true)}
                  className="mt-1 text-xs font-medium text-blue-400 hover:underline"
                >
                  Criar primeira viagem
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <NewTripDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
