export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-muted" />
          <div className="h-4 w-64 rounded bg-muted/60" />
        </div>
        <div className="h-9 w-36 rounded-lg bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="h-8 w-8 rounded-lg bg-muted" />
            <div className="h-7 w-12 rounded bg-muted" />
            <div className="h-3 w-28 rounded bg-muted/60" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <div className="h-4 w-36 rounded bg-muted" />
        </div>
        <div className="divide-y divide-border/40">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <div className="h-9 w-9 rounded-xl bg-muted" />
              <div className="h-3 w-36 rounded bg-muted/60" />
              <div className="h-4 w-48 rounded bg-muted" />
              <div className="h-5 w-20 rounded-md bg-muted/60" />
              <div className="ml-auto h-4 w-14 rounded bg-muted/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
