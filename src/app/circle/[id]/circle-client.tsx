"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  Crown,
  Dumbbell,
  MessageCircle,
  Plus,
  Settings,
  Target,
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
  }>;
  workouts: Array<{
    id: string;
    name: string;
    category: string | null;
    estimatedDuration: number | null;
    createdAt: Date | null;
  }>;
  challenges: Array<{
    id: string;
    name: string;
    shortDescription: string | null;
    durationDays: number | null;
    participantCount: number | null;
  }>;
  activity: Array<{
    id: string;
    activityType: string | null;
    metadata: unknown;
    createdAt: Date | null;
    userId: string | null;
  }>;
  userId: string;
}

export function CircleClient({
  circle,
  membership,
  members,
  workouts,
  challenges,
  activity,
  userId,
}: CircleClientProps) {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");

  const isOwner = membership?.role === "owner";
  const isAdmin = membership?.role === "admin" || membership?.role === "owner";

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
    toast.success("Circle link copied!");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{circle.name}</h1>
            <p className="text-xs text-muted-foreground">
              {circle.memberCount || members.length} members
            </p>
          </div>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/circle/${circle.id}/settings`)}
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
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

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <Users className="h-5 w-5 mx-auto text-brand" />
                <p className="text-lg font-bold mt-1">{members.length}</p>
                <p className="text-xs text-muted-foreground">Members</p>
              </div>
              <div className="text-center">
                <Dumbbell className="h-5 w-5 mx-auto text-energy" />
                <p className="text-lg font-bold mt-1">{workouts.length}</p>
                <p className="text-xs text-muted-foreground">Workouts</p>
              </div>
              <div className="text-center">
                <Target className="h-5 w-5 mx-auto text-success" />
                <p className="text-lg font-bold mt-1">{challenges.length}</p>
                <p className="text-xs text-muted-foreground">Challenges</p>
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
            <TabsTrigger value="workouts" className="flex-1">
              Workouts
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
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
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
                            Joined{" "}
                            {member.joinedAt
                              ? formatDistanceToNow(new Date(member.joinedAt), {
                                  addSuffix: true,
                                })
                              : "recently"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workouts Tab */}
          <TabsContent value="workouts" className="mt-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Circle Workouts</CardTitle>
                {membership && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push("/workout/new")}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {workouts.length > 0 ? (
                  <div className="space-y-2">
                    {workouts.map((workout) => (
                      <div
                        key={workout.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted"
                        onClick={() => router.push(`/workout/${workout.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <Dumbbell className="h-5 w-5 text-brand" />
                          <div>
                            <p className="font-medium text-sm">{workout.name}</p>
                            {workout.estimatedDuration && (
                              <p className="text-xs text-muted-foreground">
                                ~{workout.estimatedDuration} min
                              </p>
                            )}
                          </div>
                        </div>
                        {workout.category && (
                          <Badge variant="outline" className="text-xs">
                            {workout.category}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No workouts yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Challenges */}
            {challenges.length > 0 && (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Circle Challenges</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {challenges.map((challenge) => (
                      <div
                        key={challenge.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted"
                        onClick={() => router.push(`/challenge/${challenge.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <Trophy className="h-5 w-5 text-energy" />
                          <div>
                            <p className="font-medium text-sm">{challenge.name}</p>
                            {challenge.shortDescription && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {challenge.shortDescription}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {challenge.durationDays} days
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
