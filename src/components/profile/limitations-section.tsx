"use client";

import { useState } from "react";
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
import { AlertTriangle, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/confirm-dialog";

interface Limitation {
  id: string;
  bodyPart: string;
  condition: string;
  severity?: string;
  description?: string;
  duration?: string;
  painLevel?: number;
  avoidsMovements?: string[];
  notes?: string;
}

interface LimitationsSectionProps {
  limitations: Limitation[];
  extractedLimitation?: {
    bodyPart?: string;
    condition?: string;
    severity?: string;
  };
}

const BODY_PARTS = [
  "Neck",
  "Shoulder",
  "Upper Back",
  "Lower Back",
  "Elbow",
  "Wrist",
  "Hip",
  "Knee",
  "Ankle",
  "Foot",
  "Other",
];

const COMMON_CONDITIONS = [
  "Arthritis",
  "Tendinitis",
  "Bursitis",
  "Strain",
  "Sprain",
  "Herniated Disc",
  "Sciatica",
  "Rotator Cuff",
  "Tennis Elbow",
  "Carpal Tunnel",
  "Plantar Fasciitis",
  "ACL/MCL Injury",
  "Meniscus Tear",
  "Other",
];

export function LimitationsSection({
  limitations: initialLimitations,
  extractedLimitation,
}: LimitationsSectionProps) {
  const [limitations, setLimitations] = useState<Limitation[]>(() => {
    const list = [...initialLimitations];
    // Add extracted limitation if exists and not already in list
    if (extractedLimitation?.bodyPart || extractedLimitation?.condition) {
      const exists = list.some(
        (l) =>
          l.bodyPart === extractedLimitation.bodyPart &&
          l.condition === extractedLimitation.condition
      );
      if (!exists) {
        list.push({
          id: "extracted",
          bodyPart: extractedLimitation.bodyPart || "",
          condition: extractedLimitation.condition || "",
          severity: extractedLimitation.severity,
        });
      }
    }
    return list;
  });

  const [selectedLimitation, setSelectedLimitation] = useState<Limitation | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [editForm, setEditForm] = useState({
    bodyPart: "",
    condition: "",
    severity: "moderate",
    description: "",
    duration: "",
    painLevel: 5,
    avoidsMovements: "",
    notes: "",
  });

  const handleBadgeClick = (limitation: Limitation) => {
    setSelectedLimitation(limitation);
    setEditForm({
      bodyPart: limitation.bodyPart || "",
      condition: limitation.condition || "",
      severity: limitation.severity || "moderate",
      description: limitation.description || "",
      duration: limitation.duration || "",
      painLevel: limitation.painLevel || 5,
      avoidsMovements: limitation.avoidsMovements?.join(", ") || "",
      notes: limitation.notes || "",
    });
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setSelectedLimitation(null);
    setEditForm({
      bodyPart: "",
      condition: "",
      severity: "moderate",
      description: "",
      duration: "",
      painLevel: 5,
      avoidsMovements: "",
      notes: "",
    });
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!editForm.bodyPart && !editForm.condition) {
      toast.error("Please enter a body part or condition");
      return;
    }

    setIsSaving(true);

    try {
      const limitationData = {
        bodyPart: editForm.bodyPart,
        condition: editForm.condition,
        severity: editForm.severity,
        description: editForm.description || undefined,
        duration: editForm.duration || undefined,
        painLevel: editForm.painLevel,
        avoidsMovements: editForm.avoidsMovements
          ? editForm.avoidsMovements.split(",").map((m) => m.trim()).filter(Boolean)
          : [],
        notes: editForm.notes || undefined,
      };

      const response = await fetch("/api/user/limitations", {
        method: selectedLimitation ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedLimitation?.id,
          ...limitationData,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        if (selectedLimitation) {
          // Update existing
          setLimitations((prev) =>
            prev.map((l) =>
              l.id === selectedLimitation.id
                ? { ...l, ...limitationData, id: result.id || l.id }
                : l
            )
          );
          toast.success("Limitation updated");
        } else {
          // Add new
          setLimitations((prev) => [
            ...prev,
            { id: result.id || Date.now().toString(), ...limitationData },
          ]);
          toast.success("Limitation added");
        }

        setIsEditing(false);
        setIsAdding(false);
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      toast.error("Failed to save limitation");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedLimitation) return;

    setIsSaving(true);

    try {
      const response = await fetch(`/api/user/limitations?id=${selectedLimitation.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setLimitations((prev) => prev.filter((l) => l.id !== selectedLimitation.id));
        toast.success("Limitation removed");
        setIsEditing(false);
        setShowDeleteConfirm(false);
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      toast.error("Failed to remove limitation");
    } finally {
      setIsSaving(false);
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case "severe":
        return "destructive";
      case "moderate":
        return "default";
      case "mild":
        return "secondary";
      default:
        return "outline";
    }
  };

  const isEmpty = limitations.length === 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Limitations & Injuries
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddNew}
              className="h-8 px-2 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isEmpty ? (
            <p className="text-sm text-muted-foreground py-2">
              No injuries or limitations recorded. Tap + to add any conditions the AI should consider.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {limitations.map((limitation) => (
                <Badge
                  key={limitation.id}
                  variant={getSeverityColor(limitation.severity)}
                  className="cursor-pointer hover:opacity-80 transition-opacity px-3 py-1.5 text-sm"
                  onClick={() => handleBadgeClick(limitation)}
                >
                  {limitation.bodyPart && limitation.condition
                    ? `${limitation.bodyPart}: ${limitation.condition}`
                    : limitation.bodyPart || limitation.condition}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Add Modal */}
      <Dialog open={isEditing || isAdding} onOpenChange={(open) => {
        if (!open) {
          setIsEditing(false);
          setIsAdding(false);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isAdding ? "Add Limitation" : "Edit Limitation"}
            </DialogTitle>
            <DialogDescription>
              {isAdding
                ? "Add an injury or condition the AI should consider when creating workouts."
                : "Update details about this limitation to help AI create safer workouts."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Body Part & Condition */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bodyPart">Body Part</Label>
                <Select
                  value={editForm.bodyPart}
                  onValueChange={(value) => setEditForm({ ...editForm, bodyPart: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {BODY_PARTS.map((part) => (
                      <SelectItem key={part} value={part.toLowerCase()}>
                        {part}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <Select
                  value={editForm.condition}
                  onValueChange={(value) => setEditForm({ ...editForm, condition: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_CONDITIONS.map((cond) => (
                      <SelectItem key={cond} value={cond.toLowerCase()}>
                        {cond}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Severity & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <Select
                  value={editForm.severity}
                  onValueChange={(value) => setEditForm({ ...editForm, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild - Minor discomfort</SelectItem>
                    <SelectItem value="moderate">Moderate - Limits some activities</SelectItem>
                    <SelectItem value="severe">Severe - Significantly limiting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">How Long?</Label>
                <Input
                  id="duration"
                  value={editForm.duration}
                  onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                  placeholder="e.g., 2 years, since 2020"
                />
              </div>
            </div>

            {/* Pain Level */}
            <div className="space-y-2">
              <Label>Pain Level (1-10): {editForm.painLevel}</Label>
              <input
                type="range"
                min="1"
                max="10"
                value={editForm.painLevel}
                onChange={(e) => setEditForm({ ...editForm, painLevel: parseInt(e.target.value) })}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Minimal</span>
                <span>Moderate</span>
                <span>Severe</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Describe the Injury</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="What happened? How does it affect you day-to-day?"
                rows={2}
              />
            </div>

            {/* Movements to Avoid */}
            <div className="space-y-2">
              <Label htmlFor="avoidsMovements">Movements to Avoid</Label>
              <Input
                id="avoidsMovements"
                value={editForm.avoidsMovements}
                onChange={(e) => setEditForm({ ...editForm, avoidsMovements: e.target.value })}
                placeholder="e.g., overhead press, deep squats (comma-separated)"
              />
              <p className="text-xs text-muted-foreground">
                Specific exercises or movements that cause pain or should be avoided
              </p>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Anything else the AI should know? Physical therapy exercises that help?"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isEditing && selectedLimitation && (
              <Button
                variant="destructive"
                onClick={handleDeleteClick}
                disabled={isSaving}
                className="sm:mr-auto"
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            )}
            <Button variant="outline" onClick={() => {
              setIsEditing(false);
              setIsAdding(false);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isAdding ? "Add Limitation" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        itemName={selectedLimitation?.bodyPart && selectedLimitation?.condition 
          ? `${selectedLimitation.bodyPart}: ${selectedLimitation.condition}`
          : selectedLimitation?.bodyPart || selectedLimitation?.condition}
        itemType="limitation"
        onConfirm={handleConfirmDelete}
        loading={isSaving}
      />
    </>
  );
}
