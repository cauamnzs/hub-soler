"use client";

import { useState, useTransition } from "react";
import { DollarSign, Pencil, Check, X } from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { Trip } from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateTripExchangeRate(tripId: string, exchangeRate: number): Promise<any> {
  const res = await fetch(`/api/trips/${tripId}/exchange-rate`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ final_exchange_rate: exchangeRate }),
  });
  return res.json();
}

interface ExchangeRateCardProps {
  trip: Trip;
  isAdmin: boolean;
}

export function ExchangeRateCard({ trip, isAdmin }: ExchangeRateCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(
    (trip.final_exchange_rate ?? trip.estimated_exchange_rate).toFixed(2)
  );

  const currentRate = trip.final_exchange_rate ?? trip.estimated_exchange_rate;
  const isEstimated = trip.final_exchange_rate === null;

  function handleSave() {
    const rate = parseFloat(value);
    if (isNaN(rate) || rate <= 0) {
      toast({ variant: "error", title: "Valor inválido" });
      return;
    }

    startTransition(async () => {
      const result = await updateTripExchangeRate(trip.id, rate);
      if (result.error) {
        toast({ variant: "error", title: "Erro ao atualizar", description: result.error });
      } else {
        toast({ variant: "success", title: "Câmbio atualizado!" });
        setIsEditing(false);
        // Refresh page to show updated data
        window.location.reload();
      }
    });
  }

  function handleCancel() {
    setValue(currentRate.toFixed(2));
    setIsEditing(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-violet-500/10 p-2">
            <DollarSign size={16} className="text-violet-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Câmbio {trip.name}</p>
            {isEstimated && (
              <span className="text-[10px] text-amber-400">Estimado</span>
            )}
          </div>
        </div>
        {isAdmin && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">R$</span>
            <input
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm outline-none"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 rounded-lg bg-foreground py-1.5 text-xs font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "Salvando..." : <><Check size={12} className="inline mr-1" /> Salvar</>}
            </button>
            <button
              onClick={handleCancel}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              <X size={12} className="inline" />
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-xl font-semibold tabular-nums">
            R$ {currentRate.toFixed(2)}
          </p>
          <p className="text-[11px] text-muted-foreground/60">
            {isEstimated ? "Câmbio estimado - aguardando final" : "Câmbio final definido"}
          </p>
        </div>
      )}
    </div>
  );
}
