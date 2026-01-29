"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquare,
  ThumbsUp,
  MoreVertical,
  Reply,
  Trash2,
  Edit,
  Flag,
  Loader2,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

// ============================================================================
// TYPES
// ============================================================================

export interface Comment {
  id: string;
  userId: string;
  content: string;
  likesCount: number;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  // User info (joined)
  user?: {
    displayName: string;
    profilePictureUrl?: string;
  };
  // For replies
  parentCommentId?: string;
  replies?: Comment[];
  // Current user state
  hasLiked?: boolean;
}

export type ContentType = "workout" | "challenge" | "program" | "circle";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CommentsSectionProps {
  contentType: ContentType;
  contentId: string;
  currentUserId?: string;
  className?: string;
}

export function CommentsSection({
  contentType,
  contentId,
  currentUserId,
  className,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Fetch comments
  useEffect(() => {
    fetchComments();
  }, [contentType, contentId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(
        `/api/content/comments?contentType=${contentType}&contentId=${contentId}`
      );
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (parentId?: string) => {
    const content = parentId ? editContent : newComment;
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/content/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          contentId,
          content: content.trim(),
          parentCommentId: parentId,
        }),
      });

      if (response.ok) {
        setNewComment("");
        setReplyingTo(null);
        setEditContent("");
        fetchComments();
        toast.success(parentId ? "Reply added" : "Comment added");
      } else {
        toast.error("Failed to add comment");
      }
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/content/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      if (response.ok) {
        setEditingComment(null);
        setEditContent("");
        fetchComments();
        toast.success("Comment updated");
      }
    } catch {
      toast.error("Failed to update comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      const response = await fetch(`/api/content/comments/${commentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchComments();
        toast.success("Comment deleted");
      }
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  const handleLike = async (commentId: string) => {
    try {
      const response = await fetch(`/api/content/comments/${commentId}/like`, {
        method: "POST",
      });

      if (response.ok) {
        fetchComments();
      }
    } catch {
      toast.error("Failed to like comment");
    }
  };

  // Organize comments into threads (top-level and replies)
  const topLevelComments = comments.filter((c) => !c.parentCommentId);
  const displayComments = showAll ? topLevelComments : topLevelComments.slice(0, 3);
  const hasMoreComments = topLevelComments.length > 3;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Comments</h3>
        {comments.length > 0 && (
          <Badge variant="secondary">{comments.length}</Badge>
        )}
      </div>

      {/* New Comment Form */}
      {currentUserId && (
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              rows={2}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => handleSubmit()}
                disabled={!newComment.trim() || submitting}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Post
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
          <p>No comments yet</p>
          <p className="text-sm">Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={comments.filter((c) => c.parentCommentId === comment.id)}
              currentUserId={currentUserId}
              replyingTo={replyingTo}
              editingComment={editingComment}
              editContent={editContent}
              submitting={submitting}
              onReply={(id) => {
                setReplyingTo(id);
                setEditContent("");
              }}
              onCancelReply={() => setReplyingTo(null)}
              onSubmitReply={handleSubmit}
              onEdit={(id, content) => {
                setEditingComment(id);
                setEditContent(content);
              }}
              onCancelEdit={() => {
                setEditingComment(null);
                setEditContent("");
              }}
              onSubmitEdit={handleEdit}
              onDelete={handleDelete}
              onLike={handleLike}
              onEditContentChange={setEditContent}
            />
          ))}

          {/* Show more/less */}
          {hasMoreComments && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="w-full"
            >
              {showAll ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Show all {topLevelComments.length} comments
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMMENT ITEM
// ============================================================================

interface CommentItemProps {
  comment: Comment;
  replies: Comment[];
  currentUserId?: string;
  replyingTo: string | null;
  editingComment: string | null;
  editContent: string;
  submitting: boolean;
  onReply: (id: string) => void;
  onCancelReply: () => void;
  onSubmitReply: (parentId: string) => void;
  onEdit: (id: string, content: string) => void;
  onCancelEdit: () => void;
  onSubmitEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onLike: (id: string) => void;
  onEditContentChange: (content: string) => void;
  isReply?: boolean;
}

function CommentItem({
  comment,
  replies,
  currentUserId,
  replyingTo,
  editingComment,
  editContent,
  submitting,
  onReply,
  onCancelReply,
  onSubmitReply,
  onEdit,
  onCancelEdit,
  onSubmitEdit,
  onDelete,
  onLike,
  onEditContentChange,
  isReply = false,
}: CommentItemProps) {
  const isOwner = currentUserId === comment.userId;
  const isEditing = editingComment === comment.id;
  const isReplying = replyingTo === comment.id;

  return (
    <div className={cn("space-y-3", isReply && "ml-10 pt-3 border-l pl-4")}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.user?.profilePictureUrl} />
          <AvatarFallback>
            {comment.user?.displayName?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {comment.user?.displayName || "Anonymous"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {comment.isEdited && (
              <Badge variant="outline" className="text-xs">
                edited
              </Badge>
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="space-y-2 mt-2">
              <Textarea
                value={editContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                rows={2}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => onSubmitEdit(comment.id)}
                  disabled={!editContent.trim() || submitting}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2",
                  comment.hasLiked && "text-red-500"
                )}
                onClick={() => onLike(comment.id)}
              >
                <ThumbsUp className={cn("h-3 w-3 mr-1", comment.hasLiked && "fill-current")} />
                {comment.likesCount > 0 && comment.likesCount}
              </Button>

              {currentUserId && !isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => onReply(comment.id)}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              )}

              {(isOwner || currentUserId) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isOwner && (
                      <>
                        <DropdownMenuItem onClick={() => onEdit(comment.id, comment.content)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(comment.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                    {!isOwner && (
                      <DropdownMenuItem>
                        <Flag className="mr-2 h-4 w-4" />
                        Report
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}

          {/* Reply Form */}
          {isReplying && (
            <div className="mt-3 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
                className="resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancelReply}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => onSubmitReply(comment.id)}
                  disabled={!editContent.trim() || submitting}
                >
                  Reply
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="space-y-3">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={[]}
              currentUserId={currentUserId}
              replyingTo={replyingTo}
              editingComment={editingComment}
              editContent={editContent}
              submitting={submitting}
              onReply={onReply}
              onCancelReply={onCancelReply}
              onSubmitReply={onSubmitReply}
              onEdit={onEdit}
              onCancelEdit={onCancelEdit}
              onSubmitEdit={onSubmitEdit}
              onDelete={onDelete}
              onLike={onLike}
              onEditContentChange={onEditContentChange}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPACT COMMENTS (for cards/previews)
// ============================================================================

export function CommentsPreview({
  contentType,
  contentId,
  commentCount,
  onClick,
}: {
  contentType: ContentType;
  contentId: string;
  commentCount: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <MessageSquare className="h-4 w-4" />
      <span>{commentCount}</span>
    </button>
  );
}

export default CommentsSection;
