"use client";

import dynamic from "next/dynamic";
import { FeedSkeleton } from "./feed-skeleton";

const ActivityFeedClient = dynamic(
  () =>
    import("./activity-feed-client").then((m) => ({
      default: m.ActivityFeedClient,
    })),
  {
    loading: () => <FeedSkeleton />,
    ssr: false,
  }
);

interface UnifiedFeedWrapperProps {
  circleId?: string | null;
  userId?: string;
  userName?: string;
  userImage?: string | null;
}

export function UnifiedFeedWrapper({
  circleId,
  userId,
  userName,
  userImage,
}: UnifiedFeedWrapperProps) {
  return (
    <ActivityFeedClient
      circleId={circleId}
      userId={userId}
      userName={userName}
      userImage={userImage}
    />
  );
}
