/**
 * Hub Soler — Sincronização de Catálogo Bling → Supabase
 *
 * Fluxo: busca produtos do Bling V3 e faz upsert na tabela `products`
 * do catálogo público (schema do solerShop), usando `sku` como chave.
 *
 * Colunas alvo: sku, name, brand, price, image_url, description, is_active
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CatalogProductInsert } from "@/types/database";

const BLING_API_BASE = process.env.BLING_API_BASE_URL ?? "https://api.bling.com.br/Api/v3";

// ---- Tipos ----

type BlingProdutoItem = {
  codigo: string;
  nome: string;
  preco: number;
  descricao?: string;
  situacao: "A" | "I";
  marca?: string;
  imageThumbnail?: string;
};

type BlingProdutosResponse = {
  data: BlingProdutoItem[];
};

export type CatalogProduct = CatalogProductInsert;

export type SyncResult = {
  synced: number;
  skipped: number;
  errors: { sku: string; message: string }[];
};

// ---- Fetch Bling ----

async function fetchBlingProducts(accessToken: string): Promise<BlingProdutoItem[]> {
  const pageSize = 100;
  let page = 1;
  const all: BlingProdutoItem[] = [];

  while (true) {
    const res = await fetch(
      `${BLING_API_BASE}/produtos?limite=${pageSize}&pagina=${page}&situacao=A`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Bling API ${res.status}: ${body}`);
    }

    const json: BlingProdutosResponse = await res.json();
    const items = json.data ?? [];
    all.push(...items);

    if (items.length < pageSize) break;
    page++;
  }

  return all;
}

// ---- Mapper ----

function mapBlingToProduct(item: BlingProdutoItem): CatalogProduct {
  return {
    sku: item.codigo,
    name: item.nome,
    brand: item.marca ?? "",
    price: item.preco ?? 0,
    image_url: item.imageThumbnail ?? "",
    description: item.descricao ?? "",
    is_active: item.situacao === "A",
  };
}

// ---- Upsert no Supabase ----

async function upsertProducts(products: CatalogProduct[]): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, skipped: 0, errors: [] };
  const BATCH = 50;

  for (let i = 0; i < products.length; i += BATCH) {
    const chunk = products.slice(i, i + BATCH);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin.from("catalog_products") as any)
      .upsert(chunk, { onConflict: "sku", ignoreDuplicates: false });

    if (error) {
      chunk.forEach((p) =>
        result.errors.push({ sku: p.sku, message: error.message })
      );
    } else {
      result.synced += chunk.length;
    }
  }

  return result;
}

// ---- Função Principal ----

export async function syncCatalogFromBling(accessToken: string): Promise<SyncResult> {
  const blingItems = await fetchBlingProducts(accessToken);

  if (blingItems.length === 0) {
    return { synced: 0, skipped: 0, errors: [] };
  }

  const products = blingItems
    .filter((item) => Boolean(item.codigo))
    .map(mapBlingToProduct);

  return upsertProducts(products);
}

/**
 * Mock para usar sem credenciais Bling (demo/testes).
 * Faz upsert direto dos produtos fornecidos.
 */
export async function syncCatalogMock(products: CatalogProduct[]): Promise<SyncResult> {
  return upsertProducts(products);
}
