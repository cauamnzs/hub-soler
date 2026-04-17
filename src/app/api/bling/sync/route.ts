import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { BlingToken, InventoryBatch, Trip, TripExpense, Product } from "@/types/database";

// ============================================================
// TYPES
// ============================================================

type TripWithExpenses = Trip & { expenses: TripExpense[] };

type BatchWithProduct = InventoryBatch & {
  products: Product;
};

type CalculatedProduct = {
  sku: string;
  name: string;
  descricao: string;
  preco: number;           // Preço Mínimo Sugerido (com margem de segurança)
  preco_custo: number;     // Custo real em BRL (sem margem)
  situacao: "A" | "I";     // Ativo/Inativo
  formato: "S";            // Simples
  codigo: string;          // SKU
  estoque: {
    minimo: number;
    maximo: number;
    crossdocking: number;
    localizacao: string;
  };
};

interface BlingResult {
  status: number;
  body: Record<string, unknown>;
  productId?: number;
}

// ============================================================
// PAYLOAD SCHEMA (zod) — Nova estrutura por viagem
// ============================================================

const SyncTripPayloadSchema = z.object({
  trip_id: z.string().uuid("ID da viagem inválido"),
  action: z.enum(["sync_products", "update_stock"]),
});

// ============================================================
// HELPERS — Cálculos Financeiros
// ============================================================

/**
 * Cálculo de Custo Total da Viagem (soma de todos os custos indiretos)
 * Exclui despesas do tipo "mercadoria" (já estão no preço de compra)
 */
function calcularCustoTotalViagem(expenses: TripExpense[]): number {
  return expenses
    .filter((e) => e.expense_type !== "mercadoria")
    .reduce((sum, e) => sum + e.amount_brl, 0);
}

/**
 * Cálculo de Custo Rateado por Produto
 * (Custo Total da Viagem) / (Total de produtos comprados na viagem)
 */
function calcularCustoRateado(
  custoTotalViagem: number,
  totalProdutos: number
): number {
  if (totalProdutos === 0) return 0;
  return custoTotalViagem / totalProdutos;
}

/**
 * Cálculo de Custo em Real (BRL)
 * (Custo Unitário em Dólar) * (Câmbio da viagem)
 */
function calcularCustoEmReal(
  purchasePriceUsd: number,
  exchangeRate: number
): number {
  return purchasePriceUsd * exchangeRate;
}

/**
 * Cálculo de Preço Mínimo Sugerido
 * (Custo em Real) + (Custo Rateado) + (Margem de Segurança de 30%)
 * 
 * Fórmula: (custoReal + custoRateado) * 1.30
 */
function calcularPrecoMinimoSugerido(
  custoEmReal: number,
  custoRateado: number,
  margemSeguranca: number = 0.30
): number {
  const custoTotal = custoEmReal + custoRateado;
  return custoTotal * (1 + margemSeguranca);
}

/**
 * Cálculo de Lucro Projetado
 * (Preço Final de Venda estipulado) - (Custo em Real + Custo Rateado)
 */
function calcularLucroProjetado(
  precoFinalVenda: number,
  custoEmReal: number,
  custoRateado: number
): number {
  return precoFinalVenda - (custoEmReal + custoRateado);
}

// ============================================================
// BLING TOKEN FETCHER — Busca access_token do Supabase
// ============================================================

async function getValidBlingToken(): Promise<BlingToken | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("bling_tokens")
    .select("*")
    .eq("id", 1)
    .single();

  if (error || !data) {
    console.error("[bling/sync] Failed to fetch Bling token:", error?.message);
    return null;
  }

  const token = data as BlingToken;
  
  // Verifica se token está expirado
  const expiresAt = new Date(token.expires_at);
  if (expiresAt < new Date()) {
    console.error("[bling/sync] Bling token expired at", token.expires_at);
    return null;
  }

  return token;
}

// ============================================================
// DATA FETCHERS — Busca dados da viagem do Supabase
// ============================================================

async function fetchTripWithExpenses(tripId: string): Promise<TripWithExpenses | null> {
  const supabase = await createClient();
  
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();
  
  if (tripError || !trip) {
    console.error("[bling/sync] Trip not found:", tripId);
    return null;
  }

  const { data: expenses, error: expensesError } = await supabase
    .from("trip_expenses")
    .select("*")
    .eq("trip_id", tripId);

  if (expensesError) {
    console.error("[bling/sync] Failed to fetch expenses:", expensesError.message);
    return null;
  }

  return {
    ...(trip as Trip),
    expenses: expenses || [],
  };
}

async function fetchBatchesForTrip(tripId: string): Promise<BatchWithProduct[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("inventory_batches")
    .select(`
      *,
      products(*)
    `)
    .eq("trip_id", tripId)
    .eq("status", "approved");  // Só sincroniza batches aprovados

  if (error) {
    console.error("[bling/sync] Failed to fetch batches:", error.message);
    return [];
  }

  return (data || []) as BatchWithProduct[];
}

// ============================================================
// CALCULATION ENGINE — Aplica regras matemáticas da viagem
// ============================================================

function calcularProdutosParaBling(
  trip: TripWithExpenses,
  batches: BatchWithProduct[]
): CalculatedProduct[] {
  // 1. Calcular Custo Total da Viagem (custos indiretos)
  const custoTotalViagem = calcularCustoTotalViagem(trip.expenses);
  
  // 2. Total de produtos comprados (qty_valid)
  const totalProdutos = batches.reduce((sum, b) => sum + b.qty_valid, 0);
  
  // 3. Câmbio a usar (final se disponível, senão estimado)
  const exchangeRate = trip.final_exchange_rate ?? trip.estimated_exchange_rate;
  
  // 4. Custo Rateado por produto
  const custoRateado = calcularCustoRateado(custoTotalViagem, totalProdutos);

  return batches.map((batch) => {
    const product = batch.products;
    
    // Cálculos matemáticos por produto
    const custoEmReal = calcularCustoEmReal(batch.purchase_price_usd, exchangeRate);
    const precoMinimoSugerido = calcularPrecoMinimoSugerido(custoEmReal, custoRateado, 0.30);
    
    // Se houver preço final aprovado, usa ele; senão usa o preço mínimo sugerido
    const precoFinal = batch.final_price_brl ?? precoMinimoSugerido;
    
    return {
      sku: batch.product_sku,
      name: product.name,
      descricao: `${product.name} ${product.model} ${product.variant || ""}`.trim(),
      preco: precoFinal,
      preco_custo: custoEmReal + custoRateado,
      situacao: product.is_active ? "A" : "I",
      formato: "S" as const,
      codigo: batch.product_sku,
      estoque: {
        minimo: 0,
        maximo: 9999,
        crossdocking: 0,
        localizacao: "",
      },
    };
  });
}

// ============================================================
// BLING V3 API CALLER — Usa access_token do OAuth
// ============================================================

async function callBlingApi(
  accessToken: string,
  product: CalculatedProduct
): Promise<BlingResult> {
  const baseUrl = "https://api.bling.com.br/Api/v3";

  try {
    // Primeiro tenta atualizar (PUT) se produto já existe
    // Bling V3: PUT /produtos/{codigo} para atualizar
    const updateRes = await fetch(
      `${baseUrl}/produtos/${encodeURIComponent(product.codigo)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          nome: product.descricao,
          codigo: product.codigo,
          preco: product.preco,
          situacao: product.situacao,
          formato: product.formato,
          tipo: "P",
        }),
      }
    );

    if (updateRes.status === 200 || updateRes.status === 201) {
      const body = await updateRes.json().catch(() => ({}));
      return { status: updateRes.status, body, productId: body.data?.id };
    }

    // Se não existe (404), cria novo (POST)
    if (updateRes.status === 404) {
      const createRes = await fetch(`${baseUrl}/produtos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          nome: product.descricao,
          codigo: product.codigo,
          preco: product.preco,
          situacao: product.situacao,
          formato: product.formato,
          tipo: "P",
        }),
      });

      const body = await createRes.json().catch(() => ({}));
      return {
        status: createRes.status,
        body,
        productId: body.data?.id,
      };
    }

    // Outro erro na atualização - log detalhado para debug
    const body = await updateRes.json().catch(() => ({}));
    console.error(`[bling/sync] Bling API error - Status: ${updateRes.status}`, {
      product: product.codigo,
      status: updateRes.status,
      response: body,
      payload_sent: {
        nome: product.descricao,
        codigo: product.codigo,
        preco: product.preco,
        situacao: product.situacao,
        formato: product.formato,
        tipo: "P",
      }
    });
    return { status: updateRes.status, body };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error(`[bling/sync] Bling API call failed for ${product.codigo}:`, message);
    throw new Error(`Bling API call failed: ${message}`);
  }
}

// ============================================================
// BATCH SYNC STATUS UPDATER — Marca como sincronizado
// ============================================================

async function markBatchAsSynced(batchId: string): Promise<void> {
  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("inventory_batches") as any)
    .update({
      status: "synced_bling",
      synced_to_bling_at: new Date().toISOString(),
    })
    .eq("id", batchId);

  if (error) {
    console.error("[bling/sync] Failed to mark batch as synced:", error.message);
  }
}

// ============================================================
// SYNC LOGGER — Registra no bling_sync_log
// ============================================================

async function logSync(
  batchId: string | null,
  action: string,
  payload: unknown,
  responseCode: number,
  responseBody: unknown,
  success: boolean
): Promise<void> {
  const supabase = await createClient();
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("bling_sync_log") as any).insert({
      batch_id: batchId,
      action,
      payload: payload as Record<string, unknown>,
      response_code: responseCode,
      response_body: responseBody as Record<string, unknown>,
      success,
    });
  } catch (logErr) {
    console.error("[bling/sync] Failed to log sync:", logErr);
  }
}

// ============================================================
// POST /api/bling/sync
// Sincroniza todos os produtos aprovados de uma viagem
// ============================================================

export async function POST(req: NextRequest) {
  // ---- 1. Parse + validate body ----
  let rawBody: unknown;
  try {
    rawBody = await req.json();
    console.log("[bling/sync] Request body:", JSON.stringify(rawBody, null, 2));
  } catch (parseErr) {
    const message = parseErr instanceof Error ? parseErr.message : "Invalid JSON";
    console.error("[bling/sync] JSON parse error:", message);
    return NextResponse.json(
      { error: "Invalid JSON body", details: message },
      { status: 400 }
    );
  }

  const parsed = SyncTripPayloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    console.error("[bling/sync] Validation failed:", JSON.stringify(parsed.error.flatten(), null, 2));
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
        raw_body: rawBody,
      },
      { status: 400 }
    );
  }

  const { trip_id, action } = parsed.data;
  console.log(`[bling/sync] Starting sync - trip_id: ${trip_id}, action: ${action}`);

  // ---- 2. Verify authentication ----
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error("[bling/sync] Authentication failed:", authError?.message);
    return NextResponse.json(
      { error: "Unauthorized", details: authError?.message },
      { status: 401 }
    );
  }

  // ---- 3. Fetch Bling OAuth token ----
  const blingToken = await getValidBlingToken();
  if (!blingToken) {
    return NextResponse.json(
      { 
        error: "Bling OAuth not configured or token expired",
        hint: "Connect Bling integration at /integrations"
      },
      { status: 503 }
    );
  }

  // ---- 4. Fetch trip data with expenses ----
  const trip = await fetchTripWithExpenses(trip_id);
  if (!trip) {
    return NextResponse.json(
      { error: "Trip not found" },
      { status: 404 }
    );
  }

  // ---- 5. Fetch approved batches for this trip ----
  const batches = await fetchBatchesForTrip(trip_id);
  console.log(`[bling/sync] Found ${batches.length} approved batches`);
  if (batches.length === 0) {
    console.error(`[bling/sync] No approved batches found for trip ${trip_id}`);
    return NextResponse.json(
      { error: "No approved batches found for this trip", trip_id },
      { status: 400 }
    );
  }

  // ---- 6. Calculate products with financial rules ----
  const productsToSync = calcularProdutosParaBling(trip, batches);

  // ---- 7. Sync each product to Bling ----
  const results: Array<{
    sku: string;
    success: boolean;
    status: number;
    productId?: number;
    error?: string;
  }> = [];

  for (const product of productsToSync) {
    try {
      const blingResult = await callBlingApi(blingToken.access_token, product);
      const success = blingResult.status >= 200 && blingResult.status < 300;

      // Log sync attempt
      await logSync(
        batches.find((b) => b.product_sku === product.sku)?.id || null,
        action,
        { product, trip_id },
        blingResult.status,
        blingResult.body,
        success
      );

      // Mark batch as synced if successful
      if (success) {
        const batch = batches.find((b) => b.product_sku === product.sku);
        if (batch) {
          await markBatchAsSynced(batch.id);
        }
      }

      results.push({
        sku: product.sku,
        success,
        status: blingResult.status,
        productId: blingResult.productId,
        error: success ? undefined : JSON.stringify(blingResult.body),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      console.error(`[bling/sync] Exception for product ${product.sku}:`, message, err);
      
      await logSync(
        batches.find((b) => b.product_sku === product.sku)?.id || null,
        action,
        { product, trip_id },
        500,
        { error: message, stack: err instanceof Error ? err.stack : undefined },
        false
      );

      results.push({
        sku: product.sku,
        success: false,
        status: 500,
        error: message,
      });
    }
  }
  
  // ---- 8. Calculate summary ----
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  
  console.log(`[bling/sync] Sync completed - Total: ${results.length}, Successful: ${successful}, Failed: ${failed}`);

  // ---- 9. Return response ----
  return NextResponse.json({
    success: failed === 0,
    trip_id,
    action,
    summary: {
      total: productsToSync.length,
      successful,
      failed,
    },
    products: results,
    financial_summary: {
      custo_total_viagem: calcularCustoTotalViagem(trip.expenses),
      total_produtos: batches.reduce((sum, b) => sum + b.qty_valid, 0),
      exchange_rate_used: trip.final_exchange_rate ?? trip.estimated_exchange_rate,
    },
  }, { status: failed === 0 ? 200 : 207 });  // 207 Multi-Status se houver falhas parciais
}

// Only POST is accepted on this route
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

