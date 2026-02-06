"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  UserPlus,
  UserCheck,
  MapPin,
  Trophy,
  Dumbbell,
  Users,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UserBadge {
  name: string;
  icon?: string;
  tier: string;
}

interface UserProfileCardProps {
  user: {
    id: string;
    displayName?: string;
    profilePicture?: string;
    city?: string;
    workoutCount?: number;
    circleCount?: number;
    badges?: UserBadge[];
    isFollowing?: boolean;
  };
  variant?: "default" | "compact" | "full";
  showFollowButton?: boolean;
  showMessageButton?: boolean;
  onFollow?: (userId: string) => Promise<void>;
  onMessage?: (userId: string) => void;
}

const TIER_COLORS: Record<string, string> = {
  bronze: "bg-amber-700/20 text-amber-700",
  silver: "bg-slate-400/20 text-slate-500",
  gold: "bg-yellow-500/20 text-yellow-600",
  platinum: "bg-cyan-400/20 text-cyan-500",
};

export function UserProfileCard({
  user,
  variant = "default",
  showFollowButton = true,
  showMessageButton = false,
  onFollow,
  onMessage,
}: UserProfileCardProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(user.isFollowing || false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    if (!onFollow) return;
    
    setIsLoading(true);
    const wasFollowing = isFollowing;
    setIsFollowing(!isFollowing);

    try {
      await onFollow(user.id);
      toast.success(wasFollowing ? "Unfollowed" : "Following");
    } catch (error) {
      setIsFollowing(wasFollowing);
      toast.error("Action failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = () => {
    router.push(`/u/${user.id}`);
  };

  if (variant === "compact") {
    return (
      <Card
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={handleCardClick}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.profilePicture} />
              <AvatarFallback>
                {user.displayName?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.displayName || "Anonymous"}</p>
              {user.city && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {user.city}
                </p>
              )}
            </div>
            {showFollowButton && onFollow && (
              <Button
                size="sm"
                variant={isFollowing ? "outline" : "default"}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFollow();
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isFollowing ? (
                  <UserCheck className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "full") {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Avatar
              className="h-16 w-16 cursor-pointer"
              onClick={handleCardClick}
            >
              <AvatarImage src={user.profilePicture} />
              <AvatarFallback className="text-xl">
                {user.displayName?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div
                className="cursor-pointer"
                onClick={handleCardClick}
              >
                <h3 className="font-semibold">{user.displayName || "Anonymous"}</h3>
                {user.city && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {user.city}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-4 mt-2 text-sm">
                {user.workoutCount !== undefined && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Dumbbell className="h-3.5 w-3.5" />
                    {user.workoutCount} workouts
                  </div>
                )}
                {user.circleCount !== undefined && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {user.circleCount} circles
                  </div>
                )}
              </div>

              {/* Badges */}
              {user.badges && user.badges.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {user.badges.slice(0, 4).map((badge, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className={cn("text-xs", TIER_COLORS[badge.tier])}
                    >
                      {badge.icon && <span className="mr-1">{badge.icon}</span>}
                      {badge.name}
                    </Badge>
                  ))}
                  {user.badges.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{user.badges.length - 4}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {(showFollowButton || showMessageButton) && (
            <div className="flex gap-2 mt-4">
              {showFollowButton && onFollow && (
                <Button
                  variant={isFollowing ? "outline" : "default"}
                  className="flex-1"
                  onClick={handleFollow}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : isFollowing ? (
                    <UserCheck className="mr-2 h-4 w-4" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              )}
              {showMessageButton && onMessage && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onMessage(user.id)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Message
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden"
      onClick={handleCardClick}
    >
      <CardContent className="p-0">
        {/* Header gradient */}
        <div className="h-12 bg-gradient-to-r from-brand/30 to-energy/20" />

        <div className="px-4 pb-4">
          <div className="flex items-end gap-3 -mt-6">
            <Avatar className="h-12 w-12 border-2 border-background">
              <AvatarImage src={user.profilePicture} />
              <AvatarFallback>
                {user.displayName?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pb-1">
              <p className="font-medium truncate">{user.displayName || "Anonymous"}</p>
              {user.city && (
                <p className="text-xs text-muted-foreground truncate">
                  {user.city}
                </p>
              )}
            </div>
          </div>

          {/* Featured badges */}
          {user.badges && user.badges.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {user.badges.slice(0, 3).map((badge, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className={cn("text-xs", TIER_COLORS[badge.tier])}
                >
                  {badge.icon && <span className="mr-1">{badge.icon}</span>}
                  {badge.name}
                </Badge>
              ))}
            </div>
          )}

          {showFollowButton && onFollow && (
            <Button
              variant={isFollowing ? "outline" : "default"}
              size="sm"
              className="w-full mt-3"
              onClick={(e) => {
                e.stopPropagation();
                handleFollow();
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isFollowing ? (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Follow
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Grid of user profile cards
 */
export function UserProfileGrid({
  users,
  variant = "default",
  showFollowButton = true,
  onFollow,
}: {
  users: UserProfileCardProps["user"][];
  variant?: UserProfileCardProps["variant"];
  showFollowButton?: boolean;
  onFollow?: (userId: string) => Promise<void>;
}) {
  const gridClass =
    variant === "compact"
      ? "space-y-2"
      : variant === "full"
      ? "space-y-4"
      : "grid grid-cols-2 gap-3";

  return (
    <div className={gridClass}>
      {users.map((user) => (
        <UserProfileCard
          key={user.id}
          user={user}
          variant={variant}
          showFollowButton={showFollowButton}
          onFollow={onFollow}
        />
      ))}
    </div>
  );
}
