"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Dumbbell,
  Target,
  ArrowRight,
  CalendarDays,
  User,
  Edit2,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

interface Goal {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  targetValue?: number | null;
  targetUnit?: string | null;
  currentValue?: number | null;
  targetDate?: Date | null;
  status: string;
  member?: { name: string } | null;
}

interface Circle {
  id: string;
  name: string;
}

interface Workout {
  id: string;
  name: string;
  date: Date;
  member?: { name: string } | null;
}

interface UserProfile {
  displayName?: string | null;
  profilePicture?: string | null;
  birthMonth?: number | null;
  birthYear?: number | null;
  city?: string | null;
  country?: string | null;
}

interface DashboardClientProps {
  activeGoals: Goal[];
  userCircles: Circle[];
  recentWorkouts: Workout[];
  activeCircleId?: string;
  userProfile?: UserProfile | null;
  userName?: string;
}

export function ActiveGoalsSection({ goals }: { goals: Goal[] }) {
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category: "",
    targetValue: "",
    targetUnit: "",
    currentValue: "",
    status: "",
  });

  const handleGoalClick = (goal: Goal) => {
    setSelectedGoal(goal);
    setEditForm({
      title: goal.title,
      description: goal.description || "",
      category: goal.category,
      targetValue: goal.targetValue?.toString() || "",
      targetUnit: goal.targetUnit || "",
      currentValue: goal.currentValue?.toString() || "",
      status: goal.status,
    });
    setIsEditing(true);
  };

  const handleSaveGoal = async () => {
    if (!selectedGoal) return;
    setIsSaving(true);

    try {
      const response = await fetch(`/api/goals/${selectedGoal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || null,
          category: editForm.category,
          targetValue: editForm.targetValue ? parseFloat(editForm.targetValue) : null,
          targetUnit: editForm.targetUnit || null,
          currentValue: editForm.currentValue ? parseFloat(editForm.currentValue) : null,
          status: editForm.status,
        }),
      });

      if (response.ok) {
        toast.success("Goal updated successfully");
        setIsEditing(false);
        // Refresh the page to get updated data
        window.location.reload();
      } else {
        throw new Error("Failed to update goal");
      }
    } catch (error) {
      toast.error("Failed to update goal");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>Active Goals</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/you?section=goals">
              View all
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {goals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-3 text-sm font-semibold">No active goals</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Set goals to track your progress
              </p>
              <Button asChild className="mt-4">
                <Link href="/you?section=goals&action=new">Set Goal</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {goals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => handleGoalClick(goal)}
                  className="p-4 border rounded-lg space-y-2 text-left hover:bg-muted/50 transition-colors cursor-pointer w-full"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{goal.category}</Badge>
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <h4 className="font-medium">{goal.title}</h4>
                  {goal.targetValue && (
                    <p className="text-sm text-muted-foreground">
                      Target: {goal.targetValue} {goal.targetUnit}
                      {goal.currentValue && (
                        <span className="ml-2">
                          (Current: {goal.currentValue})
                        </span>
                      )}
                    </p>
                  )}
                  {goal.targetDate && (
                    <p className="text-xs text-muted-foreground">
                      Due: {new Date(goal.targetDate).toLocaleDateString()}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goal Edit Modal */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
            <DialogDescription>
              Update your goal details and track your progress.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={editForm.category}
                  onValueChange={(value) => setEditForm({ ...editForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="weight">Weight</SelectItem>
                    <SelectItem value="flexibility">Flexibility</SelectItem>
                    <SelectItem value="endurance">Endurance</SelectItem>
                    <SelectItem value="skill">Skill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="abandoned">Abandoned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetValue">Target</Label>
                <Input
                  id="targetValue"
                  type="number"
                  value={editForm.targetValue}
                  onChange={(e) => setEditForm({ ...editForm, targetValue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentValue">Current</Label>
                <Input
                  id="currentValue"
                  type="number"
                  value={editForm.currentValue}
                  onChange={(e) => setEditForm({ ...editForm, currentValue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetUnit">Unit</Label>
                <Input
                  id="targetUnit"
                  value={editForm.targetUnit}
                  onChange={(e) => setEditForm({ ...editForm, targetUnit: e.target.value })}
                  placeholder="lbs, reps, etc."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveGoal} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function YourCirclesSection({
  circles,
  activeCircleId,
}: {
  circles: Circle[];
  activeCircleId?: string;
}) {
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  const handleSwitchCircle = async (circleId: string) => {
    if (circleId === activeCircleId) return;
    setSwitchingTo(circleId);

    try {
      const response = await fetch("/api/circles/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ circleId }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        throw new Error("Failed to switch");
      }
    } catch {
      toast.error("Failed to switch circle");
    } finally {
      setSwitchingTo(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle>Your Circles</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/discover">
            View all
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {circles.length === 0 ? (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-3 text-sm font-semibold">No circles yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create or join a circle to train together
            </p>
            <Button asChild className="mt-4">
              <Link href="/discover">Find Circles</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {circles.slice(0, 4).map((circle) => (
              <div
                key={circle.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{circle.name}</p>
                    {circle.id === activeCircleId && (
                      <p className="text-xs text-muted-foreground">Active</p>
                    )}
                  </div>
                </div>
                {circle.id !== activeCircleId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSwitchCircle(circle.id)}
                    disabled={switchingTo === circle.id}
                  >
                    {switchingTo === circle.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Switch"
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentWorkoutsSection({ workouts }: { workouts: Workout[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle>Recent Workouts</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/activity?tab=history">
            View all
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {workouts.length === 0 ? (
          <div className="text-center py-8">
            <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-3 text-sm font-semibold">No recent workouts</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Start your fitness journey today
            </p>
            <Button asChild className="mt-4">
              <Link href="/workout/new">Create Workout</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map((workout) => (
              <div
                key={workout.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Dumbbell className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{workout.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {workout.member?.name || "Unknown"} •{" "}
                      {new Date(workout.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0">Completed</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ProfileSection({ profile, userName }: { profile?: UserProfile | null; userName?: string }) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle>Your Profile</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/you">
            View & Edit
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <Link href="/you" className="block hover:bg-muted/50 rounded-lg transition-colors -mx-2 px-2 py-2">
          <div className="flex items-start gap-4">
            {profile?.profilePicture ? (
              <div className="w-16 h-16 rounded-full overflow-hidden shrink-0">
                <Image
                  src={profile.profilePicture}
                  alt={profile?.displayName || userName || "Profile"}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-8 h-8 text-primary" />
              </div>
            )}
            <div className="space-y-1 min-w-0 flex-1">
              <p className="font-semibold text-lg truncate">
                {profile?.displayName || userName || "User"}
              </p>
              {profile?.city && profile?.country && (
                <p className="text-sm text-muted-foreground">
                  {profile.city}, {profile.country}
                </p>
              )}
              {profile?.birthMonth && profile?.birthYear && (
                <p className="text-sm text-muted-foreground">
                  Born {months[profile.birthMonth - 1]} {profile.birthYear}
                </p>
              )}
              {!profile?.city && !profile?.birthMonth && (
                <p className="text-sm text-muted-foreground">
                  Complete your profile to personalize your experience →
                </p>
              )}
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
