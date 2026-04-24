"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
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

// ============================================================
// publishToWebCatalog
// Publica o produto no catálogo público (solerShop vitrine)
// 1. Upload da imagem → bucket produtos-premium (se fornecida)
// 2. Upsert em catalog_products via service_role (bypass RLS)
// NÃO altera a tabela products (ERP) nem inventory_batches.
// ============================================================

export type PublishToWebState = { error: string } | { ok: true; image_url?: string };

export async function publishToWebCatalog(
  _prev: PublishToWebState | null,
  formData: FormData,
): Promise<PublishToWebState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const sku         = (formData.get("sku")         as string | null)?.trim();
  const name        = (formData.get("name")        as string | null)?.trim();
  const brand       = (formData.get("brand")       as string | null)?.trim() ?? "";
  const priceRaw    =  formData.get("price")       as string | null;
  const description = (formData.get("description") as string | null)?.trim() ?? "";
  const is_active   =  formData.get("is_active") === "true";
  const file        =  formData.get("file");

  if (!sku)  return { error: "SKU é obrigatório." };
  if (!name) return { error: "Nome é obrigatório." };

  const price = parseFloat(priceRaw ?? "");
  if (isNaN(price) || price <= 0) return { error: "Preço inválido. Informe um valor maior que zero." };

  let image_url = "";

  // ---- 1. Upload da imagem (se fornecida) ----
  if (file instanceof Blob && file.size > 0) {
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!ALLOWED.includes(file.type)) {
      return { error: `Tipo de arquivo não suportado: ${file.type}. Use JPG, PNG, WebP ou AVIF.` };
    }
    if (file.size > 10 * 1024 * 1024) {
      return { error: `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo: 10 MB.` };
    }

    const ext = file.type.split("/")[1] ?? "jpg";
    const storagePath = `${sku}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("produtos-premium")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) return { error: `Upload falhou: ${uploadError.message}` };

    const { data: urlData } = supabaseAdmin.storage
      .from("produtos-premium")
      .getPublicUrl(storagePath);

    image_url = urlData.publicUrl;
  }

  // ---- 2. Upsert no catálogo público ----
  const payload: Record<string, unknown> = {
    sku,
    name,
    brand,
    price,
    description,
    is_active,
  };
  if (image_url) payload.image_url = image_url;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: upsertError } = await (supabaseAdmin.from("catalog_products") as any)
    .upsert(payload, { onConflict: "sku", ignoreDuplicates: false });

  if (upsertError) return { error: upsertError.message };

  revalidatePath("/products");
  return { ok: true, image_url: image_url || undefined };
}
