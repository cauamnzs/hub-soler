import { getTrips } from "@/lib/supabase/queries";
import { TripsClient } from "./trips-client";

export default async function TripsPage() {
  const trips = await getTrips();
  return <TripsClient initialTrips={trips} />;
}

