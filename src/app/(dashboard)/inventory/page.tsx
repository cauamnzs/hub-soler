import { getInventoryStock, getCategories, getTrips, getProducts } from "@/lib/supabase/queries";
import { InventoryClient } from "./inventory-client";

export default async function InventoryPage() {
  const [rows, categories, trips, products] = await Promise.all([
    getInventoryStock(),
    getCategories(),
    getTrips(),
    getProducts(),
  ]);

  const activeTrips = trips.filter((t) => t.status !== "consolidada");

  return (
    <InventoryClient
      initialRows={rows}
      categories={categories}
      activeTrips={activeTrips}
      products={products}
    />
  );
}