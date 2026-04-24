/**
 * POST /api/catalog/sync
 *
 * Sincroniza o catálogo do Bling para a tabela catalog_products no Supabase.
 * Requer autenticação de admin.
 *
 * Body (JSON):
 *   - mode: "live" | "mock"
 *   - products?: CatalogProduct[]  (obrigatório se mode = "mock")
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncCatalogFromBling, syncCatalogMock } from "@/lib/catalogSync";
import type { CatalogProduct } from "@/lib/catalogSync";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { BlingToken } from "@/types/database";

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

  // 2. Parse body
  let body: { mode?: string; products?: CatalogProduct[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mode = body.mode ?? "live";

  try {
    // 3. Mock: upsert direto dos produtos enviados no body
    if (mode === "mock") {
      if (!Array.isArray(body.products) || body.products.length === 0) {
        return NextResponse.json(
          { error: "products[] required for mock mode" },
          { status: 400 }
        );
      }
      const result = await syncCatalogMock(body.products);
      return NextResponse.json({ mode, ...result });
    }

    // 4. Live: busca token Bling e sincroniza
    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from("bling_tokens")
      .select("access_token, expires_at")
      .eq("id", 1)
      .single();

    if (tokenError || !tokenRow) {
      return NextResponse.json(
        { error: "Bling token not found. Connect Bling at /integrations." },
        { status: 503 }
      );
    }

    const token = tokenRow as Pick<BlingToken, "access_token" | "expires_at">;
    if (new Date(token.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Bling token expired. Reconnect at /integrations." },
        { status: 503 }
      );
    }

    const result = await syncCatalogFromBling(token.access_token);
    return NextResponse.json({ mode, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("[catalog/sync] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
