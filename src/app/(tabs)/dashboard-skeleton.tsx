export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-muted rounded-lg" />
      ))}
    </div>
  );
}
