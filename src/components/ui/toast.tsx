"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// TYPES
// ============================================================

export type ToastVariant = "success" | "error" | "info" | "destructive";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (opts: Omit<ToastItem, "id">) => void;
}

// ============================================================
// CONTEXT
// ============================================================

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ============================================================
// SINGLE TOAST
// ============================================================

const ICON = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  destructive: XCircle,
};

const STYLES: Record<ToastVariant, string> = {
  success:
    "border-emerald-500/30 bg-emerald-950/80 [&_[data-icon]]:text-emerald-400",
  error:
    "border-destructive/30 bg-red-950/80 [&_[data-icon]]:text-destructive",
  info: "border-blue-500/30 bg-blue-950/80 [&_[data-icon]]:text-blue-400",
  destructive:
    "border-destructive/30 bg-red-950/80 [&_[data-icon]]:text-destructive",
};

function Toast({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const Icon = ICON[item.variant];

  useEffect(() => {
    // Mount animation
    const show = requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(item.id), 300);
    }, 4000);
    return () => {
      cancelAnimationFrame(show);
      clearTimeout(timer);
    };
  }, [item.id, onDismiss]);

  return (
    <div
      className={cn(
        "flex w-[380px] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border px-4 py-3.5 shadow-2xl backdrop-blur-md transition-all duration-300",
        STYLES[item.variant],
        visible
          ? "translate-x-0 opacity-100"
          : "translate-x-4 opacity-0",
      )}
    >
      <Icon
        data-icon
        size={18}
        className="mt-0.5 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{item.title}</p>
        {item.description && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        )}
      </div>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(item.id), 300);
        }}
        className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:text-foreground"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ============================================================
// PROVIDER
// ============================================================

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts: Omit<ToastItem, "id">) => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => [...prev, { ...opts, id }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Portal — fixed bottom-right stack */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-2">
        {toasts.map((t) => (
          <Toast key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
