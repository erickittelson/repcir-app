"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Check,
  Clock,
  Crown,
  Dumbbell,
  MessageCircle,
  Settings,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { CircleFeed } from "@/components/circle";

interface CircleClientProps {
  circle: {
    id: string;
    name: string;
    description: string | null;
    visibility: string;
    memberCount: number;
    createdAt: Date;
    joinType: string | null;
  };
  membership: {
    id: string;
    role: string;
    userId: string | null;
  } | null;
  members: Array<{
    id: string;
    memberId: string | null;
    userId: string | null;
    role: string | null;
    joinedAt: Date | null;
    name: string;
    profilePicture: string | null;
    trainedToday: boolean;
    workoutsThisWeek: number;
  }>;
  trainedTodayCount: number;
  userId: string;
}

export function CircleClient({
  circle,
  membership,
  members,
  trainedTodayCount,
  userId,
}: CircleClientProps) {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");

  const isAdmin = membership?.role === "admin" || membership?.role === "owner";
  const totalMembers = members.length;

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      const res = await fetch(`/api/circles/${circle.id}/join`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to join");
      toast.success("Joined circle!");
      router.refresh();
    } catch {
      toast.error("Failed to join circle");
    } finally {
      setIsJoining(false);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/circle/${circle.id}`
    );
    toast.success("Rally link copied!");
  };

  return (
    <div className="p-4 space-y-6">
      {/* Page title with settings button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{circle.name}</h1>
          <p className="text-sm text-muted-foreground">
            {circle.memberCount || members.length} members
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/circle/${circle.id}/settings`)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        )}
      </div>
        {/* Circle Overview */}
        <Card className="bg-gradient-to-br from-brand/10 to-success/10 border-brand/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-xl bg-brand-gradient flex items-center justify-center">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold">{circle.name}</h2>
                {circle.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {circle.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary">
                    {circle.visibility === "public" ? "Public" : "Private"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Accountability Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <Users className="h-5 w-5 mx-auto text-brand" />
                <p className="text-lg font-bold mt-1">{totalMembers}</p>
                <p className="text-xs text-muted-foreground">Members</p>
              </div>
              <div className="text-center">
                <Check className="h-5 w-5 mx-auto text-success" />
                <p className="text-lg font-bold mt-1">
                  {trainedTodayCount}/{totalMembers}
                </p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
              <div className="text-center">
                <Dumbbell className="h-5 w-5 mx-auto text-energy" />
                <p className="text-lg font-bold mt-1">
                  {members.reduce((sum, m) => sum + m.workoutsThisWeek, 0)}
                </p>
                <p className="text-xs text-muted-foreground">This Week</p>
              </div>
            </div>

            {/* Actions */}
            {membership ? (
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={copyInviteLink}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push(`/messages`)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </div>
            ) : (
              <Button
                className="w-full mt-6 bg-brand-gradient"
                size="lg"
                onClick={handleJoin}
                disabled={isJoining}
              >
                {isJoining ? "Joining..." : "Join Circle"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="feed" className="flex-1">
              Feed
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1">
              Members
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex-1">
              Leaderboard
            </TabsTrigger>
          </TabsList>

          {/* Feed Tab */}
          <TabsContent value="feed" className="mt-4">
            {membership ? (
              <CircleFeed
                circleId={circle.id}
                userId={userId}
                userRole={membership.role}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Join to see the feed</p>
                  <p className="text-sm mt-1">
                    Members can post and interact in the circle feed
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg",
                          member.trainedToday
                            ? "bg-success/10 border border-success/30"
                            : "bg-muted/50"
                        )}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.profilePicture || undefined} />
                          <AvatarFallback>
                            {member.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">
                              {member.name}
                            </p>
                            {member.role === "owner" && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                            {member.role === "admin" && (
                              <Badge variant="secondary" className="text-xs">
                                Admin
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {member.workoutsThisWeek} workouts this week
                          </p>
                        </div>
                        {member.trainedToday ? (
                          <Check className="h-5 w-5 text-success" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {members.map((member, index) => (
                    <div
                      key={member.id}
                      className={cn(
                        "flex items-center justify-between px-4 py-3",
                        index < 3 && "bg-brand/5"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "text-sm font-bold w-6",
                            index === 0 && "text-yellow-500",
                            index === 1 && "text-gray-400",
                            index === 2 && "text-amber-600"
                          )}
                        >
                          {index + 1}
                        </span>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.profilePicture || undefined} />
                          <AvatarFallback className="text-xs">
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {member.name}
                          </p>
                          {member.trainedToday && (
                            <p className="text-xs text-success">Trained today</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Dumbbell className="h-4 w-4 text-muted-foreground" />
                        <span className="font-bold">{member.workoutsThisWeek}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Weekly Summary */}
            {trainedTodayCount === totalMembers && totalMembers > 1 && (
              <Card className="mt-4 border-success/50 bg-success/5">
                <CardContent className="py-6 text-center">
                  <Trophy className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="font-display tracking-wider text-success">
                    REPCIR COMPLETE
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Everyone trained today. This is what a unit looks like.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
    </div>
  );
}
