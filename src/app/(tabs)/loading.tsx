import { DashboardSkeleton } from "./dashboard-skeleton";
import { FeedSkeleton } from "./feed-skeleton";

export default function TabsLoading() {
  return (
    <div className="px-4 py-6">
      <DashboardSkeleton />
      <div className="mt-6">
        <FeedSkeleton />
      </div>
    </div>
  );
}
