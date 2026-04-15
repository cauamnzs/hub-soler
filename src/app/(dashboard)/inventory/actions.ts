"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProductInsert, InventoryBatchInsert } from "@/types/database";

// ============================================================
// createInventoryEntry
// Creates or reuses a product, then creates the inventory batch.
// ============================================================

export type CreateInventoryEntryState = { error: string } | { sku: string };

export async function createInventoryEntry(
  _prev: CreateInventoryEntryState | null,
  formData: FormData,
): Promise<CreateInventoryEntryState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const category_id = formData.get("category_id") as string;
  const name = (formData.get("name") as string)?.trim();
  const model = (formData.get("model") as string)?.trim();
  const variant = (formData.get("variant") as string)?.trim();
  const trip_id = formData.get("trip_id") as string;
  const qty_purchased = parseInt(formData.get("qty_purchased") as string);
  const qty_lost_seized = parseInt(formData.get("qty_lost_seized") as string) || 0;
  const purchase_price_usd = parseFloat(formData.get("purchase_price_usd") as string) || 0;

  if (!category_id || !name || !model || !variant || !trip_id)
    return { error: "Campos obrigatórios ausentes." };
  if (isNaN(qty_purchased) || qty_purchased <= 0)
    return { error: "Quantidade inválida." };
  if (qty_lost_seized < 0 || qty_lost_seized > qty_purchased)
    return { error: "Quantidade avariada inválida." };

  // ---- Upsert product (insert if SKU doesn't exist yet) ----
  const productPayload: ProductInsert = {
    name,
    model,
    variant,
    category_id,
    base_markup: 45,
    is_active: true,
    brand: null,
    weight_kg: null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productQb = supabase.from("products") as any;
  const { data: productData, error: productError } = await productQb
    .insert(productPayload)
    .select("sku")
    .single();

  if (productError) return { error: productError.message };

  const sku = (productData as { sku: string }).sku;

  // ---- Create inventory batch ----
  const batchPayload: InventoryBatchInsert = {
    product_sku: sku,
    trip_id,
    qty_purchased,
    qty_lost_seized,
    purchase_price_usd,
    final_price_brl: null,
    status: "pending",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batchQb = supabase.from("inventory_batches") as any;
  const { error: batchError } = await batchQb.insert(batchPayload);
  if (batchError) return { error: batchError.message };

  revalidatePath("/inventory");
  revalidatePath(`/trips/${trip_id}`);
  return { sku };
}
