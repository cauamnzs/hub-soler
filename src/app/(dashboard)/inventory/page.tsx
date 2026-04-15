import { getInventoryStock, getCategories, getTrips } from "@/lib/supabase/queries";
import { InventoryClient } from "./inventory-client";

export default async function InventoryPage() {
  const [rows, categories, trips] = await Promise.all([
    getInventoryStock(),
    getCategories(),
    getTrips(),
  ]);

  const activeTrips = trips.filter((t) => t.status !== "consolidada");

  return (
    <InventoryClient
      initialRows={rows}
      categories={categories}
      activeTrips={activeTrips}
    />
  );
}