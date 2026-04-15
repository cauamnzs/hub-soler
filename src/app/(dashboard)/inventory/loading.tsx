export default function InventoryLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-28 rounded-lg bg-muted" />
          <div className="h-4 w-56 rounded bg-muted/60" />
        </div>
        <div className="h-9 w-36 rounded-lg bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="h-8 w-8 rounded-lg bg-muted" />
            <div className="h-7 w-10 rounded bg-muted" />
            <div className="h-3 w-28 rounded bg-muted/60" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <div className="h-4 w-40 rounded bg-muted" />
        </div>
        <div className="divide-y divide-border/40">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <div className="h-3 w-32 rounded bg-muted/60 font-mono" />
              <div className="h-4 w-44 rounded bg-muted" />
              <div className="h-5 w-20 rounded-md bg-muted/60" />
              <div className="ml-auto h-5 w-12 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
