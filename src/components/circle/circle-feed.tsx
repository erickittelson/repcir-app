"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MentionInput } from "@/components/ui/mention-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Heart,
  MessageCircle,
  Send,
  Image as ImageIcon,
  Dumbbell,
  Trophy,
  Target,
  Pin,
  MoreVertical,
  Trash2,
  Loader2,
  X,
  Clock,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { DeleteConfirmDialog } from "@/components/ui/confirm-dialog";
import { VoiceInputWithTranscription } from "@/components/voice-input";
import { haptics } from "@/lib/haptics";
import { compressImage } from "@/lib/image-compress";
import { BadgeFlair } from "@/components/badges/badge-flair";

interface CirclePost {
  id: string;
  circleId: string;
  authorId: string;
  postType: string;
  content: string | null;
  imageUrl: string | null;
  workoutPlanId: string | null;
  challengeId: string | null;
  goalId: string | null;
  likeCount: number;
  commentCount: number;
  isAssignment: boolean;
  dueDate: Date | null;
  isPinned: boolean;
  createdAt: Date;
  authorName: string | null;
  authorImage: string | null;
  isLiked: boolean;
  authorBadges?: Array<{
    id: string;
    icon: string | null;
    name: string;
    tier: string;
  }>;
}

interface CircleFeedProps {
  circleId: string;
  userId: string;
  userRole: string | null;
  userName?: string;
  userImage?: string;
}

interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  category?: string;
  difficulty?: string;
  estimatedDuration?: number;
  exerciseCount?: number;
}

interface Challenge {
  id: string;
  name: string;
  shortDescription?: string;
  category?: string;
  difficulty?: string;
  durationDays?: number;
  participantCount?: number;
  coverImage?: string;
}

interface PostAttachment {
  type: "image" | "workout" | "challenge";
  imageUrl?: string;
  imagePreview?: string;
  workout?: WorkoutPlan;
  challenge?: Challenge;
}

export function CircleFeed({ circleId, userId, userRole, userName, userImage }: CircleFeedProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<CirclePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<CirclePost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Attachment state
  const [attachment, setAttachment] = useState<PostAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog state
  const [workoutDialogOpen, setWorkoutDialogOpen] = useState(false);
  const [challengeDialogOpen, setChallengeDialogOpen] = useState(false);
  const [workouts, setWorkouts] = useState<WorkoutPlan[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [loadingChallenges, setLoadingChallenges] = useState(false);

  const isAdmin = userRole === "admin" || userRole === "owner";

  useEffect(() => {
    const controller = new AbortController();

    const fetchPosts = async () => {
      try {
        const res = await fetch(`/api/circles/${circleId}/posts`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setPosts(data.posts);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Failed to fetch posts:", error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchPosts();
    return () => controller.abort();
  }, [circleId]);

  // Handle image file selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Compress before preview/upload
    const compressed = await compressImage(file);

    // Create preview
    const previewUrl = URL.createObjectURL(compressed);
    setAttachment({
      type: "image",
      imagePreview: previewUrl,
    });

    // Upload the image
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", compressed);

      const res = await fetch(`/api/circles/${circleId}/posts/upload-image`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const { url } = await res.json();
      setAttachment((prev) =>
        prev ? { ...prev, imageUrl: url } : null
      );
      haptics.success();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
      setAttachment(null);
      URL.revokeObjectURL(previewUrl);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Fetch workouts for selection dialog
  const fetchWorkouts = async () => {
    setLoadingWorkouts(true);
    try {
      const res = await fetch(`/api/circles/${circleId}/workouts`);
      if (res.ok) {
        const data = await res.json();
        setWorkouts(data.workouts || data || []);
      }
    } catch (error) {
      console.error("Failed to fetch workouts:", error);
    } finally {
      setLoadingWorkouts(false);
    }
  };

  // Fetch challenges for selection dialog
  const fetchChallenges = async () => {
    setLoadingChallenges(true);
    try {
      const res = await fetch("/api/challenges/featured");
      if (res.ok) {
        const data = await res.json();
        setChallenges(data.challenges || []);
      }
    } catch (error) {
      console.error("Failed to fetch challenges:", error);
    } finally {
      setLoadingChallenges(false);
    }
  };

  // Handle workout button click
  const handleWorkoutClick = () => {
    setWorkoutDialogOpen(true);
    if (workouts.length === 0) {
      fetchWorkouts();
    }
  };

  // Handle challenge button click
  const handleChallengeClick = () => {
    setChallengeDialogOpen(true);
    if (challenges.length === 0) {
      fetchChallenges();
    }
  };

  // Select a workout to attach
  const selectWorkout = (workout: WorkoutPlan) => {
    setAttachment({
      type: "workout",
      workout,
    });
    setWorkoutDialogOpen(false);
    haptics.light();
  };

  // Select a challenge to attach
  const selectChallenge = (challenge: Challenge) => {
    setAttachment({
      type: "challenge",
      challenge,
    });
    setChallengeDialogOpen(false);
    haptics.light();
  };

  // Clear attachment
  const clearAttachment = () => {
    if (attachment?.imagePreview) {
      URL.revokeObjectURL(attachment.imagePreview);
    }
    setAttachment(null);
  };

  const handlePost = async () => {
    // Must have content or an attachment
    if (!newPostContent.trim() && !attachment) return;

    // If uploading, wait
    if (isUploading) {
      toast.error("Please wait for image upload to complete");
      return;
    }

    setIsPosting(true);
    try {
      // Determine post type and attached data
      let postType = "text";
      let imageUrl: string | undefined;
      let workoutPlanId: string | undefined;
      let challengeId: string | undefined;

      if (attachment) {
        switch (attachment.type) {
          case "image":
            postType = "image";
            imageUrl = attachment.imageUrl;
            break;
          case "workout":
            postType = "workout";
            workoutPlanId = attachment.workout?.id;
            break;
          case "challenge":
            postType = "challenge";
            challengeId = attachment.challenge?.id;
            break;
        }
      }

      const res = await fetch(`/api/circles/${circleId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postType,
          content: newPostContent.trim() || null,
          imageUrl,
          workoutPlanId,
          challengeId,
        }),
      });

      if (res.ok) {
        const newPost = await res.json();
        setPosts((prev) => [newPost, ...prev]);
        setNewPostContent("");
        clearAttachment();
        setIsComposerExpanded(false);
        toast.success("Posted!");
        haptics.success();
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Failed to post");
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const res = await fetch(`/api/circles/${circleId}/posts/${postId}/like`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { ...post, isLiked: data.liked, likeCount: data.likeCount }
              : post
          )
        );
      }
    } catch {
      toast.error("Failed to like post");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const res = await fetch(
        `/api/circles/${circleId}/posts/${deleteTarget.id}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        toast.success("Post deleted");
        setDeleteTarget(null);
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePin = async (postId: string, isPinned: boolean) => {
    try {
      const res = await fetch(`/api/circles/${circleId}/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !isPinned }),
      });

      if (res.ok) {
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId ? { ...post, isPinned: !isPinned } : post
          )
        );
        toast.success(isPinned ? "Unpinned" : "Pinned");
      }
    } catch {
      toast.error("Failed to update post");
    }
  };

  const getPostTypeIcon = (postType: string) => {
    switch (postType) {
      case "workout":
        return <Dumbbell className="h-4 w-4 text-brand" />;
      case "challenge":
        return <Trophy className="h-4 w-4 text-energy" />;
      case "goal":
        return <Target className="h-4 w-4 text-success" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Post Composer */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              {userImage && <AvatarImage src={userImage} />}
              <AvatarFallback className="bg-brand/20 text-brand">
                {userName?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              {!isComposerExpanded ? (
                <button
                  onClick={() => setIsComposerExpanded(true)}
                  className="w-full text-left px-4 py-3 bg-muted/50 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                >
                  Share something with your circle...
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <MentionInput
                      placeholder="Share a win, ask for advice, or post an update..."
                      value={newPostContent}
                      onChange={setNewPostContent}
                      className="min-h-[80px] resize-none pr-12"
                      rows={3}
                      disabled={isPosting}
                    />
                    {/* Voice input button */}
                    <div className="absolute right-2 top-2">
                      <VoiceInputWithTranscription
                        onSubmit={(text) => {
                          setNewPostContent((prev) =>
                            prev ? `${prev} ${text}` : text
                          );
                          haptics.success();
                        }}
                        disabled={isPosting}
                      />
                    </div>
                  </div>

                  {/* Image preview */}
                  {attachment?.type === "image" && (
                    <div className="relative inline-block">
                      {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                      <img
                        src={attachment.imagePreview}
                        alt="Upload preview"
                        className="max-h-40 max-w-full rounded-lg object-contain"
                      />
                      <button
                        onClick={clearAttachment}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Workout attachment preview */}
                  {attachment?.type === "workout" && attachment.workout && (
                    <div className="relative">
                      <button
                        onClick={clearAttachment}
                        className="absolute -top-2 -right-2 z-10 p-1 bg-destructive text-destructive-foreground rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="p-3 bg-brand/10 rounded-lg border border-brand/20">
                        <div className="flex items-center gap-2">
                          <Dumbbell className="h-4 w-4 text-brand" />
                          <span className="font-medium text-sm">{attachment.workout.name}</span>
                        </div>
                        {attachment.workout.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {attachment.workout.description}
                          </p>
                        )}
                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          {attachment.workout.difficulty && (
                            <span className="capitalize">{attachment.workout.difficulty}</span>
                          )}
                          {attachment.workout.estimatedDuration && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {attachment.workout.estimatedDuration} min
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Challenge attachment preview */}
                  {attachment?.type === "challenge" && attachment.challenge && (
                    <div className="relative">
                      <button
                        onClick={clearAttachment}
                        className="absolute -top-2 -right-2 z-10 p-1 bg-destructive text-destructive-foreground rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="p-3 bg-energy/10 rounded-lg border border-energy/20">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-energy" />
                          <span className="font-medium text-sm">{attachment.challenge.name}</span>
                        </div>
                        {attachment.challenge.shortDescription && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {attachment.challenge.shortDescription}
                          </p>
                        )}
                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          {attachment.challenge.difficulty && (
                            <span className="capitalize">{attachment.challenge.difficulty}</span>
                          )}
                          {attachment.challenge.durationDays && (
                            <span>{attachment.challenge.durationDays} days</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Toolbar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                      <label
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "cursor-pointer p-2 rounded-lg transition-colors",
                          attachment?.type === "image"
                            ? "text-brand bg-brand/10"
                            : "text-muted-foreground hover:bg-muted",
                          isUploading && "opacity-50 pointer-events-none",
                          attachment && attachment.type !== "image" && "opacity-50 pointer-events-none"
                        )}
                      >
                        {isUploading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <ImageIcon className="h-5 w-5" />
                        )}
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

                      {isAdmin && (
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
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsComposerExpanded(false);
                          setNewPostContent("");
                          clearAttachment();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handlePost}
                        disabled={(!newPostContent.trim() && !attachment) || isPosting || isUploading}
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

      {/* Posts Feed */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No posts yet</p>
            <p className="text-sm mt-1">Be the first to share something!</p>
          </CardContent>
        </Card>
      ) : (
        posts.map((post) => (
          <Card
            key={post.id}
            className={cn(post.isPinned && "border-brand/30 bg-brand/5")}
          >
            <CardContent className="pt-4">
              {/* Post Header */}
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  {post.authorImage && <AvatarImage src={post.authorImage} alt={post.authorName || "User"} />}
                  <AvatarFallback className="bg-brand/20 text-brand">
                    {post.authorName?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {post.authorName || "Anonymous"}
                    </span>
                    {post.authorBadges && post.authorBadges.length > 0 && (
                      <BadgeFlair badges={post.authorBadges} />
                    )}
                    {post.isPinned && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Pin className="h-2.5 w-2.5" />
                        Pinned
                      </Badge>
                    )}
                    {post.isAssignment && (
                      <Badge className="bg-energy/20 text-energy border-energy/30 text-[10px]">
                        Assignment
                      </Badge>
                    )}
                    {getPostTypeIcon(post.postType)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>

                {/* Post Actions Menu */}
                {(post.authorId === userId || isAdmin) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isAdmin && (
                        <DropdownMenuItem
                          onClick={() => handlePin(post.id, post.isPinned)}
                        >
                          <Pin className="h-4 w-4 mr-2" />
                          {post.isPinned ? "Unpin" : "Pin to top"}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteTarget(post)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Post Content */}
              {post.content && (
                <p className="mt-3 text-sm whitespace-pre-wrap">
                  <PostContentWithMentions content={post.content} />
                </p>
              )}

              {/* Post Image */}
              {post.imageUrl && (
                <div className="mt-3 rounded-lg overflow-hidden bg-muted/30">
                  <img
                    src={post.imageUrl}
                    alt="Post image"
                    loading="lazy"
                    decoding="async"
                    className="w-full max-h-[480px] object-contain"
                  />
                </div>
              )}

              {/* Linked Content Preview */}
              {(post.workoutPlanId || post.challengeId || post.goalId) && (
                <LinkedContentPreview
                  post={post}
                  circleId={circleId}
                  onNavigate={(path) => router.push(path)}
                />
              )}

              {/* Post Actions */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t">
                <button
                  onClick={() => handleLike(post.id)}
                  className={cn(
                    "flex items-center gap-1.5 text-sm transition-colors",
                    post.isLiked
                      ? "text-red-500"
                      : "text-muted-foreground hover:text-red-500"
                  )}
                >
                  <Heart
                    className={cn("h-5 w-5", post.isLiked && "fill-current")}
                  />
                  <span>{post.likeCount}</span>
                </button>
                <button
                  onClick={() =>
                    setExpandedComments((prev) => {
                      const next = new Set(prev);
                      if (next.has(post.id)) {
                        next.delete(post.id);
                      } else {
                        next.add(post.id);
                      }
                      return next;
                    })
                  }
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>{post.commentCount}</span>
                </button>
              </div>

              {/* Comments Section (Expandable) */}
              {expandedComments.has(post.id) && (
                <PostComments
                  circleId={circleId}
                  postId={post.id}
                  userId={userId}
                />
              )}
            </CardContent>
          </Card>
        ))
      )}

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        itemType="post"
        onConfirm={handleDelete}
        loading={isDeleting}
      />

      {/* Workout Selection Dialog */}
      <Dialog open={workoutDialogOpen} onOpenChange={setWorkoutDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-brand" />
              Share a Workout
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {loadingWorkouts ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : workouts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Dumbbell className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No workouts available</p>
                <p className="text-sm mt-1">Create workouts in the Programs section first</p>
              </div>
            ) : (
              workouts.map((workout) => (
                <button
                  key={workout.id}
                  onClick={() => selectWorkout(workout)}
                  className="w-full p-3 text-left rounded-lg border hover:border-brand hover:bg-brand/5 transition-colors"
                >
                  <div className="font-medium text-sm">{workout.name}</div>
                  {workout.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {workout.description}
                    </p>
                  )}
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    {workout.difficulty && (
                      <Badge variant="outline" className="text-[10px]">
                        {workout.difficulty}
                      </Badge>
                    )}
                    {workout.estimatedDuration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {workout.estimatedDuration} min
                      </span>
                    )}
                    {workout.exerciseCount !== undefined && (
                      <span>{workout.exerciseCount} exercises</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Challenge Selection Dialog */}
      <Dialog open={challengeDialogOpen} onOpenChange={setChallengeDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-energy" />
              Share a Challenge
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {loadingChallenges ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : challenges.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Trophy className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No challenges available</p>
                <p className="text-sm mt-1">Check back later for new challenges</p>
              </div>
            ) : (
              challenges.map((challenge) => (
                <button
                  key={challenge.id}
                  onClick={() => selectChallenge(challenge)}
                  className="w-full p-3 text-left rounded-lg border hover:border-energy hover:bg-energy/5 transition-colors"
                >
                  <div className="flex gap-3">
                    {challenge.coverImage && (
                      <img
                        src={challenge.coverImage}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{challenge.name}</div>
                      {challenge.shortDescription && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {challenge.shortDescription}
                        </p>
                      )}
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                        {challenge.difficulty && (
                          <Badge variant="outline" className="text-[10px]">
                            {challenge.difficulty}
                          </Badge>
                        )}
                        {challenge.durationDays && (
                          <span>{challenge.durationDays} days</span>
                        )}
                        {challenge.participantCount !== undefined && (
                          <span>{challenge.participantCount} participants</span>
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
    </div>
  );
}

// Post content with highlighted mentions
function PostContentWithMentions({ content }: { content: string }) {
  // Parse and highlight @mentions and #circles
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Combined regex for both user mentions (@) and circle mentions (#)
  const mentionRegex = /(@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+)/g;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    // Add the highlighted mention
    const mention = match[0];
    const isUserMention = mention.startsWith("@");
    parts.push(
      <span
        key={match.index}
        className={cn(
          "font-medium cursor-pointer hover:underline",
          isUserMention ? "text-brand" : "text-purple-500"
        )}
        onClick={(e) => {
          e.stopPropagation();
          // TODO: Navigate to user profile or circle page
          if (isUserMention) {
            window.location.href = `/${mention}`;
          }
        }}
      >
        {mention}
      </span>
    );

    lastIndex = match.index + mention.length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return <>{parts}</>;
}

// Linked Content Preview component
function LinkedContentPreview({
  post,
  circleId,
  onNavigate,
}: {
  post: CirclePost;
  circleId: string;
  onNavigate: (path: string) => void;
}) {
  const [details, setDetails] = useState<{
    name?: string;
    description?: string;
    difficulty?: string;
    duration?: number;
    participantCount?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        if (post.workoutPlanId) {
          const res = await fetch(`/api/circles/${circleId}/workouts`);
          if (res.ok) {
            const data = await res.json();
            const workout = data.workouts?.find((w: { id: string }) => w.id === post.workoutPlanId);
            if (workout) {
              setDetails({
                name: workout.name,
                description: workout.description,
                difficulty: workout.difficulty,
                duration: workout.estimatedDuration,
              });
            }
          }
        } else if (post.challengeId) {
          const res = await fetch(`/api/challenges/${post.challengeId}`);
          if (res.ok) {
            const data = await res.json();
            setDetails({
              name: data.name,
              description: data.shortDescription,
              difficulty: data.difficulty,
              duration: data.durationDays,
              participantCount: data.participantCount,
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch linked content details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [post.workoutPlanId, post.challengeId, circleId]);

  const handleJoinChallenge = async () => {
    if (!post.challengeId) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/challenges/${post.challengeId}/join`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Joined challenge!");
        haptics.success();
        onNavigate(`/challenges/${post.challengeId}`);
      } else {
        const data = await res.json();
        if (data.error?.includes("already")) {
          onNavigate(`/challenges/${post.challengeId}`);
        } else {
          throw new Error(data.error);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to join challenge");
    } finally {
      setJoining(false);
    }
  };

  const handleViewWorkout = () => {
    if (post.workoutPlanId) {
      onNavigate(`/circle/${circleId}/workout/${post.workoutPlanId}`);
    }
  };

  const isWorkout = post.postType === "workout";
  const isChallenge = post.postType === "challenge";

  return (
    <div
      className={cn(
        "mt-3 p-3 rounded-lg cursor-pointer transition-colors",
        isWorkout && "bg-brand/10 hover:bg-brand/15 border border-brand/20",
        isChallenge && "bg-energy/10 hover:bg-energy/15 border border-energy/20",
        !isWorkout && !isChallenge && "bg-muted/50 hover:bg-muted"
      )}
      onClick={isWorkout ? handleViewWorkout : undefined}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isWorkout && <Dumbbell className="h-4 w-4 text-brand" />}
              {isChallenge && <Trophy className="h-4 w-4 text-energy" />}
              {post.postType === "goal" && <Target className="h-4 w-4 text-success" />}
              <span className="text-sm font-medium">
                {details?.name ||
                  (isWorkout ? "Workout" : isChallenge ? "Challenge" : "Goal")}
              </span>
            </div>
            {isChallenge && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-energy text-energy hover:bg-energy hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handleJoinChallenge();
                }}
                disabled={joining}
              >
                {joining ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-3 w-3 mr-1" />
                    Join
                  </>
                )}
              </Button>
            )}
            {isWorkout && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-brand text-brand hover:bg-brand hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewWorkout();
                }}
              >
                <Dumbbell className="h-3 w-3 mr-1" />
                View
              </Button>
            )}
          </div>
          {details?.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {details.description}
            </p>
          )}
          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
            {details?.difficulty && (
              <Badge variant="outline" className="text-[10px]">
                {details.difficulty}
              </Badge>
            )}
            {details?.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {isChallenge ? `${details.duration} days` : `${details.duration} min`}
              </span>
            )}
            {details?.participantCount !== undefined && (
              <span>{details.participantCount} participants</span>
            )}
          </div>
          {post.dueDate && (
            <p className="text-xs text-muted-foreground mt-2">
              Due: {new Date(post.dueDate).toLocaleDateString()}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// Comments component
function PostComments({
  circleId,
  postId,
  userId,
}: {
  circleId: string;
  postId: string;
  userId: string;
}) {
  const [comments, setComments] = useState<
    Array<{
      id: string;
      authorId: string;
      content: string;
      imageUrl?: string | null;
      workoutPlanId?: string | null;
      workoutName?: string | null;
      createdAt: Date;
      authorName: string | null;
      authorImage: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [commentImage, setCommentImage] = useState<{ file: File; preview: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [commentWorkout, setCommentWorkout] = useState<{ id: string; name: string } | null>(null);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const [pickerWorkouts, setPickerWorkouts] = useState<WorkoutPlan[]>([]);
  const [loadingPickerWorkouts, setLoadingPickerWorkouts] = useState(false);
  const commentImageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/circles/${circleId}/posts/${postId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }
    const compressed = await compressImage(file, { maxDimension: 1200 });
    const preview = URL.createObjectURL(compressed);
    setCommentImage({ file: compressed, preview });
  };

  const fetchPickerWorkouts = async () => {
    setLoadingPickerWorkouts(true);
    try {
      const res = await fetch(`/api/circles/${circleId}/workouts`);
      if (res.ok) {
        const data = await res.json();
        setPickerWorkouts(data.workouts || data || []);
      }
    } catch {
      console.error("Failed to fetch workouts");
    } finally {
      setLoadingPickerWorkouts(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() && !commentImage) return;

    setIsPosting(true);
    try {
      // Upload image if present
      let imageUrl: string | undefined;
      if (commentImage) {
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append("file", commentImage.file);
        const uploadRes = await fetch(`/api/circles/${circleId}/posts/upload-image`, {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload image");
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
        setIsUploadingImage(false);
      }

      const res = await fetch(`/api/circles/${circleId}/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment.trim() || (imageUrl ? "📷" : "💪"),
          imageUrl,
          workoutPlanId: commentWorkout?.id,
        }),
      });

      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [comment, ...prev]);
        setNewComment("");
        setCommentImage(null);
        setCommentWorkout(null);
      }
    } catch {
      toast.error("Failed to post comment");
      setIsUploadingImage(false);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="mt-4 pt-3 border-t space-y-3">
      {/* Comment Input */}
      <div className="space-y-2">
        {/* Attachment Previews */}
        {(commentImage || commentWorkout) && (
          <div className="flex gap-2 flex-wrap">
            {commentImage && (
              <div className="relative inline-block">
                <img
                  src={commentImage.preview}
                  alt="Preview"
                  className="h-16 w-16 object-cover rounded-lg border"
                />
                <button
                  onClick={() => setCommentImage(null)}
                  className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {commentWorkout && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-brand/10 rounded-lg border border-brand/20 text-xs">
                <Dumbbell className="h-3 w-3 text-brand" />
                <span className="font-medium">{commentWorkout.name}</span>
                <button onClick={() => setCommentWorkout(null)}>
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <div className="flex-1 flex items-center gap-1 bg-muted/50 rounded-2xl px-3 py-1.5">
            <input
              ref={commentImageRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleCommentImageSelect}
            />
            <button
              onClick={() => commentImageRef.current?.click()}
              disabled={!!commentImage || isPosting}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setShowWorkoutPicker(!showWorkoutPicker);
                if (pickerWorkouts.length === 0) fetchPickerWorkouts();
              }}
              disabled={!!commentWorkout || isPosting}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <Dumbbell className="h-4 w-4" />
            </button>
            <input
              type="text"
              placeholder="Write a comment... Use @ to mention"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handlePostComment()}
              className="flex-1 text-sm bg-transparent py-1 outline-none min-w-0"
              disabled={isPosting}
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePostComment}
            disabled={(!newComment.trim() && !commentImage && !commentWorkout) || isPosting}
            className="shrink-0"
          >
            {isPosting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Inline Workout Picker */}
        {showWorkoutPicker && (
          <div className="bg-muted/50 rounded-lg border p-2 max-h-40 overflow-y-auto space-y-1">
            {loadingPickerWorkouts ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : pickerWorkouts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                No workouts in this circle yet
              </p>
            ) : (
              pickerWorkouts.map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    setCommentWorkout({ id: w.id, name: w.name });
                    setShowWorkoutPicker(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs transition-colors"
                >
                  <span className="font-medium">{w.name}</span>
                  {w.difficulty && (
                    <span className="text-muted-foreground ml-2 capitalize">{w.difficulty}</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          No comments yet
        </p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Avatar className="h-7 w-7">
                {comment.authorImage && <AvatarImage src={comment.authorImage} />}
                <AvatarFallback className="text-xs bg-muted">
                  {comment.authorName?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">
                    {comment.authorName || "Anonymous"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-sm mt-0.5">{comment.content}</p>
                {comment.imageUrl && (
                  <img
                    src={comment.imageUrl}
                    alt="Comment image"
                    loading="lazy"
                    decoding="async"
                    className="mt-1.5 rounded-lg max-h-48 max-w-full object-contain"
                  />
                )}
                {comment.workoutPlanId && comment.workoutName && (
                  <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1 bg-brand/10 rounded border border-brand/20 text-xs w-fit">
                    <Dumbbell className="h-3 w-3 text-brand" />
                    <span className="font-medium">{comment.workoutName}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
