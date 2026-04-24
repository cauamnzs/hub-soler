/**
 * Hub Soler — Gestão de Mídia Premium
 *
 * Upload de imagem para Supabase Storage (bucket: produtos-premium)
 * e injeção da URL pública na coluna image_url do catalog_products.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "produtos-premium";

export type UploadResult = {
  sku: string;
  publicUrl: string;
};

/**
 * Faz upload de um arquivo de imagem para o Storage e atualiza image_url
 * do produto correspondente na tabela catalog_products.
 *
 * @param sku - SKU do produto (usado como nome do arquivo)
 * @param file - Buffer ou Blob da imagem
 * @param contentType - MIME type (ex: "image/jpeg", "image/webp")
 */
export async function uploadProductImage(
  sku: string,
  file: Buffer | Blob | ArrayBuffer,
  contentType: string = "image/jpeg"
): Promise<UploadResult> {
  const ext = contentType.split("/")[1] ?? "jpg";
  const storagePath = `${sku}.${ext}`;

  // 1. Upload para o bucket (upsert substitui se já existe)
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(`Storage upload failed for SKU "${sku}": ${uploadError.message}`);
  }

  // 2. Gerar URL pública
  const { data: urlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;

  if (!publicUrl) {
    throw new Error(`Failed to get public URL for SKU "${sku}"`);
  }

  // 3. Atualizar image_url na tabela catalog_products
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabaseAdmin.from("catalog_products") as any)
    .update({ image_url: publicUrl })
    .eq("sku", sku);

  if (updateError) {
    throw new Error(`DB update failed for SKU "${sku}": ${updateError.message}`);
  }

  return { sku, publicUrl };
}

/**
 * Converte um File/Blob vindo de FormData para Buffer (Node.js)
 */
export async function blobToBuffer(blob: Blob): Promise<Buffer> {
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
