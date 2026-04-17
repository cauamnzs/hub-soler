"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Plane,
  Package,
  Boxes,
  Receipt,
  MessageSquare,
  Settings,
  ChevronLeft,
  Zap,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { logoutAction } from "@/app/login/actions";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
  badge?: string;
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Principal",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: <LayoutDashboard size={18} />,
        roles: ["admin", "finance"],
      },
      {
        label: "Viagens",
        href: "/trips",
        icon: <Plane size={18} />,
        roles: ["admin", "finance", "operations", "marketing"],
      },
      {
        label: "Produtos",
        href: "/products",
        icon: <Package size={18} />,
        roles: ["admin", "finance", "operations"],
      },
      {
        label: "Inventário",
        href: "/inventory",
        icon: <Boxes size={18} />,
        roles: ["admin", "finance", "operations"],
      },
    ],
  },
  {
    title: "Financeiro",
    items: [
      {
        label: "Despesas",
        href: "/expenses",
        icon: <Receipt size={18} />,
        roles: ["admin", "finance"],
      },
      {
        label: "Venda Express",
        href: "/express-sale",
        icon: <MessageSquare size={18} />,
        roles: ["admin"],
        badge: "WhatsApp",
      },
    ],
  },
  {
    title: "Sistema",
    items: [
      {
        label: "Integrações",
        href: "/integrations",
        icon: <Zap size={18} />,
        roles: ["admin"],
      },
      {
        label: "Configurações",
        href: "/settings",
        icon: <Settings size={18} />,
        roles: ["admin"],
      },
    ],
  },
];

function LogoutButton({ collapsed }: { collapsed: boolean }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        title="Sair"
        className={cn(
          "shrink-0 rounded-lg p-1.5 text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors",
          collapsed && "mx-auto",
        )}
      >
        <LogOut size={15} />
      </button>
    </form>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[260px]",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 font-mono text-sm font-black text-white">
            S
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
                Hub Soler
              </span>
              <span className="text-[10px] font-medium text-sidebar-foreground/40">
                Backoffice
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden rounded-md p-1 text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:flex"
        >
          <ChevronLeft
            size={16}
            className={cn(
              "transition-transform duration-300",
              collapsed && "rotate-180",
            )}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-6">
            {!collapsed && (
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                        collapsed && "justify-center px-2",
                      )}
                    >
                      <span
                        className={cn(
                          "shrink-0",
                          isActive
                            ? "text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70",
                        )}
                      >
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <>
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span className="ml-auto rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-400">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2",
            collapsed && "justify-center px-0",
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-white">
            RS
          </div>
          {!collapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-xs font-medium text-sidebar-foreground">
                Cauã
              </span>
              <span className="truncate text-[10px] text-sidebar-foreground/40">
                admin
              </span>
            </div>
          )}
          <LogoutButton collapsed={collapsed} />
        </div>
      </div>
    </aside>
  );
}
