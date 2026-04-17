import { createClient } from "@/lib/supabase/server";
import type {
  Trip,
  TripExpense,
  Product,
  Category,
  InventoryBatch,
  ProductWithCategory,
  BatchWithProduct,
  InventoryStockRow,
} from "@/types/database";

// ============================================================
// CATEGORIES
// ============================================================

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  if (error) throw new Error(`getCategories: ${error.message}`);
  return data;
}

// ============================================================
// TRIPS
// ============================================================

export async function getTrips(): Promise<Trip[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getTrips: ${error.message}`);
  return data;
}

export async function getTripById(id: string): Promise<Trip | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`getTripById: ${error.message}`);
  }
  return data;
}

// ============================================================
// TRIP EXPENSES
// ============================================================

export async function getExpensesByTrip(tripId: string): Promise<TripExpense[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trip_expenses")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at");
  if (error) throw new Error(`getExpensesByTrip: ${error.message}`);
  return data;
}

// ============================================================
// PRODUCTS
// ============================================================

export async function getProducts(): Promise<ProductWithCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(*)")
    .order("name");
  if (error) throw new Error(`getProducts: ${error.message}`);
  return data as ProductWithCategory[];
}

export async function getProductSkus(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("sku");
  if (error) throw new Error(`getProductSkus: ${error.message}`);
  return (data as { sku: string }[]).map((r) => r.sku);
}

export async function getActiveProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`getActiveProducts: ${error.message}`);
  return data;
}

// ============================================================
// INVENTORY BATCHES
// ============================================================

export async function getBatchesByTrip(tripId: string): Promise<BatchWithProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_batches")
    .select("*, products(name, brand, base_markup)")
    .eq("trip_id", tripId)
    .order("created_at");
  if (error) throw new Error(`getBatchesByTrip: ${error.message}`);
  return data as BatchWithProduct[];
}

export async function getInventoryStock(): Promise<InventoryStockRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_batches")
    .select(`
      id,
      product_sku,
      qty_purchased,
      qty_lost_seized,
      qty_valid,
      purchase_price_usd,
      status,
      trip_id,
      products (
        sku,
        name,
        brand,
        category_id,
        categories ( id, name, code )
      ),
      trips ( name, status )
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getInventoryStock: ${error.message}`);

  return (data as unknown[]).map((row: unknown) => {
    const r = row as {
      id: string;
      product_sku: string;
      qty_purchased: number;
      qty_lost_seized: number;
      qty_valid: number;
      purchase_price_usd: number;
      status: InventoryBatch["status"];
      products: {
        sku: string;
        name: string;
        brand: string | null;
        category_id: string;
        categories: { id: string; name: string; code: string };
      };
      trips: { name: string; status: Trip["status"] } | null;
    };
    return {
      id: r.id,
      sku: r.products.sku,
      name: r.products.name,
      brand: r.products.brand,
      category_id: r.products.category_id,
      category_name: r.products.categories.name,
      category_code: r.products.categories.code,
      trip_name: r.trips?.name ?? null,
      trip_status: r.trips?.status ?? null,
      qty_purchased: r.qty_purchased,
      qty_lost: r.qty_lost_seized,  // Alias para compatibilidade com UI
      qty_lost_seized: r.qty_lost_seized,
      qty_valid: r.qty_valid,
      purchase_price_usd: r.purchase_price_usd,
      batch_status: r.status,
    } satisfies InventoryStockRow;
  });
}

export async function getExpressCatalog(): Promise<InventoryStockRow[]> {
  const rows = await getInventoryStock();
  return rows.filter((r) => r.qty_valid > 0);
}
