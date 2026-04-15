export default function TripsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded-lg bg-muted" />
          <div className="h-4 w-48 rounded bg-muted/60" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-muted" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card px-5 py-4 space-y-2">
            <div className="h-3 w-24 rounded bg-muted/60" />
            <div className="h-8 w-10 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <div className="h-4 w-40 rounded bg-muted" />
        </div>
        <div className="divide-y divide-border/50">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-5 w-12 rounded-md bg-muted/60" />
              <div className="h-5 w-20 rounded-full bg-muted/60" />
              <div className="ml-auto h-4 w-24 rounded bg-muted/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
