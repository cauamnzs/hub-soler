-- ============================================================
-- HUB SOLER — Supabase Schema
-- Custeio por Absorção para Operação de Importação EUA / PY
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

CREATE TYPE public.user_role      AS ENUM ('admin', 'finance', 'operations', 'marketing');
CREATE TYPE public.trip_status    AS ENUM ('planning', 'in_transit', 'consolidada');
CREATE TYPE public.trip_origin    AS ENUM ('EUA', 'PY');
CREATE TYPE public.expense_type   AS ENUM ('mercadoria', 'passagem_aerea', 'hotel', 'suborno_taxa_extra', 'frete', 'outros');
CREATE TYPE public.batch_status   AS ENUM ('pending', 'approved', 'synced_bling');

-- ============================================================
-- 2. TABLES
-- ============================================================

-- 2.1  Profiles  (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT        NOT NULL,
  role       public.user_role NOT NULL DEFAULT 'operations',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2  Categories  (drives SKU prefix)
CREATE TABLE public.categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,           -- ex: "Perfume", "Cosmético"
  code        TEXT NOT NULL UNIQUE,           -- 3-4 chars: "PERF", "COSM"
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3  Trips
CREATE TABLE public.trips (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                    TEXT        NOT NULL,                -- ex: "CDE Jan/2025"
  origin                  public.trip_origin NOT NULL,
  start_date              DATE        NOT NULL,
  end_date                DATE,
  estimated_exchange_rate  NUMERIC(10,4) NOT NULL,
  final_exchange_rate      NUMERIC(10,4),                      -- updated after card bill
  status                  public.trip_status NOT NULL DEFAULT 'planning',
  notes                   TEXT,
  created_by              UUID        NOT NULL REFERENCES public.profiles(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4  Trip Expenses
CREATE TABLE public.trip_expenses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id      UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  expense_type public.expense_type NOT NULL,
  description  TEXT,
  amount_usd   NUMERIC(12,2),
  amount_brl   NUMERIC(12,2) NOT NULL,
  receipt_url  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.5  Products  (master catalog — SKU is auto-generated)
CREATE TABLE public.products (
  sku         TEXT PRIMARY KEY,               -- SLR-[CAT]-[MOD]-[VAR]
  name        TEXT NOT NULL,
  brand       TEXT,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  model       TEXT NOT NULL,
  variant     TEXT,                            -- colour / size
  base_markup NUMERIC(5,2) NOT NULL DEFAULT 40.00,
  weight_kg   NUMERIC(6,3),
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.6  Inventory Batches  (coração do sistema)
CREATE TABLE public.inventory_batches (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_sku         TEXT    NOT NULL REFERENCES public.products(sku),
  trip_id             UUID    NOT NULL REFERENCES public.trips(id),
  qty_purchased       INTEGER NOT NULL CHECK (qty_purchased > 0),
  qty_lost_seized     INTEGER NOT NULL DEFAULT 0 CHECK (qty_lost_seized >= 0),
  qty_valid           INTEGER GENERATED ALWAYS AS (qty_purchased - qty_lost_seized) STORED,
  purchase_price_usd  NUMERIC(12,2) NOT NULL,
  real_unit_cost_brl  NUMERIC(12,2),           -- calculated by engine
  suggested_price_brl NUMERIC(12,2),           -- real_unit_cost × (1 + markup)
  final_price_brl     NUMERIC(12,2),           -- approved by admin
  status              public.batch_status NOT NULL DEFAULT 'pending',
  margin_deviation_pct NUMERIC(5,2),           -- alert field
  approved_by         UUID REFERENCES public.profiles(id),
  approved_at         TIMESTAMPTZ,
  synced_to_bling_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_qty CHECK (qty_lost_seized <= qty_purchased)
);

-- 2.7  Bling Sync Log
CREATE TABLE public.bling_sync_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id      UUID    NOT NULL REFERENCES public.inventory_batches(id),
  action        TEXT    NOT NULL,              -- 'create' | 'update' | 'price_update'
  payload       JSONB   NOT NULL,
  response_code INTEGER,
  response_body JSONB,
  success       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.8  Express Sales  (WhatsApp / balcão)
CREATE TABLE public.express_sales (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id       UUID    NOT NULL REFERENCES public.inventory_batches(id),
  qty_sold       INTEGER NOT NULL CHECK (qty_sold > 0),
  sale_price_brl NUMERIC(12,2) NOT NULL,
  customer_name  TEXT,
  customer_phone TEXT,
  notes          TEXT,
  created_by     UUID NOT NULL REFERENCES public.profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX idx_trips_status       ON public.trips(status);
CREATE INDEX idx_trips_origin       ON public.trips(origin);
CREATE INDEX idx_expenses_trip      ON public.trip_expenses(trip_id);
CREATE INDEX idx_products_category  ON public.products(category_id);
CREATE INDEX idx_batches_trip       ON public.inventory_batches(trip_id);
CREATE INDEX idx_batches_product    ON public.inventory_batches(product_sku);
CREATE INDEX idx_batches_status     ON public.inventory_batches(status);
CREATE INDEX idx_sync_batch         ON public.bling_sync_log(batch_id);

-- ============================================================
-- 4. FUNCTIONS — SKU Generation
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_product_sku()
RETURNS TRIGGER AS $$
DECLARE
  v_cat_code TEXT;
  v_model    TEXT;
  v_variant  TEXT;
  v_base     TEXT;
  v_seq      INTEGER;
BEGIN
  SELECT code INTO v_cat_code
    FROM public.categories
   WHERE id = NEW.category_id;

  v_model   := upper(left(regexp_replace(NEW.model,   '\s+', '', 'g'), 4));
  v_variant := upper(left(regexp_replace(coalesce(NEW.variant, 'STD'), '\s+', '', 'g'), 3));
  v_base    := 'SLR-' || v_cat_code || '-' || v_model || '-' || v_variant;

  IF EXISTS (SELECT 1 FROM public.products WHERE sku = v_base) THEN
    SELECT count(*) + 1 INTO v_seq
      FROM public.products
     WHERE sku LIKE v_base || '%';
    NEW.sku := v_base || '-' || lpad(v_seq::text, 3, '0');
  ELSE
    NEW.sku := v_base;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_sku
  BEFORE INSERT ON public.products
  FOR EACH ROW
  WHEN (NEW.sku IS NULL OR NEW.sku = '')
  EXECUTE FUNCTION public.generate_product_sku();

-- ============================================================
-- 5. FUNCTIONS — Absorption Costing Engine
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalculate_trip_costs(p_trip_id UUID)
RETURNS VOID AS $$
DECLARE
  v_exchange_rate       NUMERIC;
  v_total_expenses_brl  NUMERIC;
  v_total_valid_items   INTEGER;
  v_cost_per_valid_unit NUMERIC;
  rec                   RECORD;
BEGIN
  -- Resolve exchange rate (final preferred, fallback to estimated)
  SELECT coalesce(final_exchange_rate, estimated_exchange_rate)
    INTO v_exchange_rate
    FROM public.trips
   WHERE id = p_trip_id;

  -- Sum ALL trip expenses (passagem + hotel + frete + suborno + tudo)
  SELECT coalesce(sum(amount_brl), 0)
    INTO v_total_expenses_brl
    FROM public.trip_expenses
   WHERE trip_id = p_trip_id;

  -- Total valid items across every batch of this trip
  SELECT coalesce(sum(qty_valid), 0)
    INTO v_total_valid_items
    FROM public.inventory_batches
   WHERE trip_id = p_trip_id
     AND qty_valid > 0;

  IF v_total_valid_items = 0 THEN RETURN; END IF;

  -- Indirect cost absorbed per valid unit
  v_cost_per_valid_unit := v_total_expenses_brl / v_total_valid_items;

  -- Recalculate each batch
  FOR rec IN
    SELECT ib.id,
           ib.purchase_price_usd,
           ib.final_price_brl,
           p.base_markup
      FROM public.inventory_batches ib
      JOIN public.products p ON p.sku = ib.product_sku
     WHERE ib.trip_id = p_trip_id
       AND ib.qty_valid > 0
  LOOP
    UPDATE public.inventory_batches
       SET real_unit_cost_brl  = (rec.purchase_price_usd * v_exchange_rate) + v_cost_per_valid_unit,
           suggested_price_brl = ((rec.purchase_price_usd * v_exchange_rate) + v_cost_per_valid_unit)
                                  * (1 + rec.base_markup / 100),
           margin_deviation_pct = CASE
             WHEN rec.final_price_brl IS NOT NULL AND rec.final_price_brl > 0
             THEN ((rec.final_price_brl
                    - ((rec.purchase_price_usd * v_exchange_rate) + v_cost_per_valid_unit))
                   / rec.final_price_brl) * 100
             ELSE NULL
           END,
           updated_at = now()
     WHERE id = rec.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. TRIGGERS — Automatic Recalculation
-- ============================================================

-- 6a. When final_exchange_rate is updated on a trip
CREATE OR REPLACE FUNCTION public.on_trip_exchange_rate_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.final_exchange_rate IS DISTINCT FROM OLD.final_exchange_rate THEN
    PERFORM public.recalculate_trip_costs(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_exchange_rate_update
  AFTER UPDATE OF final_exchange_rate ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.on_trip_exchange_rate_update();

-- 6b. When expenses are added / changed / removed
CREATE OR REPLACE FUNCTION public.on_expense_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.recalculate_trip_costs(coalesce(NEW.trip_id, OLD.trip_id));
  RETURN coalesce(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_expense_change
  AFTER INSERT OR UPDATE OR DELETE ON public.trip_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.on_expense_change();

-- 6c. When batch quantities change (loss recorded)
CREATE OR REPLACE FUNCTION public.on_batch_qty_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.qty_lost_seized IS DISTINCT FROM OLD.qty_lost_seized
     OR NEW.qty_purchased IS DISTINCT FROM OLD.qty_purchased THEN
    PERFORM public.recalculate_trip_costs(NEW.trip_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_batch_qty_change
  AFTER UPDATE OF qty_purchased, qty_lost_seized ON public.inventory_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.on_batch_qty_change();

-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_expenses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bling_sync_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.express_sales     ENABLE ROW LEVEL SECURITY;

-- Helper: resolve current user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 7a. Profiles
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_manage"
  ON public.profiles FOR ALL
  USING (public.get_user_role() = 'admin');

-- 7b. Categories  (everyone reads; admin/finance manage)
CREATE POLICY "categories_select"
  ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_manage"
  ON public.categories FOR ALL
  USING (public.get_user_role() IN ('admin', 'finance'));

-- 7c. Trips  (everyone reads; admin/finance manage)
CREATE POLICY "trips_select"
  ON public.trips FOR SELECT USING (true);
CREATE POLICY "trips_manage"
  ON public.trips FOR ALL
  USING (public.get_user_role() IN ('admin', 'finance'));

-- 7d. Trip Expenses  (admin + finance ONLY)
CREATE POLICY "expenses_select"
  ON public.trip_expenses FOR SELECT
  USING (public.get_user_role() IN ('admin', 'finance'));
CREATE POLICY "expenses_manage"
  ON public.trip_expenses FOR ALL
  USING (public.get_user_role() IN ('admin', 'finance'));

-- 7e. Products  (everyone reads; admin/finance/ops manage)
CREATE POLICY "products_select"
  ON public.products FOR SELECT USING (true);
CREATE POLICY "products_manage"
  ON public.products FOR ALL
  USING (public.get_user_role() IN ('admin', 'finance', 'operations'));

-- 7f. Inventory Batches
CREATE POLICY "batches_admin_finance"
  ON public.inventory_batches FOR ALL
  USING (public.get_user_role() IN ('admin', 'finance'));
CREATE POLICY "batches_ops_select"
  ON public.inventory_batches FOR SELECT
  USING (public.get_user_role() = 'operations');
CREATE POLICY "batches_ops_insert"
  ON public.inventory_batches FOR INSERT
  WITH CHECK (public.get_user_role() = 'operations');
CREATE POLICY "batches_ops_update_pending"
  ON public.inventory_batches FOR UPDATE
  USING (public.get_user_role() = 'operations' AND status = 'pending');
CREATE POLICY "batches_marketing_in_transit"
  ON public.inventory_batches FOR SELECT
  USING (
    public.get_user_role() = 'marketing'
    AND trip_id IN (SELECT id FROM public.trips WHERE status = 'in_transit')
  );

-- 7g. Bling Sync Log  (admin only)
CREATE POLICY "sync_admin"
  ON public.bling_sync_log FOR ALL
  USING (public.get_user_role() = 'admin');

-- 7h. Express Sales  (admin only)
CREATE POLICY "express_admin"
  ON public.express_sales FOR ALL
  USING (public.get_user_role() = 'admin');

-- ============================================================
-- 8. VIEWS — Role-safe projections
-- ============================================================

-- Operations view: NO financial data exposed
CREATE OR REPLACE VIEW public.v_inventory_operations AS
SELECT
  ib.id,
  p.sku,
  p.name,
  p.brand,
  c.name   AS category_name,
  t.name   AS trip_name,
  t.origin,
  t.status AS trip_status,
  ib.qty_purchased,
  ib.qty_lost_seized,
  ib.qty_valid,
  ib.status AS batch_status
FROM public.inventory_batches ib
JOIN public.products   p ON p.sku = ib.product_sku
JOIN public.categories c ON c.id  = p.category_id
JOIN public.trips      t ON t.id  = ib.trip_id;

-- Marketing view: only in-transit pipeline
CREATE OR REPLACE VIEW public.v_marketing_pipeline AS
SELECT
  p.name,
  p.brand,
  c.name     AS category_name,
  t.name     AS trip_name,
  t.origin,
  ib.qty_purchased,
  t.end_date AS expected_arrival
FROM public.inventory_batches ib
JOIN public.products   p ON p.sku = ib.product_sku
JOIN public.categories c ON c.id  = p.category_id
JOIN public.trips      t ON t.id  = ib.trip_id
WHERE t.status = 'in_transit';

-- ============================================================
-- 9. SEED DATA  (Categories)
-- ============================================================

INSERT INTO public.categories (name, code, description) VALUES
  ('Perfume',     'PERF', 'Perfumes e fragrâncias'),
  ('Cosmético',   'COSM', 'Skincare, maquiagem, cuidados'),
  ('Eletrônico',  'ELET', 'Dispositivos e acessórios eletrônicos'),
  ('Vestuário',   'VEST', 'Roupas, calçados, acessórios'),
  ('Suplemento',  'SUPL', 'Vitaminas e suplementos'),
  ('Outros',      'OUTR', 'Itens diversos');
