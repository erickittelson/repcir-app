"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Check,
  Clock,
  Users,
  Flame,
  Heart,
  MessageCircle,
  Dumbbell,
  ChevronRight,
  Trophy,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MemberStatus {
  id: string;
  userId: string;
  name: string;
  image?: string | null;
  role: string;
  trainedToday: boolean;
  workoutsThisWeek: number;
  isCurrentUser: boolean;
}

interface CircleFeedProps {
  user: {
    name: string;
    image?: string | null;
    memberId: string;
  };
  circle: {
    id: string;
    name: string;
  };
  accountability: {
    trainedTodayCount: number;
    totalMembers: number;
    currentUserTrained: boolean;
    memberStatuses: MemberStatus[];
  };
  posts: Array<{
    id: string;
    authorName: string;
    authorImage?: string | null;
    authorId?: string;
    content: string | null;
    type: string;
    workoutId?: string | null;
    likesCount: number;
    commentsCount: number;
    isLiked: boolean;
    createdAt: string;
    metadata?: Record<string, unknown>;
  }>;
}

export function CircleFeed({
  user,
  circle,
  accountability,
  posts,
}: CircleFeedProps) {
  const router = useRouter();
  const { trainedTodayCount, totalMembers, currentUserTrained, memberStatuses } = accountability;

  // Get members who haven't trained today
  const notTrainedYet = memberStatuses.filter((m) => !m.trainedToday && !m.isCurrentUser);

  return (
    <div className="space-y-6 px-4 py-6">
      {/* Accountability Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{circle.name}</span>
        </div>
        <h1 className="text-2xl font-display tracking-wider">
          {trainedTodayCount} OF {totalMembers} TODAY
        </h1>
        <p className="text-muted-foreground">
          {getAccountabilityMessage(trainedTodayCount, totalMembers, currentUserTrained)}
        </p>
      </div>

      {/* Your Status Card */}
      {!currentUserTrained && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium">You haven&apos;t logged today</p>
                  <p className="text-sm text-muted-foreground">
                    {trainedTodayCount > 0
                      ? `${trainedTodayCount} others have already trained`
                      : "Be the first to train today"}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-brand-gradient"
                onClick={() => router.push("/coach")}
              >
                Log Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rallyproof Completion - when everyone trained */}
      {trainedTodayCount === totalMembers && totalMembers > 1 && (
        <Card className="border-success/50 bg-success/5">
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 text-success mx-auto mb-2" />
            <p className="font-display tracking-wider text-success">RALLYPROOF COMPLETE</p>
            <p className="text-sm text-muted-foreground">
              Everyone trained today. This is what a unit looks like.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Who Trained Today */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Trained Today
          </h2>
          <span className="text-sm text-brand font-medium">
            {trainedTodayCount}/{totalMembers}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {memberStatuses
            .filter((m) => m.trainedToday)
            .map((member) => (
              <div
                key={member.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full border",
                  member.isCurrentUser
                    ? "border-brand bg-brand/10"
                    : "border-success/50 bg-success/5"
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={member.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {member.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {member.isCurrentUser ? "You" : member.name.split(" ")[0]}
                </span>
                <Check className="h-4 w-4 text-success" />
              </div>
            ))}

          {trainedTodayCount === 0 && (
            <p className="text-sm text-muted-foreground py-2">
              No one has logged yet today. Be the first.
            </p>
          )}
        </div>
      </section>

      {/* Who Hasn't Trained Yet */}
      {notTrainedYet.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Hasn&apos;t Logged Yet
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {notTrainedYet.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 px-3 py-2 rounded-full border border-border bg-card"
              >
                <Avatar className="h-6 w-6 opacity-50">
                  <AvatarImage src={member.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {member.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  {member.name.split(" ")[0]}
                </span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Weekly Leaderboard */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            This Week
          </h2>
          <Link href={`/circle/${circle.id}`}>
            <Button variant="ghost" size="sm" className="text-muted-foreground h-8">
              Details <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {memberStatuses.slice(0, 5).map((member, index) => (
              <div
                key={member.id}
                className={cn(
                  "flex items-center justify-between px-4 py-3",
                  member.isCurrentUser && "bg-brand/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-5">
                    {index + 1}.
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {member.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className={cn("font-medium", member.isCurrentUser && "text-brand")}>
                    {member.isCurrentUser ? "You" : member.name.split(" ")[0]}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Dumbbell className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{member.workoutsThisWeek}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Rally Activity Feed */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Activity
        </h2>

        {posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-muted-foreground">
                No posts yet. Complete a workout to share with your rally.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function PostCard({ post }: { post: CircleFeedProps["posts"][0] }) {
  const [liked, setLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);

  const handleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((prev) => prev + (newLiked ? 1 : -1));

    try {
      await fetch(`/api/circles/posts/${post.id}/like`, {
        method: newLiked ? "POST" : "DELETE",
      });
    } catch {
      // Revert on error
      setLiked(!newLiked);
      setLikesCount((prev) => prev + (newLiked ? -1 : 1));
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.authorImage || undefined} />
            <AvatarFallback>{post.authorName.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{post.authorName}</span>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(post.createdAt)}
              </span>
            </div>

            {post.type === "workout_completed" && (
              <div className="flex items-center gap-1 mt-1 text-sm text-success">
                <Check className="h-4 w-4" />
                <span>Completed a workout</span>
              </div>
            )}

            {post.content && (
              <p className="mt-2 text-sm">{post.content}</p>
            )}

            {/* Workout metadata */}
            {post.metadata && post.type === "workout_completed" && (
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                {"duration" in post.metadata && post.metadata.duration ? (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {String(post.metadata.duration)} min
                  </span>
                ) : null}
                {"exercises" in post.metadata && post.metadata.exercises ? (
                  <span className="flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" />
                    {String(post.metadata.exercises)} exercises
                  </span>
                ) : null}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 mt-3">
              <button
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-1 text-sm transition-colors",
                  liked ? "text-energy" : "text-muted-foreground hover:text-energy"
                )}
              >
                <Heart className={cn("h-4 w-4", liked && "fill-current")} />
                {likesCount > 0 && <span>{likesCount}</span>}
              </button>

              <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <MessageCircle className="h-4 w-4" />
                {post.commentsCount > 0 && <span>{post.commentsCount}</span>}
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getAccountabilityMessage(
  trained: number,
  total: number,
  currentUserTrained: boolean
): string {
  const percent = Math.round((trained / total) * 100);

  if (trained === total) {
    return "Everyone showed up. Rallyproof complete.";
  }

  if (trained === 0) {
    return currentUserTrained
      ? "You're first. Set the standard."
      : "No one has trained yet. Who moves first?";
  }

  if (!currentUserTrained && trained > 0) {
    return `${trained} of ${total} have trained. The gap is showing.`;
  }

  if (percent >= 75) {
    return "Almost there. Who's closing it out?";
  }

  return `${total - trained} still to go.`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}
