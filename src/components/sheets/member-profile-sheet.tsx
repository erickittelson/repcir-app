"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  UserPlus,
  MapPin,
  Trophy,
  Dumbbell,
  TrendingUp,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MemberProfile {
  id: string;
  userId: string;
  displayName: string;
  profilePicture?: string;
  city?: string;
  country?: string;
  fitnessLevel?: string;
  isFollowing?: boolean;
  stats?: {
    workoutsCompleted?: number;
    personalRecords?: number;
    achievedSkills?: number;
  };
  skills?: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  recentPRs?: Array<{
    id: string;
    exerciseName: string;
    value: number;
    unit: string;
  }>;
}

interface MemberProfileSheetProps {
  member: MemberProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFollow?: (userId: string) => void;
  onMessage?: (userId: string) => void;
}

export function MemberProfileSheet({
  member,
  open,
  onOpenChange,
  onFollow,
  onMessage,
}: MemberProfileSheetProps) {
  if (!member) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl p-0">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted" />

        <ScrollArea className="h-full">
          <div className="px-6 pb-8">
            {/* Header */}
            <div className="pt-6 pb-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={member.profilePicture} />
                  <AvatarFallback className="text-2xl bg-brand/20 text-brand">
                    {member.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <SheetTitle className="text-xl">
                    {member.displayName}
                  </SheetTitle>
                  {member.city && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {member.city}
                      {member.country && `, ${member.country}`}
                    </p>
                  )}
                  {member.fitnessLevel && (
                    <Badge variant="secondary" className="mt-2">
                      {member.fitnessLevel}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                {onFollow && (
                  <Button
                    className={cn(
                      "flex-1",
                      member.isFollowing
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-brand-gradient"
                    )}
                    onClick={() => onFollow(member.userId)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    {member.isFollowing ? "Following" : "Follow"}
                  </Button>
                )}
                {onMessage && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => onMessage(member.userId)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Message
                  </Button>
                )}
              </div>
            </div>

            {/* Stats */}
            {member.stats && (
              <div className="grid grid-cols-3 gap-3 py-4">
                <div className="text-center rounded-xl bg-muted p-3">
                  <Dumbbell className="mx-auto h-5 w-5 text-brand mb-1" />
                  <p className="text-xl font-bold">
                    {member.stats.workoutsCompleted || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Workouts</p>
                </div>
                <div className="text-center rounded-xl bg-muted p-3">
                  <TrendingUp className="mx-auto h-5 w-5 text-energy mb-1" />
                  <p className="text-xl font-bold">
                    {member.stats.personalRecords || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">PRs</p>
                </div>
                <div className="text-center rounded-xl bg-muted p-3">
                  <Award className="mx-auto h-5 w-5 text-success mb-1" />
                  <p className="text-xl font-bold">
                    {member.stats.achievedSkills || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Skills</p>
                </div>
              </div>
            )}

            {/* Skills */}
            {member.skills && member.skills.length > 0 && (
              <section className="py-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-energy" />
                  Achievements
                </h3>
                <div className="flex flex-wrap gap-2">
                  {member.skills
                    .filter(
                      (s) => s.status === "achieved" || s.status === "mastered"
                    )
                    .map((skill) => (
                      <Badge
                        key={skill.id}
                        className={cn(
                          skill.status === "mastered"
                            ? "bg-energy/20 text-energy"
                            : "bg-success/20 text-success"
                        )}
                      >
                        <Award className="mr-1 h-3 w-3" />
                        {skill.name}
                        {skill.status === "mastered" && " ⭐"}
                      </Badge>
                    ))}
                </div>
              </section>
            )}

            {/* Recent PRs */}
            {member.recentPRs && member.recentPRs.length > 0 && (
              <section className="py-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-energy" />
                  Recent Personal Records
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {member.recentPRs.slice(0, 4).map((pr) => (
                    <div
                      key={pr.id}
                      className="rounded-xl bg-muted p-3 text-center"
                    >
                      <p className="text-xs text-muted-foreground truncate">
                        {pr.exerciseName}
                      </p>
                      <p className="text-lg font-bold">
                        {pr.value} {pr.unit}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
