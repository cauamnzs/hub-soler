"use client";

import { useTheme } from "next-themes";
import {
  Sun,
  Moon,
  Bell,
  Search,
  PanelLeftClose,
} from "lucide-react";
import { useEffect, useState } from "react";

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
      {/* Left — Mobile toggle + breadcrumb */}
      <div className="flex items-center gap-4">
        <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden">
          <PanelLeftClose size={18} />
        </button>
        <div className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
          <span className="font-medium text-foreground">Dashboard</span>
          <span>/</span>
          <span>Visão Geral</span>
        </div>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-1">
        {/* Search */}
        <button className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted">
          <Search size={14} />
          <span className="hidden md:inline">Buscar...</span>
          <kbd className="ml-4 hidden rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </button>

        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}
      </div>
    </header>
  );
}
