"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Share2,
  ChevronRight,
  Loader2,
  Shield,
  Dumbbell,
  Trophy,
  Clock,
  MapPin,
  Globe,
  Lock,
  UserPlus,
  Crown,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CircleMember {
  id: string;
  name: string;
  avatarUrl?: string;
  role: "owner" | "admin" | "member";
}

interface CircleWorkout {
  id: string;
  name: string;
  category?: string;
  difficulty?: string;
}

interface CircleChallenge {
  id: string;
  name: string;
  durationDays: number;
  participantCount: number;
}

interface CircleDetail {
  id: string;
  name: string;
  description?: string;
  handle?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  focusArea?: string;
  visibility: "public" | "private";
  memberCount: number;
  // Activity stats
  weeklyWorkouts?: number;
  totalWorkouts?: number;
  activeChallenges?: number;
  // Members
  recentMembers?: CircleMember[];
  admins?: CircleMember[];
  // Content samples
  featuredWorkouts?: CircleWorkout[];
  activeChallengesList?: CircleChallenge[];
  // User status
  isMember?: boolean;
  userRole?: "owner" | "admin" | "member";
  isPendingRequest?: boolean;
  // Circle rules/guidelines
  rules?: string[];
  location?: string;
  createdAt?: string;
}

interface CircleDetailSheetProps {
  circleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin?: (circleId: string) => void;
}

export function CircleDetailSheet({
  circleId,
  open,
  onOpenChange,
  onJoin,
}: CircleDetailSheetProps) {
  const router = useRouter();
  const [circle, setCircle] = useState<CircleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (open && circleId) {
      setLoading(true);
      fetch(`/api/circles/${circleId}`)
        .then((res) => res.json())
        .then((data) => setCircle(data))
        .catch(() => toast.error("Failed to load rally"))
        .finally(() => setLoading(false));
    }
  }, [open, circleId]);

  const handleJoin = async () => {
    if (!circleId) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/circles/${circleId}/join`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        if (circle?.visibility === "private") {
          setCircle((prev) =>
            prev ? { ...prev, isPendingRequest: true } : prev
          );
          toast.success("Request sent! Waiting for admin approval.");
        } else {
          setCircle((prev) =>
            prev ? { ...prev, isMember: true, userRole: "member" } : prev
          );
          toast.success("Welcome to the rally!");
        }
        if (onJoin) onJoin(circleId);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to join rally");
      }
    } catch {
      toast.error("Failed to join rally");
    } finally {
      setJoining(false);
    }
  };

  const handleShare = () => {
    const url = circle?.handle
      ? `${window.location.origin}/c/${circle.handle}`
      : `${window.location.origin}/circle/${circleId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied! Share it on your socials.");
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-600 text-[10px]">
            <Crown className="h-2.5 w-2.5 mr-1" />
            Owner
          </Badge>
        );
      case "admin":
        return (
          <Badge className="bg-brand/20 text-brand text-[10px]">
            <Shield className="h-2.5 w-2.5 mr-1" />
            Admin
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted" />
        
        {/* Accessible title - always present for screen readers */}
        {(loading || !circle) && (
          <SheetHeader className="sr-only">
            <SheetTitle>Circle Details</SheetTitle>
          </SheetHeader>
        )}

        {loading ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-32 w-full" />
          </div>
        ) : circle ? (
          <ScrollArea className="h-full">
            <div className="px-6 pb-32">
              {/* Cover Image */}
              {circle.coverImageUrl && (
                <div className="relative -mx-6 h-32 mb-4">
                  <img
                    src={circle.coverImageUrl}
                    alt={circle.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                </div>
              )}

              <SheetHeader className="pt-4 pb-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 border-4 border-background shadow-lg">
                    <AvatarImage src={circle.imageUrl} />
                    <AvatarFallback className="bg-brand/20 text-brand text-xl">
                      {circle.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <SheetTitle className="text-xl">{circle.name}</SheetTitle>
                    {circle.handle && (
                      <p className="text-sm text-brand">@{circle.handle}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {circle.visibility === "private" ? (
                        <Badge
                          variant="outline"
                          className="text-xs flex items-center gap-1"
                        >
                          <Lock className="h-3 w-3" />
                          Private
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs flex items-center gap-1"
                        >
                          <Globe className="h-3 w-3" />
                          Public
                        </Badge>
                      )}
                      {circle.focusArea && (
                        <Badge variant="secondary" className="text-xs">
                          {circle.focusArea}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </SheetHeader>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold">{circle.memberCount}</p>
                  <p className="text-xs text-muted-foreground">Members</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {circle.weeklyWorkouts || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">This Week</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {circle.activeChallenges || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Challenges</p>
                </div>
              </div>

              {/* Description */}
              {circle.description && (
                <section className="mb-6">
                  <p className="text-sm text-muted-foreground">
                    {circle.description}
                  </p>
                </section>
              )}

              {/* Location */}
              {circle.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <MapPin className="h-4 w-4" />
                  {circle.location}
                </div>
              )}

              {/* Admins */}
              {circle.admins && circle.admins.length > 0 && (
                <section className="mb-6">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-brand" />
                    Leadership
                  </h3>
                  <div className="space-y-2">
                    {circle.admins.map((admin) => (
                      <div
                        key={admin.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={admin.avatarUrl} />
                          <AvatarFallback>{admin.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{admin.name}</p>
                        </div>
                        {getRoleBadge(admin.role)}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Circle Rules */}
              {circle.rules && circle.rules.length > 0 && (
                <section className="mb-6">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-energy" />
                    Circle Guidelines
                  </h3>
                  <ul className="space-y-2">
                    {circle.rules.map((rule, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-brand" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <Separator className="my-6" />

              {/* Featured Workouts */}
              {circle.featuredWorkouts && circle.featuredWorkouts.length > 0 && (
                <section className="mb-6">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-brand" />
                    Popular Workouts
                  </h3>
                  <div className="space-y-2">
                    {circle.featuredWorkouts.map((workout) => (
                      <div
                        key={workout.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-brand/20 flex items-center justify-center">
                            <Dumbbell className="h-4 w-4 text-brand" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{workout.name}</p>
                            <div className="flex gap-2">
                              {workout.category && (
                                <span className="text-xs text-muted-foreground">
                                  {workout.category}
                                </span>
                              )}
                              {workout.difficulty && (
                                <span className="text-xs text-muted-foreground">
                                  · {workout.difficulty}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Active Challenges */}
              {circle.activeChallengesList &&
                circle.activeChallengesList.length > 0 && (
                  <section className="mb-6">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-energy" />
                      Active Challenges
                    </h3>
                    <div className="space-y-2">
                      {circle.activeChallengesList.map((challenge) => (
                        <div
                          key={challenge.id}
                          className="flex items-center justify-between p-3 bg-energy/10 rounded-lg cursor-pointer hover:bg-energy/20 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-energy/20 flex items-center justify-center">
                              <Trophy className="h-4 w-4 text-energy" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {challenge.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {challenge.durationDays} days ·{" "}
                                {challenge.participantCount} participants
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

              {/* Recent Members */}
              {circle.recentMembers && circle.recentMembers.length > 0 && (
                <section className="mb-6">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-success" />
                    Recent Members
                  </h3>
                  <div className="flex -space-x-2">
                    {circle.recentMembers.slice(0, 8).map((member) => (
                      <Avatar
                        key={member.id}
                        className="h-10 w-10 border-2 border-background"
                      >
                        <AvatarImage src={member.avatarUrl} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ))}
                    {circle.memberCount > 8 && (
                      <div className="h-10 w-10 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                        <span className="text-xs font-medium">
                          +{circle.memberCount - 8}
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Fixed Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
              <div className="flex gap-2 mb-2">
                <Button variant="outline" className="flex-1" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
              {circle.isMember ? (
                <Button
                  className="w-full bg-success"
                  onClick={() => router.push(`/circle/${circleId}`)}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  View Circle
                </Button>
              ) : circle.isPendingRequest ? (
                <Button className="w-full" disabled>
                  <Clock className="h-4 w-4 mr-2" />
                  Request Pending
                </Button>
              ) : (
                <Button
                  className="w-full bg-brand-gradient"
                  onClick={handleJoin}
                  disabled={joining}
                >
                  {joining ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {circle.visibility === "private"
                    ? "Request to Join"
                    : "Join Rally"}
                </Button>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Rally not found
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
