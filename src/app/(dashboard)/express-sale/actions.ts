"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ExpressSaleInsert } from "@/types/database";

// ============================================================
// createExpressSale
// Records the sale and triggers revalidation
// ============================================================

export type CreateExpressSaleState = { error: string } | { ok: true; id: string };

export async function createExpressSale(
  _prev: CreateExpressSaleState | null,
  formData: FormData,
): Promise<CreateExpressSaleState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const batch_id = formData.get("batch_id") as string;
  const qty_sold = parseInt(formData.get("qty_sold") as string);
  const sale_price_brl = parseFloat(formData.get("sale_price_brl") as string);
  const customer_name = (formData.get("customer_name") as string) || null;
  const customer_phone = (formData.get("customer_phone") as string) || null;

  if (!batch_id) return { error: "Lote não informado." };
  if (isNaN(qty_sold) || qty_sold <= 0) return { error: "Quantidade inválida." };
  if (isNaN(sale_price_brl) || sale_price_brl <= 0) return { error: "Valor de venda inválido." };

  const payload: ExpressSaleInsert = {
    batch_id,
    qty_sold,
    sale_price_brl,
    customer_name,
    customer_phone,
    notes: null,
    created_by: user.id,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qb = supabase.from("express_sales") as any;
  const { data, error } = await qb.insert(payload).select("id").single();
  if (error) return { error: error.message };

  revalidatePath("/express-sale");
  revalidatePath("/inventory");
  return { ok: true, id: (data as { id: string }).id };
}
