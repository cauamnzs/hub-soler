-- ============================================================
-- HUB SOLER — Migration 006
-- Tabela de catálogo público para o solerShop frontend
-- Separada da tabela products interna (ERP)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.catalog_products (
  sku         TEXT PRIMARY KEY,
  name        TEXT        NOT NULL,
  brand       TEXT        NOT NULL DEFAULT '',
  price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  image_url   TEXT        NOT NULL DEFAULT '',
  description TEXT        NOT NULL DEFAULT '',
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_catalog_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER catalog_products_updated_at
  BEFORE UPDATE ON public.catalog_products
  FOR EACH ROW EXECUTE FUNCTION public.set_catalog_updated_at();

-- ============================================================
-- RLS — Leitura pública, escrita apenas pelo service_role
-- ============================================================

ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;

-- Leitura pública (anon e authenticated podem ler produtos ativos)
CREATE POLICY "Public read active catalog products"
  ON public.catalog_products
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Escrita bloqueada para anon e authenticated (só service_role escreve)
REVOKE INSERT, UPDATE, DELETE ON public.catalog_products FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.catalog_products FROM authenticated;

-- Storage bucket para imagens premium (criar via dashboard ou script)
-- Bucket: produtos-premium | Público: true
-- INSERT INTO storage.buckets (id, name, public) VALUES ('produtos-premium', 'produtos-premium', true)
-- ON CONFLICT (id) DO NOTHING;
