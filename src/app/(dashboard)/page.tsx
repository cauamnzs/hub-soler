import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Package,
  Plane,
  AlertTriangle,
  MessageSquare,
  Clock,
} from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";
import { getDashboardKpis, getTripSummaries, getDashboardAlerts } from "@/lib/supabase/rpc";

// ============================================================
// COMPONENTS
// ============================================================

function TripStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    planning: { label: "Planejando", className: "bg-muted text-muted-foreground" },
    in_transit: { label: "Em Trânsito", className: "bg-blue-500/10 text-blue-500" },
    consolidada: { label: "Consolidada", className: "bg-emerald-500/10 text-emerald-500" },
  };
  const c = config[status] ?? config.planning;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        c.className,
      )}
    >
      {c.label}
    </span>
  );
}

// ============================================================
// PAGE (Server Component)
// ============================================================

export default async function AdminDashboard() {
  const [kpis, tripSummaries, alerts] = await Promise.all([
    getDashboardKpis(),
    getTripSummaries(),
    getDashboardAlerts(),
  ]);

  const stats = [
    {
      label: "Investimento Total",
      value: formatBRL(kpis.total_invested_brl),
      icon: DollarSign,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Receita Total",
      value: formatBRL(kpis.total_revenue_brl),
      icon: TrendingUp,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Lucro Líquido",
      value: formatBRL(kpis.net_profit_brl),
      icon: DollarSign,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "ROI Global",
      value: `${kpis.roi_pct.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-fade-in">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão executiva consolidada de todas as operações.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className={cn("rounded-lg p-2", stat.bg)}>
                  <Icon size={18} className={stat.color} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trip summaries */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Plane size={16} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold">Viagens Recentes</h2>
            </div>
            <Link
              href="/trips"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Ver todas
            </Link>
          </div>
          <div className="overflow-x-auto">
            {tripSummaries.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Plane size={28} className="text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground">Nenhuma viagem ainda.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Viagem</th>
                    <th className="px-5 py-3 font-medium">Origem</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Itens</th>
                    <th className="px-5 py-3 font-medium text-right">Investido</th>
                    <th className="px-5 py-3 font-medium text-right">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {tripSummaries.slice(0, 5).map((trip) => (
                    <tr
                      key={trip.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-medium">
                        <Link href={`/trips/${trip.id}`} className="hover:underline">
                          {trip.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
                            trip.origin === "PY"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                          )}
                        >
                          {trip.origin}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <TripStatusBadge status={trip.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        {trip.total_items || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        {trip.total_invested_brl > 0 ? formatBRL(trip.total_invested_brl) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {trip.avg_margin_pct != null ? (
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              trip.avg_margin_pct >= 40
                                ? "text-emerald-500"
                                : trip.avg_margin_pct >= 30
                                  ? "text-amber-500"
                                  : "text-destructive",
                            )}
                          >
                            {trip.avg_margin_pct.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Alerts + Quick Actions */}
        <div className="space-y-6">
          {/* Alerts */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="text-sm font-semibold">Alertas de Margem</h2>
            </div>
            <div className="divide-y divide-border">
              {alerts.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-xs text-muted-foreground">Nenhum alerta no momento.</p>
                </div>
              ) : (
                alerts.slice(0, 3).map((alert, i) => (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-snug">
                          Desvio: {alert.product_name}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {alert.trip_name} — margem {alert.margin_deviation_pct.toFixed(1)}% vs alvo{" "}
                          {alert.base_markup}%.
                        </p>
                        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/60">
                          <Clock size={10} />
                          Recalculado pelo banco
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold">Ações Rápidas</h2>
            <div className="space-y-2">
              <Link
                href="/express-sale"
                className="flex w-full items-center gap-3 rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                <MessageSquare size={16} />
                Venda Express (WhatsApp)
              </Link>
              <Link
                href="/inventory"
                className="flex w-full items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                <Package size={16} />
                Novo Lote de Produtos
              </Link>
              <Link
                href="/trips"
                className="flex w-full items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                <Plane size={16} />
                Planejar Nova Viagem
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}