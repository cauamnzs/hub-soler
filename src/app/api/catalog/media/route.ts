/**
 * POST /api/catalog/media
 *
 * Upload de imagem premium para um produto do catálogo.
 * Aceita multipart/form-data com:
 *   - sku: string (obrigatório)
 *   - file: File (imagem, obrigatório)
 *
 * Faz upload para o bucket "produtos-premium" no Supabase Storage
 * e injeta a URL pública na coluna image_url do catalog_products.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadProductImage, blobToBuffer } from "@/lib/mediaUpload";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  // 1. Autenticação — aceita sessão Supabase OU x-hub-api-key no header
  const apiKey = req.headers.get("x-hub-api-key");
  const hubKey = process.env.HUB_API_KEY;
  const isApiKeyValid = hubKey && apiKey === hubKey;

  if (!isApiKeyValid) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // 2. Parse multipart form
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const sku = formData.get("sku");
  const file = formData.get("file");

  if (!sku || typeof sku !== "string" || sku.trim() === "") {
    return NextResponse.json({ error: "sku is required" }, { status: 400 });
  }

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  // 3. Validações de segurança
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}` },
      { status: 415 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max: 10 MB.` },
      { status: 413 }
    );
  }

  // 4. Upload + update DB
  try {
    const buffer = await blobToBuffer(file);
    const result = await uploadProductImage(sku.trim(), buffer, file.type);

    return NextResponse.json({
      success: true,
      sku: result.sku,
      image_url: result.publicUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[catalog/media] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
