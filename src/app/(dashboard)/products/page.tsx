import { getProducts, getCategories } from "@/lib/supabase/queries";
import { ProductsClient } from "./products-client";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return <ProductsClient initialProducts={products} categories={categories} />;
}

