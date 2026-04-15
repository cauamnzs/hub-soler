"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TripInsert, TripExpenseInsert } from "@/types/database";

// ============================================================
// createTrip
// ============================================================

export type CreateTripState = { error: string } | { id: string };

export async function createTrip(
  _prev: CreateTripState | null,
  formData: FormData,
): Promise<CreateTripState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const name = (formData.get("name") as string)?.trim();
  const origin = formData.get("origin") as TripInsert["origin"];
  const start_date = formData.get("start_date") as string;
  const estimated_exchange_rate = parseFloat(
    formData.get("estimated_exchange_rate") as string,
  );

  if (!name || !origin || !start_date)
    return { error: "Campos obrigatórios ausentes." };
  if (isNaN(estimated_exchange_rate) || estimated_exchange_rate <= 0)
    return { error: "Câmbio estimado inválido." };

  const payload: TripInsert = {
    name,
    origin,
    status: "planning",
    start_date,
    end_date: null,
    estimated_exchange_rate,
    final_exchange_rate: null,
    notes: null,
    created_by: user.id,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qb = supabase.from("trips") as any;
  const { data, error } = await qb.insert(payload).select("id").single();

  if (error) return { error: error.message };

  revalidatePath("/trips");
  return { id: (data as { id: string }).id };
}

// ============================================================
// updateTripStatus
// ============================================================

export type UpdateTripStatusState = { error: string } | { ok: true };

export async function updateTripStatus(
  tripId: string,
  status: TripInsert["status"],
): Promise<UpdateTripStatusState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qb = supabase.from("trips") as any;
  const { error } = await qb.update({ status }).eq("id", tripId);
  if (error) return { error: error.message };

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  return { ok: true };
}

// ============================================================
// createExpense
// ============================================================

export type CreateExpenseState = { error: string } | { ok: true };

export async function createExpense(
  _prev: CreateExpenseState | null,
  formData: FormData,
): Promise<CreateExpenseState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const trip_id = formData.get("trip_id") as string;
  const description = (formData.get("description") as string)?.trim() || null;
  const expense_type = formData.get("expense_type") as TripExpenseInsert["expense_type"];
  const amount_usd = parseFloat(formData.get("amount_usd") as string);
  const amount_brl = parseFloat(formData.get("amount_brl") as string);

  if (!trip_id || !expense_type)
    return { error: "Campos obrigatórios ausentes." };
  if (isNaN(amount_brl) || amount_brl < 0)
    return { error: "Valor inválido." };

  const payload: TripExpenseInsert = {
    trip_id,
    description,
    expense_type,
    amount_usd: !isNaN(amount_usd) && amount_usd >= 0 ? amount_usd : null,
    amount_brl,
    receipt_url: null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qb = supabase.from("trip_expenses") as any;
  const { error } = await qb.insert(payload);
  if (error) return { error: error.message };

  revalidatePath(`/trips/${trip_id}`);
  return { ok: true };
}
