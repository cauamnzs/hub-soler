import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// PAYLOAD SCHEMA (zod)
// ============================================================

const SyncPayloadSchema = z.object({
  sku: z.string().min(1, "SKU obrigatório"),
  name: z.string().min(1, "Nome obrigatório"),
  final_selling_price: z
    .number()
    .positive("Preço deve ser positivo"),
  valid_stock: z
    .number()
    .int()
    .min(0, "Estoque não pode ser negativo"),
  action: z.enum(["create_update", "stock_deduct"]),
  batch_id: z.string().optional(),
});

export type SyncPayload = z.infer<typeof SyncPayloadSchema>;

// ============================================================
// BLING V3 PAYLOAD BUILDER
// Maps Hub Soler data → Bling API V3 /produtos format
// NOTE: import cost is NEVER sent to Bling — only selling price
// ============================================================

function buildBlingPayload(data: SyncPayload) {
  return {
    nome: data.name,
    codigo: data.sku,
    preco: data.final_selling_price,
    situacao: "A", // Ativo
    tipo: "P",     // Produto
    estoque: {
      minimo: 0,
      maximo: 9999,
      crossdocking: 0,
      localizacao: "",
    },
    // Stock is managed separately via /estoques endpoint in production
  };
}

// ============================================================
// BLING API CALLER
// In production: uses BLING_API_KEY (Bearer token from OAuth2).
// When key is absent: returns a deterministic mock success so
// development and CI never need real credentials.
// ============================================================

interface BlingResult {
  status: number;
  body: Record<string, unknown>;
  mocked: boolean;
}

async function callBlingApi(
  payload: SyncPayload,
): Promise<BlingResult> {
  const apiKey = process.env.BLING_API_KEY;
  const baseUrl =
    process.env.BLING_API_BASE_URL ?? "https://api.bling.com.br/Api/v3";

  // ---- Mock path: no API key present ----
  if (!apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      status: 200,
      body: {
        data: {
          id: Math.floor(Math.random() * 999999),
          sku: payload.sku,
          _mock: true,
        },
      },
      mocked: true,
    };
  }

  // ---- Production path: real Bling V3 request ----
  try {
    const blingPayload = buildBlingPayload(payload);

    // Bling V3 uses POST to create, PUT /:id to update.
    // We use POST /produtos for create_update; the upsert logic
    // (checking existing SKU) belongs in a future enhancement.
    const res = await fetch(`${baseUrl}/produtos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(blingPayload),
    });

    const responseBody = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    return { status: res.status, body: responseBody, mocked: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    throw new Error(`Bling fetch failed: ${message}`);
  }
}

// ============================================================
// POST /api/bling/sync
// ============================================================

export async function POST(req: NextRequest) {
  // ---- 1. Parse + validate body ----
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = SyncPayloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  // ---- 2. Call Bling (real or mocked) ----
  let blingResult: BlingResult;
  try {
    blingResult = await callBlingApi(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bling API error";

    // Still log the failure to Supabase
    try {
      const supabase = await createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("bling_sync_log") as any).insert({
        batch_id: payload.batch_id ?? null,
        action: payload.action,
        payload: payload,
        response_code: 500,
        response_body: { error: message },
        success: false,
      });
    } catch {
      // Logging failure is non-fatal
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }

  // ---- 3. Log to Supabase bling_sync_log ----
  const syncSuccess = blingResult.status >= 200 && blingResult.status < 300;

  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("bling_sync_log") as any).insert({
      batch_id: payload.batch_id ?? null,
      action: payload.action,
      payload: payload,
      response_code: blingResult.status,
      response_body: blingResult.body,
      success: syncSuccess,
    });
  } catch (logErr) {
    // Supabase logging failure must NOT block the API response.
    // Log to server console so it surfaces in Vercel/Next logs.
    console.error("[bling/sync] Supabase log insert failed:", logErr);
  }

  // ---- 4. Return semantic response ----
  if (!syncSuccess) {
    return NextResponse.json(
      {
        error: "Bling rejected the request",
        bling_status: blingResult.status,
        bling_body: blingResult.body,
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      sku: payload.sku,
      action: payload.action,
      mocked: blingResult.mocked,
      bling_response: blingResult.body,
    },
    { status: 200 },
  );
}

// Only POST is accepted on this route
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
