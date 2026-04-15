import { notFound } from "next/navigation";
import { getTripById, getExpensesByTrip, getBatchesByTrip } from "@/lib/supabase/queries";
import { TripDetailClient } from "./trip-detail-client";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [trip, expenses, batches] = await Promise.all([
    getTripById(id),
    getExpensesByTrip(id),
    getBatchesByTrip(id),
  ]);

  if (!trip) notFound();

  return <TripDetailClient trip={trip} expenses={expenses} batches={batches} />;
}