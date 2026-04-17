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

// ============================================================
// updateTrip — Edita nome, câmbio estimado/final, notas
// ============================================================

export type UpdateTripState = { error: string } | { ok: true };

export async function updateTrip(
  tripId: string,
  formData: FormData,
): Promise<UpdateTripState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const name = (formData.get("name") as string)?.trim();
  const estimated_exchange_rate = parseFloat(formData.get("estimated_exchange_rate") as string);
  const final_exchange_rate_raw = formData.get("final_exchange_rate") as string;
  const final_exchange_rate = final_exchange_rate_raw ? parseFloat(final_exchange_rate_raw) : null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!name) return { error: "Nome da viagem é obrigatório." };
  if (isNaN(estimated_exchange_rate) || estimated_exchange_rate <= 0)
    return { error: "Câmbio estimado inválido." };
  if (final_exchange_rate !== null && (isNaN(final_exchange_rate) || final_exchange_rate <= 0))
    return { error: "Câmbio final inválido." };

  const payload: Partial<TripInsert> = {
    name,
    estimated_exchange_rate,
    final_exchange_rate,
    notes,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qb = supabase.from("trips") as any;
  const { error } = await qb.update(payload).eq("id", tripId);
  if (error) return { error: error.message };

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  return { ok: true };
}

// ============================================================
// deleteTrip — Exclui viagem e suas despesas (cascade no banco)
// ============================================================

export type DeleteTripState = { error: string } | { ok: true };

export async function deleteTrip(tripId: string): Promise<DeleteTripState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // As despesas serão excluídas automaticamente pelo ON DELETE CASCADE
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qb = supabase.from("trips") as any;
  const { error } = await qb.delete().eq("id", tripId);
  if (error) return { error: error.message };

  revalidatePath("/trips");
  return { ok: true };
}

// ============================================================
// updateExpense — Edita uma despesa existente
// ============================================================

export type UpdateExpenseState = { error: string } | { ok: true };

export async function updateExpense(
  expenseId: string,
  formData: FormData,
): Promise<UpdateExpenseState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const trip_id = formData.get("trip_id") as string;
  const description = (formData.get("description") as string)?.trim() || null;
  const expense_type = formData.get("expense_type") as TripExpenseInsert["expense_type"];
  const amount_usd_raw = formData.get("amount_usd") as string;
  const amount_usd = amount_usd_raw ? parseFloat(amount_usd_raw) : null;
  const amount_brl = parseFloat(formData.get("amount_brl") as string);

  if (!expense_type) return { error: "Tipo de despesa é obrigatório." };
  if (isNaN(amount_brl) || amount_brl < 0) return { error: "Valor inválido." };

  const payload: Partial<TripExpenseInsert> = {
    description,
    expense_type,
    amount_usd: amount_usd !== null && !isNaN(amount_usd) && amount_usd >= 0 ? amount_usd : null,
    amount_brl,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qb = supabase.from("trip_expenses") as any;
  const { error } = await qb.update(payload).eq("id", expenseId);
  if (error) return { error: error.message };

  // O trigger recalculate_trip_costs será disparado automaticamente após o update
  revalidatePath(`/trips/${trip_id}`);
  return { ok: true };
}

// ============================================================
// deleteExpense — Remove uma despesa
// ============================================================

export type DeleteExpenseState = { error: string } | { ok: true };

export async function deleteExpense(
  expenseId: string,
  tripId: string,
): Promise<DeleteExpenseState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qb = supabase.from("trip_expenses") as any;
  const { error } = await qb.delete().eq("id", expenseId);
  if (error) return { error: error.message };

  // O trigger recalculate_trip_costs será disparado automaticamente após o delete
  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}

// ============================================================
// getProducts — Busca produtos do catálogo para o combobox
// ============================================================

export interface ProductCatalogItem {
  sku: string;
  name: string;
  brand: string | null;
  model: string;
  variant: string;
  category_name: string | null;
}

export async function getProducts(search?: string): Promise<ProductCatalogItem[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("products") as any)
    .select("sku, name, brand, model, variant, product_categories(name)")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(50);

  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,brand.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[getProducts] Error:", error);
    return [];
  }

  return (data || []).map((p: { sku: string; name: string; brand: string | null; model: string; variant: string; product_categories: { name: string } | null }) => ({
    sku: p.sku,
    name: p.name,
    brand: p.brand,
    model: p.model,
    variant: p.variant,
    category_name: p.product_categories?.name ?? null,
  }));
}

// ============================================================
// createBatch — Cria um lote de produto vinculado a uma viagem
// ============================================================

export type CreateBatchState = { error: string } | { ok: true; batchId: string };

export async function createBatch(
  _prev: CreateBatchState | null,
  formData: FormData,
): Promise<CreateBatchState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const trip_id = formData.get("trip_id") as string;
  const product_sku = formData.get("product_sku") as string;
  const qty_purchased = parseInt(formData.get("qty_purchased") as string);
  const qty_lost_seized = parseInt(formData.get("qty_lost_seized") as string) || 0;
  const purchase_price_usd = parseFloat(formData.get("purchase_price_usd") as string);

  if (!trip_id || !product_sku) return { error: "Viagem e produto são obrigatórios." };
  if (isNaN(qty_purchased) || qty_purchased <= 0) return { error: "Quantidade inválida." };
  if (isNaN(purchase_price_usd) || purchase_price_usd <= 0) return { error: "Preço de compra inválido." };
  if (qty_lost_seized < 0 || qty_lost_seized > qty_purchased) return { error: "Quantidade avariada inválida." };

  const payload = {
    trip_id,
    product_sku,
    qty_purchased,
    qty_lost_seized,
    purchase_price_usd,
    status: "pending",
    final_price_brl: null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("inventory_batches") as any)
    .insert(payload)
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/trips/${trip_id}`);
  return { ok: true, batchId: data.id };
}
