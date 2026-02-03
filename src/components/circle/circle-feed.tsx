"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
  Mic,
  MicOff,
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
}

interface CircleFeedProps {
  circleId: string;
  userId: string;
  userRole: string | null;
}

export function CircleFeed({ circleId, userId, userRole }: CircleFeedProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<CirclePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<CirclePost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = userRole === "admin" || userRole === "owner";

  useEffect(() => {
    fetchPosts();
  }, [circleId]);

  const fetchPosts = async () => {
    try {
      const res = await fetch(`/api/circles/${circleId}/posts`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!newPostContent.trim()) return;

    setIsPosting(true);
    try {
      const res = await fetch(`/api/circles/${circleId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postType: "text",
          content: newPostContent.trim(),
        }),
      });

      if (res.ok) {
        const newPost = await res.json();
        setPosts((prev) => [newPost, ...prev]);
        setNewPostContent("");
        toast.success("Posted!");
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
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarFallback className="bg-brand/20 text-brand">U</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="relative">
                <Textarea
                  placeholder="Share something with your circle..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="min-h-[60px] resize-none pr-12"
                  rows={2}
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
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" disabled>
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button variant="ghost" size="sm" disabled>
                        <Dumbbell className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" disabled>
                        <Trophy className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={handlePost}
                  disabled={!newPostContent.trim() || isPosting}
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
                  {post.authorImage ? (
                    <AvatarFallback className="bg-brand/20">
                      {post.authorName?.charAt(0) || "?"}
                    </AvatarFallback>
                  ) : (
                    <AvatarFallback className="bg-brand/20 text-brand">
                      {post.authorName?.charAt(0) || "?"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {post.authorName || "Anonymous"}
                    </span>
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
                <p className="mt-3 text-sm whitespace-pre-wrap">{post.content}</p>
              )}

              {/* Post Image */}
              {post.imageUrl && (
                <div className="mt-3 rounded-lg overflow-hidden">
                  <img
                    src={post.imageUrl}
                    alt="Post image"
                    className="w-full object-cover max-h-80"
                  />
                </div>
              )}

              {/* Linked Content Preview */}
              {(post.workoutPlanId || post.challengeId || post.goalId) && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {getPostTypeIcon(post.postType)}
                    <span className="text-sm font-medium">
                      {post.postType === "workout"
                        ? "Workout"
                        : post.postType === "challenge"
                        ? "Challenge"
                        : "Goal"}
                    </span>
                  </div>
                  {post.dueDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Due: {new Date(post.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
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
      createdAt: Date;
      authorName: string | null;
      authorImage: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);

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

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    setIsPosting(true);
    try {
      const res = await fetch(`/api/circles/${circleId}/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [comment, ...prev]);
        setNewComment("");
      }
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="mt-4 pt-3 border-t space-y-3">
      {/* Comment Input */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
          className="flex-1 text-sm bg-muted/50 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-brand"
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handlePostComment}
          disabled={!newComment.trim() || isPosting}
        >
          {isPosting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
