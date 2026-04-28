import { getInventoryStock, getCategories, getTrips, getProducts } from "@/lib/supabase/queries";
import { InventoryClient } from "./inventory-client";

export default async function InventoryPage() {
  // eslint-disable-next-line no-console
  console.log("[InventoryPage] Starting data fetch...");

  let rows: Awaited<ReturnType<typeof getInventoryStock>> = [];
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let trips: Awaited<ReturnType<typeof getTrips>> = [];
  let products: Awaited<ReturnType<typeof getProducts>> = [];

  try {
    rows = await getInventoryStock();
    // eslint-disable-next-line no-console
    console.log(`[InventoryPage] Inventory rows fetched: ${rows.length}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[InventoryPage] Failed to fetch inventory stock:", err);
  }

  try {
    categories = await getCategories();
    // eslint-disable-next-line no-console
    console.log(`[InventoryPage] Categories fetched: ${categories.length}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[InventoryPage] Failed to fetch categories:", err);
  }

  try {
    trips = await getTrips();
    // eslint-disable-next-line no-console
    console.log(`[InventoryPage] Trips fetched: ${trips.length}`, trips.map(t => ({ id: t.id, name: t.name, status: t.status })));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[InventoryPage] Failed to fetch trips:", err);
  }

  try {
    products = await getProducts();
    // eslint-disable-next-line no-console
    console.log(`[InventoryPage] Products fetched: ${products.length}`, products.slice(0, 3).map(p => ({ sku: p.sku, name: p.name })));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[InventoryPage] Failed to fetch products:", err);
  }

  // Filter active trips (only planning or in_transit)
  const activeTrips = trips.filter((t) => t.status === "planning" || t.status === "in_transit");
  // eslint-disable-next-line no-console
  console.log(`[InventoryPage] Active trips (filtered): ${activeTrips.length}`, activeTrips.map(t => ({ id: t.id, name: t.name, origin: t.origin })));

  // Safety: ensure arrays are never undefined
  const safeRows = rows ?? [];
  const safeCategories = categories ?? [];
  const safeActiveTrips = activeTrips ?? [];
  const safeProducts = products ?? [];

  // eslint-disable-next-line no-console
  console.log("[InventoryPage] Props being passed to InventoryClient:", {
    initialRowsCount: safeRows.length,
    categoriesCount: safeCategories.length,
    activeTripsCount: safeActiveTrips.length,
    productsCount: safeProducts.length,
  });

  return (
    <InventoryClient
      initialRows={safeRows}
      categories={safeCategories}
      activeTrips={safeActiveTrips}
      products={safeProducts}
    />
  );
}