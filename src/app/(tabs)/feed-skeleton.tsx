export function FeedSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-5 w-20 bg-muted rounded" />
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-card p-4 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
