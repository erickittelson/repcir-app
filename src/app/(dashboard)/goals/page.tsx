"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Target,
  Plus,
  Loader2,
  Trophy,
  CheckCircle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Milestone,
  Wand2,
  Trash2,
  Edit,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { QuickFeedback } from "@/components/quick-feedback";

interface CircleMember {
  id: string;
  name: string;
}

interface MilestoneData {
  id: string;
  title: string;
  description?: string;
  targetValue?: number;
  targetDate?: string;
  status: string;
  order: number;
  aiGenerated: boolean;
  completedAt?: string;
}

interface Goal {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  description?: string;
  category: string;
  targetValue?: number;
  targetUnit?: string;
  currentValue?: number;
  targetDate?: string;
  status: string;
  aiGenerated: boolean;
  milestones: MilestoneData[];
}

const categories = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio/Endurance" },
  { value: "skill", label: "Skill/Movement" },
  { value: "weight", label: "Weight/Body Comp" },
  { value: "flexibility", label: "Flexibility" },
  { value: "sport", label: "Sport Performance" },
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [generatingMilestones, setGeneratingMilestones] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    memberId: "",
    title: "",
    description: "",
    category: "",
    targetValue: "",
    targetUnit: "",
    currentValue: "",
    targetDate: "",
  });

  // Edit goal state
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    category: "",
    targetValue: "",
    targetUnit: "",
    currentValue: "",
    targetDate: "",
  });

  // Delete goal state
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [goalsRes, membersRes] = await Promise.all([
        fetch("/api/goals"),
        fetch("/api/members"),
      ]);

      if (goalsRes.ok) {
        const data = await goalsRes.json();
        setGoals(data);
      }

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      memberId: "",
      title: "",
      description: "",
      category: "",
      targetValue: "",
      targetUnit: "",
      currentValue: "",
      targetDate: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: formData.memberId,
          title: formData.title,
          description: formData.description || null,
          category: formData.category,
          targetValue: formData.targetValue
            ? parseFloat(formData.targetValue)
            : null,
          targetUnit: formData.targetUnit || null,
          currentValue: formData.currentValue
            ? parseFloat(formData.currentValue)
            : null,
          targetDate: formData.targetDate || null,
        }),
      });

      if (response.ok) {
        toast.success("Goal created successfully");
        setDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to create goal");
      }
    } catch (error) {
      console.error("Failed to create goal:", error);
      toast.error("Failed to create goal");
    } finally {
      setSaving(false);
    }
  };

  const updateGoalStatus = async (goalId: string, status: string) => {
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success(
          status === "completed" ? "Congratulations! Goal completed!" : "Goal updated"
        );
        fetchData();
      }
    } catch (error) {
      console.error("Failed to update goal:", error);
    }
  };

  const updateCurrentValue = async (goalId: string, currentValue: number) => {
    try {
      await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentValue }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to update goal:", error);
    }
  };

  const toggleGoalExpanded = (goalId: string) => {
    setExpandedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  };

  const generateMilestones = async (goalId: string) => {
    setGeneratingMilestones(goalId);
    try {
      const response = await fetch("/api/ai/generate-milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId }),
      });

      if (response.ok) {
        toast.success("AI milestones generated!");
        fetchData();
        // Auto-expand the goal to show milestones
        setExpandedGoals((prev) => new Set(prev).add(goalId));
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data.details || "Failed to generate milestones");
        console.error("Milestone generation failed:", data);
      }
    } catch (error) {
      console.error("Failed to generate milestones:", error);
      toast.error("Failed to generate milestones");
    } finally {
      setGeneratingMilestones(null);
    }
  };

  const toggleMilestoneStatus = async (milestoneId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      const response = await fetch(`/api/milestones/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        if (newStatus === "completed") {
          toast.success("Milestone completed!");
        }
        fetchData();
      }
    } catch (error) {
      console.error("Failed to update milestone:", error);
    }
  };

  const deleteMilestone = async (milestoneId: string) => {
    try {
      const response = await fetch(`/api/milestones/${milestoneId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Milestone deleted");
        fetchData();
      }
    } catch (error) {
      console.error("Failed to delete milestone:", error);
    }
  };

  // Open edit dialog with goal data
  const openEditDialog = (goal: Goal) => {
    setEditingGoal(goal);
    setEditFormData({
      title: goal.title,
      description: goal.description || "",
      category: goal.category,
      targetValue: goal.targetValue?.toString() || "",
      targetUnit: goal.targetUnit || "",
      currentValue: goal.currentValue?.toString() || "",
      targetDate: goal.targetDate?.split("T")[0] || "",
    });
    setEditDialogOpen(true);
  };

  // Save edited goal
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/goals/${editingGoal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editFormData.title,
          description: editFormData.description || null,
          category: editFormData.category,
          targetValue: editFormData.targetValue ? parseFloat(editFormData.targetValue) : null,
          targetUnit: editFormData.targetUnit || null,
          currentValue: editFormData.currentValue ? parseFloat(editFormData.currentValue) : null,
          targetDate: editFormData.targetDate || null,
        }),
      });

      if (response.ok) {
        toast.success("Goal updated successfully");
        setEditDialogOpen(false);
        setEditingGoal(null);
        fetchData();
      } else {
        toast.error("Failed to update goal");
      }
    } catch (error) {
      console.error("Failed to update goal:", error);
      toast.error("Failed to update goal");
    } finally {
      setSaving(false);
    }
  };

  // Delete goal
  const handleDeleteGoal = async () => {
    if (!deletingGoal) return;

    try {
      const response = await fetch(`/api/goals/${deletingGoal.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Goal deleted");
        setDeleteDialogOpen(false);
        setDeletingGoal(null);
        fetchData();
      } else {
        toast.error("Failed to delete goal");
      }
    } catch (error) {
      console.error("Failed to delete goal:", error);
      toast.error("Failed to delete goal");
    }
  };

  // Reopen a completed goal
  const reopenGoal = async (goalId: string) => {
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });

      if (response.ok) {
        toast.success("Goal reopened");
        fetchData();
      }
    } catch (error) {
      console.error("Failed to reopen goal:", error);
    }
  };

  const calculateProgress = (goal: Goal) => {
    if (!goal.targetValue || !goal.currentValue) return 0;
    return Math.min(100, (goal.currentValue / goal.targetValue) * 100);
  };

  const calculateMilestoneProgress = (goal: Goal) => {
    if (goal.milestones.length === 0) return 0;
    const completed = goal.milestones.filter((m) => m.status === "completed").length;
    return Math.round((completed / goal.milestones.length) * 100);
  };

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

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
          <h1 className="text-3xl font-bold">Goals & Milestones</h1>
          <p className="text-muted-foreground">
            Track fitness goals for your circle
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
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Circle Member *</Label>
                <Select
                  value={formData.memberId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, memberId: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Goal Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Bench press 225 lbs"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Value</Label>
                  <Input
                    type="number"
                    value={formData.targetValue}
                    onChange={(e) =>
                      setFormData({ ...formData, targetValue: e.target.value })
                    }
                    placeholder="225"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input
                    value={formData.targetUnit}
                    onChange={(e) =>
                      setFormData({ ...formData, targetUnit: e.target.value })
                    }
                    placeholder="lbs, reps, miles"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Current Value</Label>
                <Input
                  type="number"
                  value={formData.currentValue}
                  onChange={(e) =>
                    setFormData({ ...formData, currentValue: e.target.value })
                  }
                  placeholder="Current progress"
                />
              </div>

              <div className="space-y-2">
                <Label>Target Date</Label>
                <Input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) =>
                    setFormData({ ...formData, targetDate: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Any additional details..."
                />
              </div>

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
                  Create Goal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Goals */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5" />
          Active Goals ({activeGoals.length})
        </h2>

        {activeGoals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No active goals</h3>
              <p className="text-muted-foreground mb-4">
                Set goals to track your circle&apos;s fitness progress
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Goal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeGoals.map((goal) => (
              <Collapsible
                key={goal.id}
                open={expandedGoals.has(goal.id)}
                onOpenChange={() => toggleGoalExpanded(goal.id)}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                          {expandedGoals.has(goal.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div>
                            <CardTitle className="text-lg">{goal.title}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {goal.memberName}
                            </p>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <div className="flex gap-1">
                        <Badge variant="outline">{goal.category}</Badge>
                        {goal.aiGenerated && (
                          <Badge variant="secondary">
                            <Sparkles className="mr-1 h-3 w-3" />
                            AI
                          </Badge>
                        )}
                        {goal.milestones.length > 0 && (
                          <Badge variant="secondary">
                            <Milestone className="mr-1 h-3 w-3" />
                            {goal.milestones.filter((m) => m.status === "completed").length}/
                            {goal.milestones.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {goal.description && (
                      <p className="text-sm text-muted-foreground">
                        {goal.description}
                      </p>
                    )}

                    {goal.targetValue && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>
                            {goal.currentValue || 0} / {goal.targetValue}{" "}
                            {goal.targetUnit}
                          </span>
                        </div>
                        <Progress value={calculateProgress(goal)} />
                      </div>
                    )}

                    {goal.milestones.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Milestones</span>
                          <span>
                            {goal.milestones.filter((m) => m.status === "completed").length}/
                            {goal.milestones.length} completed
                          </span>
                        </div>
                        <Progress
                          value={calculateMilestoneProgress(goal)}
                          className="h-2"
                        />
                      </div>
                    )}

                    {goal.targetDate && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Target: {new Date(goal.targetDate).toLocaleDateString()}
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {goal.targetValue && (
                        <Input
                          type="number"
                          placeholder="Update progress"
                          className="h-8 w-32"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const value = parseFloat(
                                (e.target as HTMLInputElement).value
                              );
                              if (!isNaN(value)) {
                                updateCurrentValue(goal.id, value);
                                (e.target as HTMLInputElement).value = "";
                              }
                            }
                          }}
                        />
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateMilestones(goal.id)}
                        disabled={generatingMilestones === goal.id}
                      >
                        {generatingMilestones === goal.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Wand2 className="mr-1 h-3 w-3" />
                        )}
                        {goal.milestones.length > 0 ? "Add More" : "Generate"} Milestones
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateGoalStatus(goal.id, "completed")}
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(goal)}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeletingGoal(goal);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                      </Button>
                      <QuickFeedback
                        memberId={goal.memberId}
                        entityType="goal"
                        entityId={goal.id}
                        compact
                        onSubmit={() => fetchData()}
                      />
                    </div>

                    {/* Milestones Section */}
                    <CollapsibleContent>
                      {goal.milestones.length > 0 && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <Milestone className="h-4 w-4" />
                            Milestones
                          </h4>
                          <div className="space-y-2">
                            {goal.milestones
                              .sort((a, b) => a.order - b.order)
                              .map((milestone) => (
                                <div
                                  key={milestone.id}
                                  className={cn(
                                    "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                                    milestone.status === "completed"
                                      ? "bg-green-500/5 border-green-500/20"
                                      : "bg-muted/50"
                                  )}
                                >
                                  <Checkbox
                                    checked={milestone.status === "completed"}
                                    onCheckedChange={() =>
                                      toggleMilestoneStatus(milestone.id, milestone.status)
                                    }
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <p
                                        className={cn(
                                          "font-medium text-sm",
                                          milestone.status === "completed" &&
                                            "line-through text-muted-foreground"
                                        )}
                                      >
                                        {milestone.title}
                                      </p>
                                      <div className="flex items-center gap-1">
                                        {milestone.aiGenerated && (
                                          <Badge variant="outline" className="text-xs h-5">
                                            <Sparkles className="mr-1 h-2.5 w-2.5" />
                                            AI
                                          </Badge>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                          onClick={() => deleteMilestone(milestone.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    {milestone.description && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {milestone.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-3 mt-1.5">
                                      {milestone.targetValue !== null && (
                                        <span className="text-xs text-muted-foreground">
                                          Target: {milestone.targetValue} {goal.targetUnit}
                                        </span>
                                      )}
                                      {milestone.targetDate && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {new Date(milestone.targetDate).toLocaleDateString()}
                                        </span>
                                      )}
                                      {milestone.completedAt && (
                                        <span className="text-xs text-green-600 flex items-center gap-1">
                                          <CheckCircle className="h-3 w-3" />
                                          Completed{" "}
                                          {new Date(milestone.completedAt).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {goal.milestones.length === 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="text-center py-4 text-muted-foreground">
                            <Milestone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No milestones yet</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={() => generateMilestones(goal.id)}
                              disabled={generatingMilestones === goal.id}
                            >
                              {generatingMilestones === goal.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Wand2 className="mr-1 h-3 w-3" />
                              )}
                              Generate AI Milestones
                            </Button>
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Completed Goals ({completedGoals.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedGoals.map((goal) => (
              <Card key={goal.id} className="bg-green-500/5 border-green-500/20 group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        {goal.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {goal.memberName}
                      </p>
                    </div>
                    <Badge variant="default">Completed</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {goal.targetValue && (
                    <p className="text-sm">
                      Achieved: {goal.currentValue || goal.targetValue}{" "}
                      {goal.targetUnit}
                    </p>
                  )}
                  {goal.milestones.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {goal.milestones.filter((m) => m.status === "completed").length}/
                      {goal.milestones.length} milestones completed
                    </p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reopenGoal(goal.id)}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Reopen
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(goal)}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeletingGoal(goal);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Edit Goal Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                placeholder="e.g., Bench press 225 lbs"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="What do you want to achieve?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={editFormData.category}
                onValueChange={(value) => setEditFormData({ ...editFormData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Target</Label>
                <Input
                  type="number"
                  value={editFormData.targetValue}
                  onChange={(e) => setEditFormData({ ...editFormData, targetValue: e.target.value })}
                  placeholder="225"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={editFormData.targetUnit}
                  onChange={(e) => setEditFormData({ ...editFormData, targetUnit: e.target.value })}
                  placeholder="lbs"
                />
              </div>
              <div className="space-y-2">
                <Label>Current</Label>
                <Input
                  type="number"
                  value={editFormData.currentValue}
                  onChange={(e) => setEditFormData({ ...editFormData, currentValue: e.target.value })}
                  placeholder="185"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Target Date</Label>
              <Input
                type="date"
                value={editFormData.targetDate}
                onChange={(e) => setEditFormData({ ...editFormData, targetDate: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingGoal?.title}&quot;? This will also delete all associated milestones. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGoal}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
