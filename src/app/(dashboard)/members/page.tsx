"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, Loader2, Edit, Trash2, Target, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface GoalInput {
  id: string;
  title: string;
  category: string;
  description?: string;
  targetValue?: string;
  targetUnit?: string;
  targetDate?: string;
}

interface CircleMember {
  id: string;
  name: string;
  avatar?: string;
  profilePicture?: string;
  dateOfBirth?: string;
  gender?: string;
  role?: string;
  latestMetrics?: {
    weight?: number;
    height?: number;
    bodyFatPercentage?: number;
    fitnessLevel?: string;
  };
}

export default function MembersPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CircleMember | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    dateOfBirth: "",
    gender: "",
    weight: "",
    height: "",
    bodyFatPercentage: "",
    fitnessLevel: "",
    notes: "",
  });

  const [goals, setGoals] = useState<GoalInput[]>([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<GoalInput>({
    id: "",
    title: "",
    category: "",
    description: "",
    targetValue: "",
    targetUnit: "",
    targetDate: "",
  });

  const GOAL_CATEGORIES = [
    { value: "strength", label: "Strength" },
    { value: "endurance", label: "Endurance" },
    { value: "weight", label: "Weight/Body Composition" },
    { value: "skill", label: "Skill/Movement" },
    { value: "flexibility", label: "Flexibility/Mobility" },
    { value: "habit", label: "Habit/Consistency" },
    { value: "other", label: "Other" },
  ];

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch("/api/members");
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const resetForm = () => {
    setFormData({
      name: "",
      dateOfBirth: "",
      gender: "",
      weight: "",
      height: "",
      bodyFatPercentage: "",
      fitnessLevel: "",
      notes: "",
    });
    setGoals([]);
    setShowGoalForm(false);
    setCurrentGoal({
      id: "",
      title: "",
      category: "",
      description: "",
      targetValue: "",
      targetUnit: "",
      targetDate: "",
    });
    setEditingMember(null);
  };

  const addGoal = () => {
    if (!currentGoal.title || !currentGoal.category) {
      toast.error("Goal title and category are required");
      return;
    }
    setGoals([...goals, { ...currentGoal, id: crypto.randomUUID() }]);
    setCurrentGoal({
      id: "",
      title: "",
      category: "",
      description: "",
      targetValue: "",
      targetUnit: "",
      targetDate: "",
    });
    setShowGoalForm(false);
  };

  const removeGoal = (goalId: string) => {
    setGoals(goals.filter((g) => g.id !== goalId));
  };

  const openEditDialog = (member: CircleMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      dateOfBirth: member.dateOfBirth || "",
      gender: member.gender || "",
      weight: member.latestMetrics?.weight?.toString() || "",
      height: member.latestMetrics?.height?.toString() || "",
      bodyFatPercentage: member.latestMetrics?.bodyFatPercentage?.toString() || "",
      fitnessLevel: member.latestMetrics?.fitnessLevel || "",
      notes: "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingMember
        ? `/api/members/${editingMember.id}`
        : "/api/members";
      const method = editingMember ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          dateOfBirth: formData.dateOfBirth || null,
          gender: formData.gender || null,
          metrics: {
            weight: formData.weight ? parseFloat(formData.weight) : null,
            height: formData.height ? parseFloat(formData.height) : null,
            bodyFatPercentage: formData.bodyFatPercentage
              ? parseFloat(formData.bodyFatPercentage)
              : null,
            fitnessLevel: formData.fitnessLevel || null,
            notes: formData.notes || null,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const memberId = editingMember?.id || data.id;

        // Create goals for new members
        if (!editingMember && goals.length > 0 && memberId) {
          for (const goal of goals) {
            await fetch("/api/goals", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                memberId,
                title: goal.title,
                category: goal.category,
                description: goal.description || null,
                targetValue: goal.targetValue ? parseFloat(goal.targetValue) : null,
                targetUnit: goal.targetUnit || null,
                targetDate: goal.targetDate || null,
              }),
            });
          }
        }

        toast.success(
          editingMember ? "Member updated successfully" : "Member added successfully"
        );
        setDialogOpen(false);
        resetForm();
        fetchMembers();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save member");
      }
    } catch (error) {
      console.error("Failed to save member:", error);
      toast.error("Failed to save member");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) {
      return;
    }

    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Member removed successfully");
        fetchMembers();
      } else {
        toast.error("Failed to remove member");
      }
    } catch (error) {
      console.error("Failed to delete member:", error);
      toast.error("Failed to remove member");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Circle Members</h1>
          <p className="text-muted-foreground">
            Manage your circle&apos;s profiles and metrics
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMember ? "Edit Member" : "Add Member"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfBirth: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) =>
                      setFormData({ ...formData, gender: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Current Metrics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (lbs)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) =>
                        setFormData({ ...formData, weight: e.target.value })
                      }
                      placeholder="150"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Height (inches)</Label>
                    <Input
                      id="height"
                      type="number"
                      step="0.1"
                      value={formData.height}
                      onChange={(e) =>
                        setFormData({ ...formData, height: e.target.value })
                      }
                      placeholder="70"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bodyFat">Body Fat %</Label>
                    <Input
                      id="bodyFat"
                      type="number"
                      step="0.1"
                      value={formData.bodyFatPercentage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bodyFatPercentage: e.target.value,
                        })
                      }
                      placeholder="15"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fitnessLevel">Fitness Level</Label>
                    <Select
                      value={formData.fitnessLevel}
                      onValueChange={(value) =>
                        setFormData({ ...formData, fitnessLevel: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="elite">Elite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Goals Section - Only for new members */}
              {!editingMember && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Goals
                    </h4>
                    {!showGoalForm && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowGoalForm(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Goal
                      </Button>
                    )}
                  </div>

                  {/* List of added goals */}
                  {goals.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {goals.map((goal) => (
                        <div
                          key={goal.id}
                          className="flex items-center justify-between p-2 bg-muted rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium">{goal.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {goal.category}
                              {goal.targetValue && goal.targetUnit && (
                                <> · Target: {goal.targetValue} {goal.targetUnit}</>
                              )}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeGoal(goal.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Goal input form */}
                  {showGoalForm && (
                    <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
                      <div className="space-y-2">
                        <Label htmlFor="goalTitle">Goal Title *</Label>
                        <Input
                          id="goalTitle"
                          value={currentGoal.title}
                          onChange={(e) =>
                            setCurrentGoal({ ...currentGoal, title: e.target.value })
                          }
                          placeholder="e.g., Bench press 200 lbs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="goalCategory">Category *</Label>
                          <Select
                            value={currentGoal.category}
                            onValueChange={(value) =>
                              setCurrentGoal({ ...currentGoal, category: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {GOAL_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="goalTargetDate">Target Date</Label>
                          <Input
                            id="goalTargetDate"
                            type="date"
                            value={currentGoal.targetDate}
                            onChange={(e) =>
                              setCurrentGoal({ ...currentGoal, targetDate: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="goalTargetValue">Target Value</Label>
                          <Input
                            id="goalTargetValue"
                            type="number"
                            value={currentGoal.targetValue}
                            onChange={(e) =>
                              setCurrentGoal({ ...currentGoal, targetValue: e.target.value })
                            }
                            placeholder="e.g., 200"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="goalTargetUnit">Unit</Label>
                          <Input
                            id="goalTargetUnit"
                            value={currentGoal.targetUnit}
                            onChange={(e) =>
                              setCurrentGoal({ ...currentGoal, targetUnit: e.target.value })
                            }
                            placeholder="e.g., lbs, miles, reps"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="goalDescription">Description</Label>
                        <Textarea
                          id="goalDescription"
                          value={currentGoal.description}
                          onChange={(e) =>
                            setCurrentGoal({ ...currentGoal, description: e.target.value })
                          }
                          placeholder="Optional details about this goal..."
                          rows={2}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowGoalForm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={addGoal}
                        >
                          Add Goal
                        </Button>
                      </div>
                    </div>
                  )}

                  {goals.length === 0 && !showGoalForm && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No goals added yet. Goals help the AI create personalized workouts.
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingMember ? "Save Changes" : "Add Member"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No members yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first member to get started
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Card key={member.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      {member.profilePicture && (
                        <AvatarImage src={member.profilePicture} alt={member.name} />
                      )}
                      <AvatarFallback className="text-lg">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{member.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {member.dateOfBirth && (
                          <span className="text-sm text-muted-foreground">
                            {calculateAge(member.dateOfBirth)} years old
                          </span>
                        )}
                        {member.gender && (
                          <Badge variant="outline" className="text-xs">
                            {member.gender}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <Link href={`/members/${member.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(member.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {member.latestMetrics ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {member.latestMetrics.weight && (
                      <div>
                        <span className="text-muted-foreground">Weight:</span>{" "}
                        {member.latestMetrics.weight} lbs
                      </div>
                    )}
                    {member.latestMetrics.height && (
                      <div>
                        <span className="text-muted-foreground">Height:</span>{" "}
                        {Math.floor(member.latestMetrics.height / 12)}&apos;
                        {member.latestMetrics.height % 12}&quot;
                      </div>
                    )}
                    {member.latestMetrics.bodyFatPercentage && (
                      <div>
                        <span className="text-muted-foreground">Body Fat:</span>{" "}
                        {member.latestMetrics.bodyFatPercentage}%
                      </div>
                    )}
                    {member.latestMetrics.fitnessLevel && (
                      <div>
                        <Badge variant="secondary">
                          {member.latestMetrics.fitnessLevel}
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No metrics recorded yet
                  </p>
                )}
                <div className="mt-4">
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/members/${member.id}`}>View Profile</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
