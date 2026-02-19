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
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";
import { FeedSkeleton } from "./feed-skeleton";

type PostVisibility = "public" | "followers" | "connections" | "private";

interface ActivityFeedClientProps {
  circleId?: string | null;
  userId?: string;
  userName?: string;
  userImage?: string | null;
}

export function ActivityFeedClient({
  circleId,
  userId,
  userName,
  userImage,
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
// Post Composer — supports both individual and circle posts
// ============================================================================

function PostComposer({
  circleId,
  userId,
  userName,
  userImage,
  onPost,
}: {
  circleId: string | null;
  userId: string;
  userName: string;
  userImage?: string | null;
  onPost: () => void;
}) {
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  // "individual" posts go to /api/posts, "circle" posts go to /api/circles/[id]/posts
  const [postTarget, setPostTarget] = useState<"individual" | "circle">(
    circleId ? "circle" : "individual"
  );

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
    setImageFile(null);
    setImagePreview(null);
  };

  const handlePost = async () => {
    if (!content.trim() && !imageFile) {
      toast.error("Please add some content or an image");
      return;
    }

    setIsPosting(true);
    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadEndpoint =
          postTarget === "circle" && circleId
            ? `/api/circles/${circleId}/posts/upload-image`
            : "/api/posts/upload-image";
        const uploadRes = await fetch(uploadEndpoint, {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload image");
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      const postBody =
        postTarget === "circle" && circleId
          ? {
              postType: imageUrl ? "image" : "text",
              content: content.trim() || null,
              imageUrl,
            }
          : {
              postType: imageUrl ? "image" : "text",
              content: content.trim() || null,
              imageUrl,
              visibility,
            };

      const postEndpoint =
        postTarget === "circle" && circleId
          ? `/api/circles/${circleId}/posts`
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

  return (
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
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share a win, ask for advice, or post an update..."
                  className="min-h-[80px] resize-none"
                  autoFocus
                />

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

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer p-2 rounded-lg hover:bg-muted transition-colors">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                    </label>

                    {/* Post target toggle */}
                    {circleId && (
                      <select
                        value={postTarget}
                        onChange={(e) =>
                          setPostTarget(
                            e.target.value as "individual" | "circle"
                          )
                        }
                        className="text-xs bg-muted/50 rounded-md px-2 py-1.5 text-muted-foreground"
                      >
                        <option value="individual">My Feed</option>
                        <option value="circle">Circle</option>
                      </select>
                    )}

                    {/* Visibility picker (individual posts only) */}
                    {postTarget === "individual" && (
                      <select
                        value={visibility}
                        onChange={(e) =>
                          setVisibility(e.target.value as PostVisibility)
                        }
                        className="text-xs bg-muted/50 rounded-md px-2 py-1.5 text-muted-foreground"
                      >
                        <option value="public">Public</option>
                        <option value="followers">Followers</option>
                        <option value="connections">Connections</option>
                        <option value="private">Only Me</option>
                      </select>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsExpanded(false);
                        setContent("");
                        clearImage();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handlePost}
                      disabled={isPosting || (!content.trim() && !imageFile)}
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
