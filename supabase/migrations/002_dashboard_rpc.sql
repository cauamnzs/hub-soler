-- ============================================================
-- HUB SOLER — Migration 002
-- Dashboard RPC functions for KPI aggregation
-- ============================================================

-- ============================================================
-- 1. get_trip_summaries()
--    Returns all trips with computed financial aggregates:
--    total_items, total_invested_brl, avg_margin_pct
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_trip_summaries()
RETURNS TABLE (
  id                     UUID,
  name                   TEXT,
  origin                 public.trip_origin,
  status                 public.trip_status,
  start_date             DATE,
  end_date               DATE,
  estimated_exchange_rate NUMERIC,
  final_exchange_rate    NUMERIC,
  total_items            BIGINT,
  total_invested_brl     NUMERIC,
  avg_margin_pct         NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.origin,
    t.status,
    t.start_date,
    t.end_date,
    t.estimated_exchange_rate,
    t.final_exchange_rate,
    coalesce(agg.total_items, 0)         AS total_items,
    coalesce(agg.total_invested_brl, 0)  AS total_invested_brl,
    agg.avg_margin_pct
  FROM public.trips t
  LEFT JOIN (
    SELECT
      ib.trip_id,
      sum(ib.qty_valid)                                           AS total_items,
      sum(
        ib.purchase_price_usd
        * ib.qty_purchased
        * coalesce(t2.final_exchange_rate, t2.estimated_exchange_rate)
      )                                                           AS total_invested_brl,
      avg(ib.margin_deviation_pct)                               AS avg_margin_pct
    FROM public.inventory_batches ib
    JOIN public.trips t2 ON t2.id = ib.trip_id
    GROUP BY ib.trip_id
  ) agg ON agg.trip_id = t.id
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 2. get_dashboard_alerts()
--    Returns batches where actual margin is below 85% of
--    the product's base_markup target — i.e. margin risk.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_alerts()
RETURNS TABLE (
  batch_id             UUID,
  product_name         TEXT,
  trip_name            TEXT,
  margin_deviation_pct NUMERIC,
  base_markup          NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ib.id                    AS batch_id,
    p.name                   AS product_name,
    t.name                   AS trip_name,
    ib.margin_deviation_pct,
    p.base_markup
  FROM public.inventory_batches ib
  JOIN public.products p ON p.sku = ib.product_sku
  JOIN public.trips    t ON t.id  = ib.trip_id
  WHERE
    ib.margin_deviation_pct IS NOT NULL
    AND ib.margin_deviation_pct < (p.base_markup * 0.85)
    AND ib.qty_valid > 0
  ORDER BY ib.margin_deviation_pct ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 3. get_dashboard_kpis()
--    Single-row aggregate across all trips for the KPI cards
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_kpis()
RETURNS TABLE (
  total_invested_brl   NUMERIC,
  total_revenue_brl    NUMERIC,
  net_profit_brl       NUMERIC,
  roi_pct              NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    coalesce(
      sum(ib.purchase_price_usd * ib.qty_purchased * coalesce(t.final_exchange_rate, t.estimated_exchange_rate)),
      0
    )                                                            AS total_invested_brl,
    coalesce(
      sum(ib.final_price_brl * ib.qty_valid),
      0
    )                                                            AS total_revenue_brl,
    coalesce(
      sum(ib.final_price_brl * ib.qty_valid)
      - sum(ib.real_unit_cost_brl * ib.qty_valid),
      0
    )                                                            AS net_profit_brl,
    CASE
      WHEN sum(ib.purchase_price_usd * ib.qty_purchased * coalesce(t.final_exchange_rate, t.estimated_exchange_rate)) > 0
      THEN (
        (
          coalesce(sum(ib.final_price_brl * ib.qty_valid), 0)
          - sum(ib.purchase_price_usd * ib.qty_purchased * coalesce(t.final_exchange_rate, t.estimated_exchange_rate))
        )
        / sum(ib.purchase_price_usd * ib.qty_purchased * coalesce(t.final_exchange_rate, t.estimated_exchange_rate))
      ) * 100
      ELSE 0
    END                                                          AS roi_pct
  FROM public.inventory_batches ib
  JOIN public.trips t ON t.id = ib.trip_id
  WHERE ib.qty_valid > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
