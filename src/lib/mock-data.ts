import type {
  Trip,
  TripExpense,
  InventoryBatch,
  Product,
  Category,
} from "@/types/database";

// ============================================================
// CATEGORIES
// ============================================================
export const MOCK_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Perfume", code: "PERF", description: "Perfumes e fragrâncias", created_at: "2025-01-01T00:00:00Z" },
  { id: "cat-2", name: "Cosmético", code: "COSM", description: "Skincare, maquiagem", created_at: "2025-01-01T00:00:00Z" },
  { id: "cat-3", name: "Eletrônico", code: "ELET", description: "Dispositivos eletrônicos", created_at: "2025-01-01T00:00:00Z" },
  { id: "cat-4", name: "Suplemento", code: "SUPL", description: "Vitaminas e suplementos", created_at: "2025-01-01T00:00:00Z" },
];

// ============================================================
// PRODUCTS
// ============================================================
export const MOCK_PRODUCTS: Product[] = [
  {
    sku: "SLR-PERF-BOSS-BLK",
    name: "Hugo Boss The Scent",
    brand: "Hugo Boss",
    category_id: "cat-1",
    model: "The Scent",
    variant: "100ml",
    base_markup: 45,
    weight_kg: 0.35,
    is_active: true,
    created_at: "2025-01-10T00:00:00Z",
    updated_at: "2025-01-10T00:00:00Z",
  },
  {
    sku: "SLR-PERF-DIOR-SAU",
    name: "Dior Sauvage EDP",
    brand: "Dior",
    category_id: "cat-1",
    model: "Sauvage",
    variant: "60ml",
    base_markup: 50,
    weight_kg: 0.28,
    is_active: true,
    created_at: "2025-01-10T00:00:00Z",
    updated_at: "2025-01-10T00:00:00Z",
  },
  {
    sku: "SLR-COSM-CERAVE-MW",
    name: "CeraVe Moisturizing Cream",
    brand: "CeraVe",
    category_id: "cat-2",
    model: "Moisturizing",
    variant: "539g",
    base_markup: 55,
    weight_kg: 0.6,
    is_active: true,
    created_at: "2025-01-15T00:00:00Z",
    updated_at: "2025-01-15T00:00:00Z",
  },
  {
    sku: "SLR-SUPL-CRTN-WHY",
    name: "Creatine Monohydrate",
    brand: "Optimum Nutrition",
    category_id: "cat-4",
    model: "Creatine",
    variant: "300g",
    base_markup: 60,
    weight_kg: 0.35,
    is_active: true,
    created_at: "2025-02-01T00:00:00Z",
    updated_at: "2025-02-01T00:00:00Z",
  },
  {
    sku: "SLR-PERF-YSL-LHOM",
    name: "YSL L'Homme EDP",
    brand: "Yves Saint Laurent",
    category_id: "cat-1",
    model: "L'Homme",
    variant: "100ml",
    base_markup: 48,
    weight_kg: 0.4,
    is_active: true,
    created_at: "2025-02-10T00:00:00Z",
    updated_at: "2025-02-10T00:00:00Z",
  },
];

// ============================================================
// TRIPS
// ============================================================
export const MOCK_TRIPS: Trip[] = [
  {
    id: "trip-1",
    name: "CDE Mar/2025",
    origin: "PY",
    start_date: "2025-03-05",
    end_date: "2025-03-08",
    estimated_exchange_rate: 5.35,
    final_exchange_rate: 5.48,
    status: "consolidada",
    notes: "Viagem de março — câmbio cartão veio acima do estimado.",
    created_by: "user-admin",
    created_at: "2025-02-20T00:00:00Z",
    updated_at: "2025-03-10T00:00:00Z",
  },
  {
    id: "trip-2",
    name: "Miami Abr/2025",
    origin: "EUA",
    start_date: "2025-04-10",
    end_date: null,
    estimated_exchange_rate: 5.20,
    final_exchange_rate: null,
    status: "in_transit",
    notes: "Foco em cosméticos e suplementos.",
    created_by: "user-admin",
    created_at: "2025-03-25T00:00:00Z",
    updated_at: "2025-04-11T00:00:00Z",
  },
  {
    id: "trip-3",
    name: "CDE Mai/2025",
    origin: "PY",
    start_date: "2025-05-14",
    end_date: null,
    estimated_exchange_rate: 5.40,
    final_exchange_rate: null,
    status: "planning",
    notes: null,
    created_by: "user-admin",
    created_at: "2025-04-30T00:00:00Z",
    updated_at: "2025-04-30T00:00:00Z",
  },
];

// ============================================================
// TRIP EXPENSES
// ============================================================
export const MOCK_EXPENSES: TripExpense[] = [
  // Trip 1 — CDE Mar/2025
  {
    id: "exp-1",
    trip_id: "trip-1",
    expense_type: "passagem_aerea",
    description: "Passagem de ida e volta — Aerolíneas",
    amount_usd: null,
    amount_brl: 1850.00,
    receipt_url: null,
    created_at: "2025-03-05T08:00:00Z",
  },
  {
    id: "exp-2",
    trip_id: "trip-1",
    expense_type: "hotel",
    description: "Hotel 3 noites — CDE Comfort Inn",
    amount_usd: null,
    amount_brl: 1200.00,
    receipt_url: null,
    created_at: "2025-03-05T08:30:00Z",
  },
  {
    id: "exp-3",
    trip_id: "trip-1",
    expense_type: "suborno_taxa_extra",
    description: "Taxa de passagem alfandegária PY-BR",
    amount_usd: null,
    amount_brl: 750.00,
    receipt_url: null,
    created_at: "2025-03-08T16:00:00Z",
  },
  {
    id: "exp-4",
    trip_id: "trip-1",
    expense_type: "frete",
    description: "Frete CDE → SP (Motoboy + Sedex)",
    amount_usd: null,
    amount_brl: 420.00,
    receipt_url: null,
    created_at: "2025-03-09T10:00:00Z",
  },
  // Trip 2 — Miami Abr/2025
  {
    id: "exp-5",
    trip_id: "trip-2",
    expense_type: "passagem_aerea",
    description: "Voo GRU-MIA-GRU — American Airlines",
    amount_usd: 890,
    amount_brl: 4628.00,
    receipt_url: null,
    created_at: "2025-04-10T06:00:00Z",
  },
  {
    id: "exp-6",
    trip_id: "trip-2",
    expense_type: "hotel",
    description: "Hotel 4 noites — Miami Beach Marriott",
    amount_usd: 640,
    amount_brl: 3328.00,
    receipt_url: null,
    created_at: "2025-04-10T14:00:00Z",
  },
];

// ============================================================
// INVENTORY BATCHES
// ============================================================
export const MOCK_BATCHES: InventoryBatch[] = [
  // Trip 1 — CDE Mar/2025
  {
    id: "batch-1",
    product_sku: "SLR-PERF-BOSS-BLK",
    trip_id: "trip-1",
    qty_purchased: 20,
    qty_lost_seized: 2,
    qty_valid: 18,
    purchase_price_usd: 42.00,
    real_unit_cost_brl: 363.78,
    suggested_price_brl: 527.48,
    final_price_brl: 520.00,
    status: "approved",
    margin_deviation_pct: 30.0,
    approved_by: "user-admin",
    approved_at: "2025-03-10T12:00:00Z",
    synced_to_bling_at: "2025-03-10T13:00:00Z",
    created_at: "2025-03-09T00:00:00Z",
    updated_at: "2025-03-10T13:00:00Z",
  },
  {
    id: "batch-2",
    product_sku: "SLR-PERF-DIOR-SAU",
    trip_id: "trip-1",
    qty_purchased: 15,
    qty_lost_seized: 0,
    qty_valid: 15,
    purchase_price_usd: 68.00,
    real_unit_cost_brl: 508.32,
    suggested_price_brl: 762.48,
    final_price_brl: 750.00,
    status: "approved",
    margin_deviation_pct: 32.2,
    approved_by: "user-admin",
    approved_at: "2025-03-10T12:00:00Z",
    synced_to_bling_at: "2025-03-10T13:00:00Z",
    created_at: "2025-03-09T00:00:00Z",
    updated_at: "2025-03-10T13:00:00Z",
  },
  {
    id: "batch-3",
    product_sku: "SLR-PERF-YSL-LHOM",
    trip_id: "trip-1",
    qty_purchased: 10,
    qty_lost_seized: 3,
    qty_valid: 7,
    purchase_price_usd: 85.00,
    real_unit_cost_brl: 665.12,
    suggested_price_brl: 983.38,
    final_price_brl: null,
    status: "pending",
    margin_deviation_pct: null,
    approved_by: null,
    approved_at: null,
    synced_to_bling_at: null,
    created_at: "2025-03-09T00:00:00Z",
    updated_at: "2025-03-09T00:00:00Z",
  },
  // Trip 2 — Miami Abr/2025
  {
    id: "batch-4",
    product_sku: "SLR-COSM-CERAVE-MW",
    trip_id: "trip-2",
    qty_purchased: 30,
    qty_lost_seized: 0,
    qty_valid: 30,
    purchase_price_usd: 18.00,
    real_unit_cost_brl: null,
    suggested_price_brl: null,
    final_price_brl: null,
    status: "pending",
    margin_deviation_pct: null,
    approved_by: null,
    approved_at: null,
    synced_to_bling_at: null,
    created_at: "2025-04-11T00:00:00Z",
    updated_at: "2025-04-11T00:00:00Z",
  },
  {
    id: "batch-5",
    product_sku: "SLR-SUPL-CRTN-WHY",
    trip_id: "trip-2",
    qty_purchased: 24,
    qty_lost_seized: 4,
    qty_valid: 20,
    purchase_price_usd: 22.00,
    real_unit_cost_brl: null,
    suggested_price_brl: null,
    final_price_brl: null,
    status: "pending",
    margin_deviation_pct: null,
    approved_by: null,
    approved_at: null,
    synced_to_bling_at: null,
    created_at: "2025-04-11T00:00:00Z",
    updated_at: "2025-04-11T00:00:00Z",
  },
];

// ============================================================
// HELPERS — lookup maps
// ============================================================
export const PRODUCTS_BY_SKU = Object.fromEntries(
  MOCK_PRODUCTS.map((p) => [p.sku, p]),
);

export const EXPENSES_BY_TRIP = MOCK_EXPENSES.reduce<
  Record<string, TripExpense[]>
>((acc, e) => {
  (acc[e.trip_id] ??= []).push(e);
  return acc;
}, {});

export const BATCHES_BY_TRIP = MOCK_BATCHES.reduce<
  Record<string, InventoryBatch[]>
>((acc, b) => {
  (acc[b.trip_id] ??= []).push(b);
  return acc;
}, {});

// ============================================================
// ABSORPTION COST ENGINE (client-side simulation)
// ============================================================
export function computeAbsorptionCosts(
  batches: InventoryBatch[],
  expenses: TripExpense[],
  exchangeRate: number,
): InventoryBatch[] {
  const totalExpensesBRL = expenses.reduce((s, e) => s + e.amount_brl, 0);
  const totalValidUnits = batches.reduce((s, b) => s + b.qty_valid, 0);

  if (totalValidUnits === 0) return batches;

  const indirectCostPerUnit = totalExpensesBRL / totalValidUnits;

  return batches.map((b) => {
    if (b.qty_valid === 0) return { ...b, real_unit_cost_brl: null };

    const directCost = b.purchase_price_usd * exchangeRate;
    const realUnitCost = directCost + indirectCostPerUnit;

    const product = PRODUCTS_BY_SKU[b.product_sku];
    const markup = product?.base_markup ?? 45;
    const suggestedPrice = realUnitCost * (1 + markup / 100);

    const marginPct =
      b.final_price_brl && b.final_price_brl > 0
        ? ((b.final_price_brl - realUnitCost) / b.final_price_brl) * 100
        : null;

    return {
      ...b,
      real_unit_cost_brl: realUnitCost,
      suggested_price_brl: suggestedPrice,
      margin_deviation_pct: marginPct,
    };
  });
}
