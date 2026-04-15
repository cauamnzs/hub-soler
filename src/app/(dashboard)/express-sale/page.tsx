import { getExpressCatalog } from "@/lib/supabase/queries";
import { ExpressSaleClient } from "./express-sale-client";

export default async function ExpressSalePage() {
  const catalogRows = await getExpressCatalog();
  return <ExpressSaleClient catalogRows={catalogRows} />;
}