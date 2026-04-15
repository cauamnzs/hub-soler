import { createClient } from "@/lib/supabase/server";
import type { TripSummary, DashboardAlert } from "@/types/database";

export type DashboardKpis = {
  total_invested_brl: number;
  total_revenue_brl: number;
  net_profit_brl: number;
  roi_pct: number;
};

// ============================================================
// Dashboard aggregation RPCs
// ============================================================

export async function getTripSummaries(): Promise<TripSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_trip_summaries");
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("getTripSummaries RPC failed:", error.message);
    return [];
  }
  return (data as TripSummary[]) ?? [];
}

export async function getDashboardAlerts(): Promise<DashboardAlert[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_dashboard_alerts");
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("getDashboardAlerts RPC failed:", error.message);
    return [];
  }
  return (data as DashboardAlert[]) ?? [];
}

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_dashboard_kpis");
  if (error) {
    // Graceful fallback if RPC doesn't exist yet (migration not applied)
    // eslint-disable-next-line no-console
    console.warn("getDashboardKpis RPC failed, returning zeros:", error.message);
    return {
      total_invested_brl: 0,
      total_revenue_brl: 0,
      net_profit_brl: 0,
      roi_pct: 0,
    };
  }
  const row = ((data as DashboardKpis[]) ?? [])[0];
  return row ?? {
    total_invested_brl: 0,
    total_revenue_brl: 0,
    net_profit_brl: 0,
    roi_pct: 0,
  };
}
