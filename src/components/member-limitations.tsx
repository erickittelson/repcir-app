"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Activity,
  Calendar,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/ui/confirm-dialog";

interface Limitation {
  id: string;
  type: string;
  description: string;
  affectedAreas: string[];
  severity: string | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  createdAt: string;
}

const BODY_AREAS = [
  "Neck",
  "Shoulders",
  "Upper Back",
  "Lower Back",
  "Chest",
  "Arms",
  "Elbows",
  "Wrists",
  "Hands",
  "Core",
  "Hips",
  "Glutes",
  "Quadriceps",
  "Hamstrings",
  "Knees",
  "Calves",
  "Ankles",
  "Feet",
];

const LIMITATION_TYPES = [
  { value: "injury", label: "Injury" },
  { value: "condition", label: "Medical Condition" },
  { value: "preference", label: "Preference/Avoid" },
];

const SEVERITY_LEVELS = [
  { value: "mild", label: "Mild", color: "bg-yellow-500" },
  { value: "moderate", label: "Moderate", color: "bg-orange-500" },
  { value: "severe", label: "Severe", color: "bg-red-500" },
];

interface MemberLimitationsProps {
  memberId: string;
  compact?: boolean;
}

export function MemberLimitations({ memberId, compact = false }: MemberLimitationsProps) {
  const [limitations, setLimitations] = useState<Limitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingLimitation, setEditingLimitation] = useState<Limitation | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Limitation | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [type, setType] = useState("injury");
  const [description, setDescription] = useState("");
  const [affectedAreas, setAffectedAreas] = useState<string[]>([]);
  const [severity, setSeverity] = useState("moderate");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchLimitations();
  }, [memberId]);

  const fetchLimitations = async () => {
    try {
      const response = await fetch(`/api/members/${memberId}/limitations`);
      if (response.ok) {
        const data = await response.json();
        setLimitations(data);
      }
    } catch (error) {
      console.error("Failed to fetch limitations:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setType("injury");
    setDescription("");
    setAffectedAreas([]);
    setSeverity("moderate");
    setStartDate("");
    setEndDate("");
    setEditingLimitation(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (limitation: Limitation) => {
    setEditingLimitation(limitation);
    setType(limitation.type);
    setDescription(limitation.description);
    setAffectedAreas(limitation.affectedAreas || []);
    setSeverity(limitation.severity || "moderate");
    setStartDate(limitation.startDate ? limitation.startDate.split("T")[0] : "");
    setEndDate(limitation.endDate ? limitation.endDate.split("T")[0] : "");
    setShowDialog(true);
  };

  const toggleArea = (area: string) => {
    setAffectedAreas((prev) =>
      prev.includes(area)
        ? prev.filter((a) => a !== area)
        : [...prev, area]
    );
  };

  const handleSave = async () => {
    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    setSaving(true);
    try {
      if (editingLimitation) {
        await fetch(`/api/members/${memberId}/limitations`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            limitationId: editingLimitation.id,
            type,
            description,
            affectedAreas,
            severity,
            endDate: endDate || null,
            active: editingLimitation.active,
          }),
        });
        toast.success("Limitation updated");
      } else {
        await fetch(`/api/members/${memberId}/limitations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            description,
            affectedAreas,
            severity,
            startDate: startDate || new Date().toISOString(),
            endDate: endDate || null,
          }),
        });
        toast.success("Limitation added");
      }

      setShowDialog(false);
      resetForm();
      fetchLimitations();
    } catch (error) {
      console.error("Failed to save limitation:", error);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (limitation: Limitation) => {
    try {
      await fetch(`/api/members/${memberId}/limitations`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limitationId: limitation.id,
          active: !limitation.active,
        }),
      });
      fetchLimitations();
      toast.success(limitation.active ? "Marked as resolved" : "Marked as active");
    } catch (error) {
      console.error("Failed to toggle limitation:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      await fetch(`/api/members/${memberId}/limitations?limitationId=${deleteTarget.id}`, {
        method: "DELETE",
      });
      toast.success("Limitation deleted");
      fetchLimitations();
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete limitation:", error);
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const activeLimitations = limitations.filter((l) => l.active);
  const resolvedLimitations = limitations.filter((l) => !l.active);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {activeLimitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active limitations</p>
        ) : (
          activeLimitations.map((limitation) => (
            <div
              key={limitation.id}
              className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900"
            >
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{limitation.description}</p>
                <div className="flex gap-1 flex-wrap">
                  {limitation.affectedAreas?.slice(0, 3).map((area) => (
                    <Badge key={area} variant="outline" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                  {(limitation.affectedAreas?.length || 0) > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{limitation.affectedAreas!.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <Button variant="outline" size="sm" className="w-full" onClick={openAddDialog}>
          <Plus className="mr-1 h-3 w-3" />
          Add Limitation
        </Button>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingLimitation ? "Edit Limitation" : "Add Limitation"}
              </DialogTitle>
              <DialogDescription>
                Track injuries, conditions, or exercise preferences
              </DialogDescription>
            </DialogHeader>
            {renderForm()}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  function renderForm() {
    return (
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMITATION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Description *</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the injury, condition, or preference..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Severity</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_LEVELS.map((s) => (
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
          <Label>Affected Body Areas</Label>
          <div className="flex flex-wrap gap-1">
            {BODY_AREAS.map((area) => (
              <Badge
                key={area}
                variant={affectedAreas.includes(area) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleArea(area)}
              >
                {area}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>End Date (if resolved)</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Limitations & Injuries
        </CardTitle>
        <Button size="sm" onClick={openAddDialog}>
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent>
        {limitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="mx-auto h-8 w-8 mb-2" />
            <p>No limitations tracked</p>
            <p className="text-sm">Track injuries and conditions to get safer workout recommendations</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeLimitations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-600">Active</h4>
                {activeLimitations.map((limitation) => (
                  <LimitationCard
                    key={limitation.id}
                    limitation={limitation}
                    onEdit={() => openEditDialog(limitation)}
                    onToggle={() => toggleActive(limitation)}
                    onDelete={() => setDeleteTarget(limitation)}
                  />
                ))}
              </div>
            )}

            {resolvedLimitations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Resolved</h4>
                {resolvedLimitations.map((limitation) => (
                  <LimitationCard
                    key={limitation.id}
                    limitation={limitation}
                    onEdit={() => openEditDialog(limitation)}
                    onToggle={() => toggleActive(limitation)}
                    onDelete={() => setDeleteTarget(limitation)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLimitation ? "Edit Limitation" : "Add Limitation"}
            </DialogTitle>
            <DialogDescription>
              Track injuries, conditions, or exercise preferences
            </DialogDescription>
          </DialogHeader>
          {renderForm()}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        itemName={deleteTarget?.description}
        itemType="limitation"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </Card>
  );
}

function LimitationCard({
  limitation,
  onEdit,
  onToggle,
  onDelete,
}: {
  limitation: Limitation;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const severityInfo = SEVERITY_LEVELS.find((s) => s.value === limitation.severity);

  return (
    <div
      className={cn(
        "p-3 rounded-lg border",
        limitation.active
          ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
          : "bg-muted/50 opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs capitalize">
              {limitation.type}
            </Badge>
            {severityInfo && (
              <Badge variant="outline" className="text-xs">
                <div className={cn("w-2 h-2 rounded-full mr-1", severityInfo.color)} />
                {severityInfo.label}
              </Badge>
            )}
          </div>
          <p className="font-medium text-sm">{limitation.description}</p>
          {limitation.affectedAreas && limitation.affectedAreas.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {limitation.affectedAreas.map((area) => (
                <Badge key={area} variant="secondary" className="text-xs">
                  {area}
                </Badge>
              ))}
            </div>
          )}
          {(limitation.startDate || limitation.endDate) && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {limitation.startDate && new Date(limitation.startDate).toLocaleDateString()}
              {limitation.endDate && ` - ${new Date(limitation.endDate).toLocaleDateString()}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Switch checked={limitation.active} onCheckedChange={onToggle} />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
