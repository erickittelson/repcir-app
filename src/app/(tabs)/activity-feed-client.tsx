"use client";

import { useEffect, useRef, useState } from "react";
import { useFeed, type FeedItem } from "@/hooks/use-feed";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dumbbell,
  TrendingUp,
  Trophy,
  Zap,
  Heart,
  MessageCircle,
  Check,
  Send,
  Loader2,
  Image as ImageIcon,
  X,
  MessageSquare,
  Globe,
  Users,
  UserCheck,
  Lock,
  Medal,
  Clock,
  ChevronDown,
  AlertTriangle,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedSkeleton } from "./feed-skeleton";
import { BadgeFlair } from "@/components/badges/badge-flair";

type PostVisibility = "public" | "followers" | "connections" | "private";

interface ActivityFeedClientProps {
  circleId?: string | null;
  userId?: string;
  userName?: string;
  userImage?: string | null;
  circles?: Array<{ id: string; name: string }>;
}

export function ActivityFeedClient({
  circleId,
  userId,
  userName,
  userImage,
  circles,
}: ActivityFeedClientProps) {
  const feed = useFeed();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feed.initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && feed.hasMore && !feed.isLoadingMore) {
          feed.loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [feed.hasMore, feed.isLoadingMore, feed.loadMore]);

  if (feed.isLoading) {
    return <FeedSkeleton />;
  }

  return (
    <section>
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Feed
      </h2>

      {/* Post Composer — always show for logged-in users */}
      {userId && userName && (
        <PostComposer
          circleId={circleId || null}
          userId={userId}
          userName={userName}
          userImage={userImage}
          circles={circles || []}
          onPost={feed.refresh}
        />
      )}

      {feed.items.length > 0 ? (
        <div className="space-y-3">
          {feed.items.map((item) => (
            <FeedItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">
              No activity yet. Share something or complete a workout!
            </p>
          </CardContent>
        </Card>
      )}

      <div ref={sentinelRef} className="h-1" />

      {feed.isLoadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {feed.isError && (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground">Failed to load feed</p>
          <Button variant="ghost" size="sm" onClick={feed.refresh} className="mt-2">
            Retry
          </Button>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Feed Item Card
// ============================================================================

function FeedItemCard({ item }: { item: FeedItem }) {
  if (item.type === "post" || item.type === "individual_post") {
    return <PostFeedItem item={item} />;
  }
  return <ActivityFeedItem item={item} />;
}

function ActivityFeedItem({ item }: { item: FeedItem }) {
  const display = getActivityDisplay(item.activityType, item.metadata);

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            display.color
          )}
        >
          <display.icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <span className="font-medium">{item.actorName}</span>{" "}
            {display.text}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {item.circleName && (
              <span className="text-xs text-muted-foreground">
                {item.circleName}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(item.createdAt)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PostFeedItem({ item }: { item: FeedItem }) {
  const [liked, setLiked] = useState(item.isLiked);
  const [likesCount, setLikesCount] = useState(item.likesCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<
    Array<{
      id: string;
      authorName: string;
      authorImage?: string | null;
      content: string;
      createdAt: string;
    }>
  >([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const isIndividualPost = item.type === "individual_post";
  const isCirclePost = item.type === "post";

  // Extract real post ID from "post-<uuid>" or "ipost-<uuid>"
  const postId = isIndividualPost
    ? item.id.replace("ipost-", "")
    : item.id.replace("post-", "");

  // Build API URLs based on post type
  const likeUrl = isIndividualPost
    ? `/api/posts/${postId}/like`
    : `/api/circles/${item.circleId}/posts/${postId}/like`;

  const commentsUrl = isIndividualPost
    ? `/api/posts/${postId}/comments`
    : `/api/circles/${item.circleId}/posts/${postId}/comments`;

  const handleLike = async () => {
    if (isCirclePost && !item.circleId) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((prev) => prev + (newLiked ? 1 : -1));

    try {
      await fetch(likeUrl, { method: "POST" });
    } catch {
      setLiked(!newLiked);
      setLikesCount((prev) => prev + (newLiked ? -1 : 1));
    }
  };

  const toggleComments = async () => {
    if (!showComments && comments.length === 0) {
      if (isCirclePost && !item.circleId) return;
      setLoadingComments(true);
      try {
        const res = await fetch(commentsUrl);
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
        }
      } catch {
        // Silent fail
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    if (isCirclePost && !item.circleId) return;
    setPostingComment(true);
    try {
      const res = await fetch(commentsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [
          ...prev,
          {
            id: data.id,
            authorName: data.authorName || "Unknown",
            authorImage: data.authorImage,
            content: data.content,
            createdAt: data.createdAt,
          },
        ]);
        setNewComment("");
      }
    } catch {
      // Silent fail
    } finally {
      setPostingComment(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={item.actorImage || undefined} />
            <AvatarFallback>{item.actorName.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{item.actorName}</span>
              {item.actorBadges && item.actorBadges.length > 0 && (
                <BadgeFlair badges={item.actorBadges} />
              )}
              {item.circleName && (
                <span className="text-xs text-muted-foreground">
                  in {item.circleName}
                </span>
              )}
              {isIndividualPost && item.visibility && (
                <VisibilityBadge visibility={item.visibility} />
              )}
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(item.createdAt)}
              </span>
            </div>

            {item.activityType === "workout_completed" && (
              <div className="flex items-center gap-1 mt-1 text-sm text-success">
                <Check className="h-4 w-4" />
                <span>Completed a workout</span>
              </div>
            )}

            {item.content && (
              <p className="mt-2 text-sm whitespace-pre-wrap">{item.content}</p>
            )}

            {item.imageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden bg-muted/30">
                <img
                  src={item.imageUrl}
                  alt="Post image"
                  loading="lazy"
                  decoding="async"
                  className="w-full max-h-[480px] object-contain"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 mt-3">
              <button
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-1 text-sm transition-colors",
                  liked
                    ? "text-energy"
                    : "text-muted-foreground hover:text-energy"
                )}
              >
                <Heart className={cn("h-4 w-4", liked && "fill-current")} />
                {likesCount > 0 && <span>{likesCount}</span>}
              </button>

              <button
                onClick={toggleComments}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                {(item.commentsCount > 0 || comments.length > 0) && (
                  <span>
                    {Math.max(item.commentsCount, comments.length)}
                  </span>
                )}
              </button>
            </div>

            {/* Comments */}
            {showComments && (
              <div className="mt-4 pt-4 border-t space-y-3">
                {loadingComments ? (
                  <p className="text-sm text-muted-foreground">
                    Loading comments...
                  </p>
                ) : comments.length > 0 ? (
                  <div className="space-y-3">
                    {comments.filter(Boolean).map((comment) => (
                      <div key={comment.id} className="flex items-start gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={comment.authorImage ?? undefined}
                          />
                          <AvatarFallback className="text-xs">
                            {(comment.authorName || "?").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {comment.authorName || "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {comment.createdAt
                                ? formatRelativeTime(comment.createdAt)
                                : ""}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No comments yet
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    onKeyDown={(e) =>
                      e.key === "Enter" && !e.shiftKey && handlePostComment()
                    }
                  />
                  <Button
                    size="sm"
                    onClick={handlePostComment}
                    disabled={!newComment.trim() || postingComment}
                  >
                    {postingComment ? "..." : "Post"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Attachment types for post composer
// ============================================================================

interface WorkoutOption {
  id: string;
  name: string;
  description?: string;
  category?: string;
  difficulty?: string;
  estimatedDuration?: number;
  visibility?: string;
  source?: "created" | "saved";
}

interface ChallengeOption {
  id: string;
  name: string;
  shortDescription?: string;
  category?: string;
  difficulty?: string;
  durationDays?: number;
  participantCount?: number;
  coverImage?: string;
}

interface BadgeOption {
  id: string;
  badgeId: string;
  badge: {
    name: string;
    icon: string | null;
    category: string;
    tier: string;
  };
}

type PostAttachment =
  | { type: "workout"; workout: WorkoutOption }
  | { type: "challenge"; challenge: ChallengeOption }
  | { type: "badge"; badge: BadgeOption };

// ============================================================================
// Post Destination — unified type combining target + visibility
// ============================================================================

type PostDestination =
  | { type: "feed"; visibility: PostVisibility }
  | { type: "circle"; circleId: string; circleName: string };

const FEED_OPTIONS: Array<{
  visibility: PostVisibility;
  label: string;
  icon: typeof Globe;
  description: string;
}> = [
  { visibility: "public", label: "Public", icon: Globe, description: "Anyone can see" },
  { visibility: "connections", label: "Connections", icon: UserCheck, description: "Your connections" },
  { visibility: "private", label: "Only Me", icon: Lock, description: "Private post" },
];

function getDestinationLabel(dest: PostDestination): string {
  if (dest.type === "circle") return dest.circleName;
  const opt = FEED_OPTIONS.find((o) => o.visibility === dest.visibility);
  return opt?.label || "Public";
}

function getDestinationIcon(dest: PostDestination) {
  if (dest.type === "circle") return Users;
  const opt = FEED_OPTIONS.find((o) => o.visibility === dest.visibility);
  return opt?.icon || Globe;
}

// Visibility narrowness: higher = more visible
const VISIBILITY_RANK: Record<string, number> = {
  private: 0,
  connections: 1,
  circles: 2,
  followers: 3,
  public: 4,
};

function isVisibilityNarrower(workoutVis: string, postVis: string): boolean {
  return (VISIBILITY_RANK[workoutVis] ?? 0) < (VISIBILITY_RANK[postVis] ?? 0);
}

// ============================================================================
// Post Composer — supports individual posts, circle posts, and attachments
// ============================================================================

function PostComposer({
  circleId,
  userId,
  userName,
  userImage,
  circles,
  onPost,
}: {
  circleId: string | null;
  userId: string;
  userName: string;
  userImage?: string | null;
  circles: Array<{ id: string; name: string }>;
  onPost: () => void;
}) {
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Unified destination selector
  const defaultDest: PostDestination = circleId
    ? {
        type: "circle",
        circleId,
        circleName:
          circles.find((c) => c.id === circleId)?.name || "Circle",
      }
    : { type: "feed", visibility: "public" };
  const [destination, setDestination] = useState<PostDestination>(defaultDest);
  const [showDestPicker, setShowDestPicker] = useState(false);

  // Attachment state
  const [attachment, setAttachment] = useState<PostAttachment | null>(null);

  // Visibility conflict dialog
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [pendingWorkout, setPendingWorkout] = useState<WorkoutOption | null>(null);

  // Selection dialog state
  const [workoutDialogOpen, setWorkoutDialogOpen] = useState(false);
  const [challengeDialogOpen, setChallengeDialogOpen] = useState(false);
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [workoutOptions, setWorkoutOptions] = useState<WorkoutOption[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);

  // Challenge picker state
  const [challengeOptions, setChallengeOptions] = useState<ChallengeOption[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [challengeSearch, setChallengeSearch] = useState("");
  const [challengeCategory, setChallengeCategory] = useState<string | null>(null);
  const [challengeDifficulty, setChallengeDifficulty] = useState<string | null>(null);
  const [challengeSort, setChallengeSort] = useState("popular");
  const [challengeTotal, setChallengeTotal] = useState(0);
  const challengeSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Badge picker state
  const [badgeOptions, setBadgeOptions] = useState<BadgeOption[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [badgeSearch, setBadgeSearch] = useState("");
  const [badgeCategory, setBadgeCategory] = useState<string | null>(null);
  const [badgeTier, setBadgeTier] = useState<string | null>(null);
  const badgeSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  const isCirclePost = destination.type === "circle";
  const targetCircleId =
    destination.type === "circle" ? destination.circleId : null;
  const postVisibility =
    destination.type === "feed" ? destination.visibility : "public";

  const handleImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }
    const compressed = await compressImage(file);
    setImageFile(compressed);
    setImagePreview(URL.createObjectURL(compressed));
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const clearAttachment = () => setAttachment(null);

  // Check visibility conflict and attach workout
  const attachWorkout = (w: WorkoutOption) => {
    const workoutVis = w.visibility || "private";
    const targetVis = isCirclePost ? "circles" : postVisibility;

    if (isVisibilityNarrower(workoutVis, targetVis)) {
      setPendingWorkout(w);
      setConflictDialogOpen(true);
      return;
    }

    setAttachment({ type: "workout", workout: w });
    setWorkoutDialogOpen(false);
  };

  const handleMakeWorkoutPublic = async () => {
    if (!pendingWorkout) return;
    try {
      await fetch(`/api/workouts/${pendingWorkout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: "public" }),
      });
      const updated = { ...pendingWorkout, visibility: "public" };
      setAttachment({ type: "workout", workout: updated });
      // Update in the options list too
      setWorkoutOptions((prev) =>
        prev.map((w) => (w.id === updated.id ? updated : w))
      );
      toast.success("Workout visibility updated to public");
    } catch {
      toast.error("Failed to update workout visibility");
    } finally {
      setPendingWorkout(null);
      setConflictDialogOpen(false);
      setWorkoutDialogOpen(false);
    }
  };

  const handleAttachAnyway = () => {
    if (!pendingWorkout) return;
    setAttachment({ type: "workout", workout: pendingWorkout });
    setPendingWorkout(null);
    setConflictDialogOpen(false);
    setWorkoutDialogOpen(false);
  };

  // Fetch user's own workouts for selection
  const handleWorkoutClick = async () => {
    setWorkoutDialogOpen(true);
    if (workoutOptions.length > 0) return;
    setLoadingWorkouts(true);
    try {
      const res = await fetch("/api/workouts/mine");
      if (res.ok) {
        const data = await res.json();
        setWorkoutOptions(data.workouts || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingWorkouts(false);
    }
  };

  // Fetch challenges with filters
  const fetchChallenges = async (
    search?: string,
    category?: string | null,
    difficulty?: string | null,
    sort?: string
  ) => {
    setLoadingChallenges(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (category) params.set("category", category);
      if (difficulty) params.set("difficulty", difficulty);
      if (sort) params.set("sort", sort);
      params.set("limit", "20");
      const res = await fetch(`/api/challenges/community?${params}`);
      if (res.ok) {
        const data = await res.json();
        setChallengeOptions(data.challenges || []);
        setChallengeTotal(data.total || 0);
      }
    } catch {
      // silent
    } finally {
      setLoadingChallenges(false);
    }
  };

  const handleChallengeClick = () => {
    setChallengeDialogOpen(true);
    if (challengeOptions.length === 0) {
      fetchChallenges("", challengeCategory, challengeDifficulty, challengeSort);
    }
  };

  const handleChallengeSearchChange = (value: string) => {
    setChallengeSearch(value);
    if (challengeSearchTimeout.current) clearTimeout(challengeSearchTimeout.current);
    challengeSearchTimeout.current = setTimeout(() => {
      fetchChallenges(value, challengeCategory, challengeDifficulty, challengeSort);
    }, 300);
  };

  const handleChallengeFilterChange = (
    category: string | null,
    difficulty: string | null,
    sort: string
  ) => {
    setChallengeCategory(category);
    setChallengeDifficulty(difficulty);
    setChallengeSort(sort);
    fetchChallenges(challengeSearch, category, difficulty, sort);
  };

  // Fetch user's badges with filters
  const fetchBadges = async (
    search?: string,
    category?: string | null,
    tier?: string | null
  ) => {
    setLoadingBadges(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (category) params.set("category", category);
      if (tier) params.set("tier", tier);
      const res = await fetch(`/api/badges/user?${params}`);
      if (res.ok) {
        const data = await res.json();
        setBadgeOptions(data || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingBadges(false);
    }
  };

  const handleBadgeClick = () => {
    setBadgeDialogOpen(true);
    if (badgeOptions.length === 0) {
      fetchBadges("", badgeCategory, badgeTier);
    }
  };

  const handleBadgeSearchChange = (value: string) => {
    setBadgeSearch(value);
    if (badgeSearchTimeout.current) clearTimeout(badgeSearchTimeout.current);
    badgeSearchTimeout.current = setTimeout(() => {
      fetchBadges(value, badgeCategory, badgeTier);
    }, 300);
  };

  const handleBadgeFilterChange = (
    category: string | null,
    tier: string | null
  ) => {
    setBadgeCategory(category);
    setBadgeTier(tier);
    fetchBadges(badgeSearch, category, tier);
  };

  const handlePost = async () => {
    if (!content.trim() && !imageFile && !attachment) {
      toast.error("Please add some content, an image, or an attachment");
      return;
    }

    setIsPosting(true);
    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadEndpoint = targetCircleId
          ? `/api/circles/${targetCircleId}/posts/upload-image`
          : "/api/posts/upload-image";
        const uploadRes = await fetch(uploadEndpoint, {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload image");
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      // Determine post type from attachment
      let postType = imageUrl ? "image" : "text";
      let workoutPlanId: string | undefined;
      let challengeId: string | undefined;

      if (attachment) {
        switch (attachment.type) {
          case "workout":
            postType = "workout";
            workoutPlanId = attachment.workout.id;
            break;
          case "challenge":
            postType = "challenge";
            challengeId = attachment.challenge.id;
            break;
          case "badge":
            postType = "milestone";
            break;
        }
      }

      const postBody = targetCircleId
        ? {
            postType,
            content: content.trim() || null,
            imageUrl,
            workoutPlanId,
            challengeId,
          }
        : {
            postType,
            content: content.trim() || null,
            imageUrl,
            workoutPlanId,
            challengeId,
            visibility: postVisibility,
          };

      const postEndpoint = targetCircleId
        ? `/api/circles/${targetCircleId}/posts`
        : "/api/posts";

      const res = await fetch(postEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postBody),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create post");
      }

      setContent("");
      clearImage();
      clearAttachment();
      setIsExpanded(false);
      toast.success("Posted!");
      onPost();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create post"
      );
    } finally {
      setIsPosting(false);
    }
  };

  const hasContent = content.trim() || imageFile || attachment;
  const DestIcon = getDestinationIcon(destination);

  return (
    <>
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={userImage || undefined} />
              <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              {!isExpanded ? (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="w-full text-left px-4 py-3 bg-muted/50 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                >
                  What&apos;s on your mind?
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Destination chip */}
                  <div className="relative">
                    <button
                      onClick={() => setShowDestPicker(!showDestPicker)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-sm transition-colors"
                    >
                      <DestIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {getDestinationLabel(destination)}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>

                    {showDestPicker && (
                      <div className="absolute top-full left-0 mt-1 w-64 bg-popover border rounded-lg shadow-lg z-20 py-1">
                        {/* My Feed options */}
                        <div className="px-3 py-1.5">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                            My Feed
                          </span>
                        </div>
                        {FEED_OPTIONS.map((opt) => {
                          const isActive =
                            destination.type === "feed" &&
                            destination.visibility === opt.visibility;
                          return (
                            <button
                              key={opt.visibility}
                              onClick={() => {
                                setDestination({
                                  type: "feed",
                                  visibility: opt.visibility,
                                });
                                setShowDestPicker(false);
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors",
                                isActive && "bg-brand/5"
                              )}
                            >
                              <opt.icon
                                className={cn(
                                  "h-4 w-4",
                                  isActive
                                    ? "text-brand"
                                    : "text-muted-foreground"
                                )}
                              />
                              <div className="flex-1">
                                <div
                                  className={cn(
                                    "text-sm",
                                    isActive && "font-medium text-brand"
                                  )}
                                >
                                  {opt.label}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {opt.description}
                                </div>
                              </div>
                              {isActive && (
                                <Check className="h-4 w-4 text-brand" />
                              )}
                            </button>
                          );
                        })}

                        {/* Circles */}
                        {circles.length > 0 && (
                          <>
                            <div className="border-t my-1" />
                            <div className="px-3 py-1.5">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                Circles
                              </span>
                            </div>
                            {circles.map((c) => {
                              const isActive =
                                destination.type === "circle" &&
                                destination.circleId === c.id;
                              return (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    setDestination({
                                      type: "circle",
                                      circleId: c.id,
                                      circleName: c.name,
                                    });
                                    setShowDestPicker(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors",
                                    isActive && "bg-brand/5"
                                  )}
                                >
                                  <Users
                                    className={cn(
                                      "h-4 w-4",
                                      isActive
                                        ? "text-brand"
                                        : "text-muted-foreground"
                                    )}
                                  />
                                  <div
                                    className={cn(
                                      "text-sm flex-1",
                                      isActive && "font-medium text-brand"
                                    )}
                                  >
                                    {c.name}
                                  </div>
                                  {isActive && (
                                    <Check className="h-4 w-4 text-brand" />
                                  )}
                                </button>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share a win, ask for advice, or post an update..."
                    className="min-h-[80px] resize-none"
                    autoFocus
                  />

                  {/* Image preview */}
                  {imagePreview && (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-40 max-w-full rounded-lg object-contain"
                      />
                      <button
                        onClick={clearImage}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Attachment preview */}
                  {attachment && (
                    <div className="relative">
                      <button
                        onClick={clearAttachment}
                        className="absolute -top-2 -right-2 z-10 p-1 bg-destructive text-destructive-foreground rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>

                      {attachment.type === "workout" && (
                        <div className="p-3 bg-brand/10 rounded-lg border border-brand/20">
                          <div className="flex items-center gap-2">
                            <Dumbbell className="h-4 w-4 text-brand" />
                            <span className="font-medium text-sm">
                              {attachment.workout.name}
                            </span>
                            {attachment.workout.visibility && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                {attachment.workout.visibility === "private" ? (
                                  <Lock className="h-3 w-3" />
                                ) : (
                                  <Globe className="h-3 w-3" />
                                )}
                                {attachment.workout.visibility}
                              </span>
                            )}
                          </div>
                          {attachment.workout.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {attachment.workout.description}
                            </p>
                          )}
                          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                            {attachment.workout.difficulty && (
                              <span className="capitalize">
                                {attachment.workout.difficulty}
                              </span>
                            )}
                            {attachment.workout.estimatedDuration && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {attachment.workout.estimatedDuration} min
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {attachment.type === "challenge" && (
                        <div className="p-3 bg-energy/10 rounded-lg border border-energy/20">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-energy" />
                            <span className="font-medium text-sm">
                              {attachment.challenge.name}
                            </span>
                          </div>
                          {attachment.challenge.shortDescription && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {attachment.challenge.shortDescription}
                            </p>
                          )}
                          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                            {attachment.challenge.difficulty && (
                              <span className="capitalize">
                                {attachment.challenge.difficulty}
                              </span>
                            )}
                            {attachment.challenge.durationDays && (
                              <span>{attachment.challenge.durationDays} days</span>
                            )}
                          </div>
                        </div>
                      )}

                      {attachment.type === "badge" && (
                        <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                          <div className="flex items-center gap-2">
                            <Medal className="h-4 w-4 text-success" />
                            <span className="font-medium text-sm">
                              {attachment.badge.badge.icon || "🏅"}{" "}
                              {attachment.badge.badge.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {attachment.badge.badge.tier}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Toolbar: attachment buttons + actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <label className="cursor-pointer p-2 rounded-lg hover:bg-muted transition-colors">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageSelect}
                        />
                      </label>

                      <button
                        onClick={handleWorkoutClick}
                        disabled={!!attachment}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          attachment?.type === "workout"
                            ? "text-brand bg-brand/10"
                            : "text-muted-foreground hover:bg-muted",
                          attachment && attachment.type !== "workout" && "opacity-50"
                        )}
                        title="Attach workout"
                      >
                        <Dumbbell className="h-5 w-5" />
                      </button>

                      <button
                        onClick={handleChallengeClick}
                        disabled={!!attachment}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          attachment?.type === "challenge"
                            ? "text-energy bg-energy/10"
                            : "text-muted-foreground hover:bg-muted",
                          attachment && attachment.type !== "challenge" && "opacity-50"
                        )}
                        title="Attach challenge"
                      >
                        <Trophy className="h-5 w-5" />
                      </button>

                      <button
                        onClick={handleBadgeClick}
                        disabled={!!attachment}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          attachment?.type === "badge"
                            ? "text-success bg-success/10"
                            : "text-muted-foreground hover:bg-muted",
                          attachment && attachment.type !== "badge" && "opacity-50"
                        )}
                        title="Attach achievement"
                      >
                        <Medal className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsExpanded(false);
                          setContent("");
                          clearImage();
                          clearAttachment();
                          setShowDestPicker(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handlePost}
                        disabled={isPosting || !hasContent}
                        className="bg-brand-gradient"
                      >
                        {isPosting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-1" />
                            Post
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Close destination picker on outside click */}
      {showDestPicker && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowDestPicker(false)}
        />
      )}

      {/* Visibility Conflict Dialog */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-energy" />
              Workout Visibility
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {pendingWorkout?.name}
            </span>{" "}
            is set to{" "}
            <span className="font-medium text-foreground">
              {pendingWorkout?.visibility || "private"}
            </span>
            , but your post will be visible to a wider audience. Others
            won&apos;t be able to view the attached workout unless you
            update its visibility.
          </p>
          <div className="flex flex-col gap-2 mt-2">
            <Button onClick={handleMakeWorkoutPublic} className="bg-brand-gradient">
              Make Workout Public
            </Button>
            <Button variant="outline" onClick={handleAttachAnyway}>
              Attach Anyway
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setPendingWorkout(null);
                setConflictDialogOpen(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Workout Selection Dialog */}
      <Dialog open={workoutDialogOpen} onOpenChange={setWorkoutDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-brand" />
              Attach a Workout
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {loadingWorkouts ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : workoutOptions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Dumbbell className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No workouts yet</p>
                <p className="text-sm mt-1">
                  Create or save workouts to attach them to posts
                </p>
              </div>
            ) : (
              workoutOptions.map((w) => (
                <button
                  key={w.id}
                  onClick={() => attachWorkout(w)}
                  className="w-full p-3 text-left rounded-lg border hover:border-brand hover:bg-brand/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm flex-1">
                      {w.name}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      {w.visibility === "private" ? (
                        <Lock className="h-3 w-3" />
                      ) : (
                        <Globe className="h-3 w-3" />
                      )}
                      {w.visibility || "private"}
                    </span>
                    {w.source === "saved" && (
                      <Badge variant="outline" className="text-[10px]">
                        Saved
                      </Badge>
                    )}
                  </div>
                  {w.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {w.description}
                    </p>
                  )}
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    {w.difficulty && (
                      <Badge variant="outline" className="text-[10px]">
                        {w.difficulty}
                      </Badge>
                    )}
                    {w.estimatedDuration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {w.estimatedDuration} min
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Challenge Selection Dialog */}
      <Dialog open={challengeDialogOpen} onOpenChange={(open) => {
        setChallengeDialogOpen(open);
        if (!open) {
          setChallengeSearch("");
          setChallengeCategory(null);
          setChallengeDifficulty(null);
          setChallengeSort("popular");
        }
      }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-energy" />
              Attach a Challenge
            </DialogTitle>
          </DialogHeader>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={challengeSearch}
              onChange={(e) => handleChallengeSearchChange(e.target.value)}
              placeholder="Search challenges..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-energy/50"
            />
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {/* Category filters */}
            {["strength", "cardio", "wellness", "hybrid", "transformation"].map((cat) => (
              <button
                key={cat}
                onClick={() =>
                  handleChallengeFilterChange(
                    challengeCategory === cat ? null : cat,
                    challengeDifficulty,
                    challengeSort
                  )
                }
                className={cn(
                  "px-2.5 py-1 text-xs rounded-full border transition-colors capitalize",
                  challengeCategory === cat
                    ? "bg-energy/10 border-energy text-energy"
                    : "border-border text-muted-foreground hover:border-energy/50"
                )}
              >
                {cat}
              </button>
            ))}
            <div className="w-px h-5 bg-border self-center mx-0.5" />
            {/* Difficulty filters */}
            {["beginner", "intermediate", "advanced"].map((diff) => (
              <button
                key={diff}
                onClick={() =>
                  handleChallengeFilterChange(
                    challengeCategory,
                    challengeDifficulty === diff ? null : diff,
                    challengeSort
                  )
                }
                className={cn(
                  "px-2.5 py-1 text-xs rounded-full border transition-colors capitalize",
                  challengeDifficulty === diff
                    ? "bg-energy/10 border-energy text-energy"
                    : "border-border text-muted-foreground hover:border-energy/50"
                )}
              >
                {diff}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={challengeSort}
              onChange={(e) =>
                handleChallengeFilterChange(
                  challengeCategory,
                  challengeDifficulty,
                  e.target.value
                )
              }
              className="text-xs bg-muted/50 rounded-md px-2 py-1 text-muted-foreground"
            >
              <option value="popular">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest</option>
              <option value="participants">Most Participants</option>
            </select>
            {challengeTotal > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">
                {challengeTotal} found
              </span>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
            {loadingChallenges ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : challengeOptions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Trophy className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="font-medium">
                  {challengeSearch || challengeCategory || challengeDifficulty
                    ? "No challenges match your filters"
                    : "No challenges available"}
                </p>
                <p className="text-sm mt-1">
                  {challengeSearch || challengeCategory || challengeDifficulty
                    ? "Try adjusting your search or filters"
                    : "Check back later for new challenges"}
                </p>
              </div>
            ) : (
              challengeOptions.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setAttachment({ type: "challenge", challenge: c });
                    setChallengeDialogOpen(false);
                  }}
                  className="w-full p-3 text-left rounded-lg border hover:border-energy hover:bg-energy/5 transition-colors"
                >
                  <div className="flex gap-3">
                    {c.coverImage && (
                      <img
                        src={c.coverImage}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{c.name}</div>
                      {c.shortDescription && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {c.shortDescription}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                        {c.category && (
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {c.category}
                          </Badge>
                        )}
                        {c.difficulty && (
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {c.difficulty}
                          </Badge>
                        )}
                        {c.durationDays && (
                          <span>{c.durationDays} days</span>
                        )}
                        {c.participantCount !== undefined && c.participantCount > 0 && (
                          <span>{c.participantCount} joined</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Badge/Achievement Selection Dialog */}
      <Dialog open={badgeDialogOpen} onOpenChange={(open) => {
        setBadgeDialogOpen(open);
        if (!open) {
          setBadgeSearch("");
          setBadgeCategory(null);
          setBadgeTier(null);
        }
      }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-success" />
              Attach an Achievement
            </DialogTitle>
          </DialogHeader>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={badgeSearch}
              onChange={(e) => handleBadgeSearchChange(e.target.value)}
              placeholder="Search your badges..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-success/50"
            />
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {/* Category filters */}
            {["strength", "consistency", "challenge", "social", "skill"].map((cat) => (
              <button
                key={cat}
                onClick={() =>
                  handleBadgeFilterChange(
                    badgeCategory === cat ? null : cat,
                    badgeTier
                  )
                }
                className={cn(
                  "px-2.5 py-1 text-xs rounded-full border transition-colors capitalize",
                  badgeCategory === cat
                    ? "bg-success/10 border-success text-success"
                    : "border-border text-muted-foreground hover:border-success/50"
                )}
              >
                {cat}
              </button>
            ))}
            <div className="w-px h-5 bg-border self-center mx-0.5" />
            {/* Tier filters */}
            {["bronze", "silver", "gold", "platinum"].map((t) => (
              <button
                key={t}
                onClick={() =>
                  handleBadgeFilterChange(
                    badgeCategory,
                    badgeTier === t ? null : t
                  )
                }
                className={cn(
                  "px-2.5 py-1 text-xs rounded-full border transition-colors capitalize",
                  badgeTier === t
                    ? "bg-success/10 border-success text-success"
                    : "border-border text-muted-foreground hover:border-success/50"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
            {loadingBadges ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : badgeOptions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Medal className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="font-medium">
                  {badgeSearch || badgeCategory || badgeTier
                    ? "No badges match your filters"
                    : "No achievements yet"}
                </p>
                <p className="text-sm mt-1">
                  {badgeSearch || badgeCategory || badgeTier
                    ? "Try adjusting your search or filters"
                    : "Complete workouts and challenges to earn badges"}
                </p>
              </div>
            ) : (
              badgeOptions.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setAttachment({ type: "badge", badge: b });
                    setBadgeDialogOpen(false);
                  }}
                  className="w-full p-3 text-left rounded-lg border hover:border-success hover:bg-success/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {b.badge.icon || "🏅"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{b.badge.name}</div>
                      <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {b.badge.tier}
                        </Badge>
                        <span className="capitalize">{b.badge.category}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// Visibility Badge
// ============================================================================

function VisibilityBadge({ visibility }: { visibility: string }) {
  const config: Record<string, { icon: typeof Globe; label: string }> = {
    public: { icon: Globe, label: "Public" },
    followers: { icon: Users, label: "Followers" },
    connections: { icon: Users, label: "Connections" },
    private: { icon: Lock, label: "Only me" },
  };

  const { icon: Icon, label } = config[visibility] || config.public;

  return (
    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getActivityDisplay(
  activityType: string,
  metadata: Record<string, unknown> | null
) {
  switch (activityType) {
    case "workout_completed":
      return {
        icon: Dumbbell,
        text: "completed a workout",
        color: "bg-brand/20 text-brand",
      };
    case "goal_achieved":
      return {
        icon: Trophy,
        text: "achieved a goal",
        color: "bg-success/20 text-success",
      };
    case "pr_set":
      return {
        icon: TrendingUp,
        text: `set a new PR${metadata?.exerciseName ? `: ${metadata.exerciseName}` : ""}`,
        color: "bg-energy/20 text-energy",
      };
    case "joined_circle":
      return {
        icon: Zap,
        text: "joined a circle",
        color: "bg-brand/20 text-brand",
      };
    default:
      return {
        icon: Zap,
        text: activityType.replace(/_/g, " "),
        color: "bg-muted text-muted-foreground",
      };
  }
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
