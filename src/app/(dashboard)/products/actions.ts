"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProductInsert } from "@/types/database";

// ============================================================
// createProduct
// The DB trigger trg_generate_sku will generate the SKU
// automatically if not supplied.
// ============================================================

export type CreateProductState = { error: string } | { sku: string };

export async function createProduct(
  _prev: CreateProductState | null,
  formData: FormData,
): Promise<CreateProductState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const name = formData.get("name") as string;
  const brand = (formData.get("brand") as string) || null;
  const category_id = formData.get("category_id") as string;
  const model = formData.get("model") as string;
  const variant = formData.get("variant") as string;
  const base_markup = parseFloat(formData.get("base_markup") as string);
  const weight_raw = formData.get("weight_kg") as string;
  const weight_kg = weight_raw ? parseFloat(weight_raw) : null;

  if (!name || !category_id || !model || !variant) {
    return { error: "Campos obrigatórios ausentes." };
  }
  if (isNaN(base_markup) || base_markup < 1) {
    return { error: "Markup inválido." };
  }

  const payload: ProductInsert = {
    name: name.trim(),
    brand: brand?.trim() || null,
    category_id,
    model: model.trim(),
    variant: variant.trim(),
    base_markup,
    weight_kg: weight_kg && !isNaN(weight_kg) && weight_kg > 0 ? weight_kg : null,
    is_active: true,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qb = supabase.from("products") as any;
  const { data, error } = await qb.insert(payload).select("sku").single();

  if (error) {
    if (error.code === "23505") return { error: "SKU duplicado. Altere Modelo ou Variante." };
    return { error: error.message };
  }

  revalidatePath("/products");
  return { sku: (data as { sku: string }).sku };
}

// ============================================================
// toggleProductActive
// ============================================================

export type ToggleActiveState = { error: string } | { ok: true };

export async function toggleProductActive(
  sku: string,
  isActive: boolean,
): Promise<ToggleActiveState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qb = supabase.from("products") as any;
  const { error } = await qb.update({ is_active: !isActive }).eq("sku", sku);

  if (error) return { error: error.message };

  revalidatePath("/products");
  return { ok: true };
}

// ============================================================
// updateProduct - Edita nome, marca, categoria, base_markup
// ============================================================

export type UpdateProductState = { error: string } | { ok: true };

export async function updateProduct(
  sku: string,
  formData: FormData,
): Promise<UpdateProductState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const name = formData.get("name") as string;
  const brand = (formData.get("brand") as string) || null;
  const category_id = formData.get("category_id") as string;
  const base_markup = parseFloat(formData.get("base_markup") as string);

  if (!name || !category_id) {
    return { error: "Nome e categoria são obrigatórios." };
  }
  if (isNaN(base_markup) || base_markup < 1) {
    return { error: "Markup inválido." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qb = supabase.from("products") as any;
  const { error } = await qb
    .update({
      name: name.trim(),
      brand: brand?.trim() || null,
      category_id,
      base_markup,
      updated_at: new Date().toISOString(),
    })
    .eq("sku", sku);

  if (error) return { error: error.message };

  revalidatePath("/products");
  return { ok: true };
}

// ============================================================
// deleteProduct - Exclui produto se não tiver batches atrelados
// ============================================================

export type DeleteProductState = 
  | { error: string; hasBatches?: boolean } 
  | { ok: true };

export async function deleteProduct(sku: string): Promise<DeleteProductState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // Verifica se o produto tem batches atrelados
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: batches, error: countError } = await (supabase
    .from("inventory_batches") as any)
    .select("id", { count: "exact", head: true })
    .eq("product_sku", sku);

  if (countError) return { error: countError.message };

  const batchCount = batches?.length ?? 0;
  if (batchCount > 0) {
    return {
      error: "Este produto não pode ser eliminado porque já está registado numa viagem. Deves eliminar o lote do inventário primeiro.",
      hasBatches: true,
    };
  }

  // Exclui o produto
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("products") as any)
    .delete()
    .eq("sku", sku);

  if (error) return { error: error.message };

  revalidatePath("/products");
  return { ok: true };
}
