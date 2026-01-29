"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Star,
  BookOpen,
  CheckCircle,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/ui/confirm-dialog";

interface Skill {
  id: string;
  name: string;
  category: string;
  currentStatus: string;
  currentStatusDate: string | null;
  allTimeBestStatus: string;
  allTimeBestDate: string | null;
  notes: string | null;
  createdAt: string;
}

const SKILL_CATEGORIES = [
  { value: "gymnastics", label: "Gymnastics" },
  { value: "calisthenics", label: "Calisthenics" },
  { value: "sport", label: "Sport" },
  { value: "martial_arts", label: "Martial Arts" },
  { value: "dance", label: "Dance" },
  { value: "other", label: "Other" },
];

const SKILL_STATUSES = [
  { value: "learning", label: "Learning", icon: BookOpen, color: "bg-blue-500" },
  { value: "achieved", label: "Achieved", icon: CheckCircle, color: "bg-green-500" },
  { value: "mastered", label: "Mastered", icon: Trophy, color: "bg-yellow-500" },
];

const COMMON_SKILLS: Record<string, string[]> = {
  gymnastics: [
    "Forward Roll",
    "Backward Roll",
    "Cartwheel",
    "Roundoff",
    "Handstand",
    "Handspring",
    "Back Walkover",
    "Front Walkover",
    "Back Tuck",
    "Front Tuck",
    "Back Handspring",
    "Front Handspring",
    "Aerial",
    "Layout",
    "Full Twist",
  ],
  calisthenics: [
    "Pull-up",
    "Muscle-up",
    "One-arm Pull-up",
    "Front Lever",
    "Back Lever",
    "Planche",
    "Human Flag",
    "L-sit",
    "V-sit",
    "Pistol Squat",
    "Handstand Push-up",
    "One-arm Push-up",
  ],
  sport: [
    "Dunk (Basketball)",
    "Backflip on Skis",
    "Kickflip (Skateboard)",
    "Ollie (Skateboard)",
  ],
  martial_arts: [
    "Front Kick",
    "Roundhouse Kick",
    "Spinning Back Kick",
    "Tornado Kick",
    "540 Kick",
  ],
};

interface MemberSkillsProps {
  memberId: string;
  compact?: boolean;
}

export function MemberSkills({ memberId, compact = false }: MemberSkillsProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("gymnastics");
  const [currentStatus, setCurrentStatus] = useState("learning");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchSkills();
  }, [memberId]);

  const fetchSkills = async () => {
    try {
      const response = await fetch(`/api/members/${memberId}/skills`);
      if (response.ok) {
        const data = await response.json();
        setSkills(data);
      }
    } catch (error) {
      console.error("Failed to fetch skills:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setCategory("gymnastics");
    setCurrentStatus("learning");
    setNotes("");
    setEditingSkill(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (skill: Skill) => {
    setEditingSkill(skill);
    setName(skill.name);
    setCategory(skill.category);
    setCurrentStatus(skill.currentStatus);
    setNotes(skill.notes || "");
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a skill name");
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();

      if (editingSkill) {
        // Determine if this is a new best status
        const statusOrder = ["learning", "achieved", "mastered"];
        const currentIndex = statusOrder.indexOf(currentStatus);
        const allTimeBestIndex = statusOrder.indexOf(editingSkill.allTimeBestStatus);
        const isNewBest = currentIndex > allTimeBestIndex;

        await fetch(`/api/members/${memberId}/skills`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            skillId: editingSkill.id,
            name,
            category,
            currentStatus,
            currentStatusDate: now,
            allTimeBestStatus: isNewBest ? currentStatus : editingSkill.allTimeBestStatus,
            allTimeBestDate: isNewBest ? now : editingSkill.allTimeBestDate,
            notes,
          }),
        });
        toast.success("Skill updated");
      } else {
        await fetch(`/api/members/${memberId}/skills`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            category,
            currentStatus,
            currentStatusDate: now,
            allTimeBestStatus: currentStatus,
            allTimeBestDate: currentStatus !== "learning" ? now : null,
            notes,
          }),
        });
        toast.success("Skill added");
      }

      setShowDialog(false);
      resetForm();
      fetchSkills();
    } catch (error) {
      console.error("Failed to save skill:", error);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      await fetch(`/api/members/${memberId}/skills?skillId=${deleteTarget.id}`, {
        method: "DELETE",
      });
      toast.success("Skill deleted");
      fetchSkills();
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete skill:", error);
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const groupedSkills = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const StatusIcon = ({ status }: { status: string }) => {
    const statusInfo = SKILL_STATUSES.find((s) => s.value === status);
    if (!statusInfo) return null;
    const Icon = statusInfo.icon;
    return <Icon className="h-4 w-4" />;
  };

  function renderForm() {
    const suggestedSkills = COMMON_SKILLS[category] || [];

    return (
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SKILL_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Skill Name *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Back Tuck"
          />
          {suggestedSkills.length > 0 && !editingSkill && (
            <div className="flex flex-wrap gap-1 mt-2">
              {suggestedSkills.slice(0, 8).map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => setName(skill)}
                >
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Current Status</Label>
          <Select value={currentStatus} onValueChange={setCurrentStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SKILL_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", s.color)} />
                    {s.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Progress notes, tips to remember..."
            rows={2}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </div>
    );
  }

  if (compact) {
    const masteredCount = skills.filter((s) => s.currentStatus === "mastered").length;
    const achievedCount = skills.filter((s) => s.currentStatus === "achieved").length;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span>{masteredCount} mastered</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{achievedCount} achieved</span>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={openAddDialog}>
          <Plus className="mr-1 h-3 w-3" />
          Add Skill
        </Button>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSkill ? "Edit Skill" : "Add Skill"}
              </DialogTitle>
              <DialogDescription>
                Track athletic and gymnastic skills
              </DialogDescription>
            </DialogHeader>
            {renderForm()}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Skills & Achievements
        </CardTitle>
        <Button size="sm" onClick={openAddDialog}>
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent>
        {skills.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Star className="mx-auto h-8 w-8 mb-2" />
            <p>No skills tracked yet</p>
            <p className="text-sm">Track gymnastics, calisthenics, and athletic skills</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedSkills).map(([cat, catSkills]) => {
              const categoryInfo = SKILL_CATEGORIES.find((c) => c.value === cat);
              return (
                <div key={cat} className="space-y-2">
                  <h4 className="text-sm font-medium">{categoryInfo?.label || cat}</h4>
                  <div className="grid gap-2 md:grid-cols-2">
                    {catSkills.map((skill) => {
                      const statusInfo = SKILL_STATUSES.find(
                        (s) => s.value === skill.currentStatus
                      );

                      return (
                        <div
                          key={skill.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "p-1.5 rounded-full",
                                statusInfo?.color.replace("bg-", "bg-") + "/20"
                              )}
                            >
                              <StatusIcon status={skill.currentStatus} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{skill.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {statusInfo?.label}
                                {skill.allTimeBestStatus !== skill.currentStatus && (
                                  <span className="ml-1">
                                    (Best:{" "}
                                    {SKILL_STATUSES.find((s) => s.value === skill.allTimeBestStatus)
                                      ?.label}
                                    )
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(skill)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setDeleteTarget(skill)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSkill ? "Edit Skill" : "Add Skill"}
            </DialogTitle>
            <DialogDescription>
              Track athletic and gymnastic skills
            </DialogDescription>
          </DialogHeader>
          {renderForm()}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        itemName={deleteTarget?.name}
        itemType="skill"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </Card>
  );
}
