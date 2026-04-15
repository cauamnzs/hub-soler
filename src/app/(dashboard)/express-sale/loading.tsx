export default function ExpressSaleLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="h-6 w-56 rounded-full bg-muted" />
        <div className="h-8 w-48 rounded-lg bg-muted" />
        <div className="h-4 w-64 rounded bg-muted/60" />
      </div>
      <div className="h-16 rounded-2xl border-2 border-border bg-card" />
    </div>
  );
}
