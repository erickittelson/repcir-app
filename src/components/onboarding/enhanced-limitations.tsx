"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Activity,
  Calendar,
  HeartPulse,
  Stethoscope,
  BandageIcon,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface EnhancedLimitation {
  id?: string;
  type: string;
  bodyPart?: string;
  condition?: string;
  description: string;
  affectedAreas: string[];
  severity: string;
  painLevel: number;
  // Enhanced fields
  isHealed: boolean;
  isChronicPermanent: boolean;
  healingTimeline?: string;
  injuryDate?: string;
  causeType?: string;
  medicalDiagnosis?: string;
  treatingWithPT: boolean;
  functionalImpact: FunctionalImpact;
  modificationNotes?: string;
  avoidsMovements?: string[];
  active: boolean;
}

export interface FunctionalImpact {
  squatDepth?: "full" | "parallel" | "quarter" | "none";
  bendingCapacity?: "full" | "limited" | "none";
  overheadReach?: "full" | "limited" | "painful" | "none";
  loadingCapacity?: "normal" | "reduced" | "minimal" | "none";
  impactTolerance?: "full" | "limited" | "none";
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const BODY_PARTS = {
  upper: [
    { value: "neck", label: "Neck" },
    { value: "shoulders", label: "Shoulders" },
    { value: "upper_back", label: "Upper Back" },
    { value: "chest", label: "Chest" },
    { value: "arms", label: "Arms" },
    { value: "elbows", label: "Elbows" },
    { value: "wrists", label: "Wrists" },
    { value: "hands", label: "Hands" },
  ],
  core: [
    { value: "lower_back", label: "Lower Back" },
    { value: "core", label: "Core/Abs" },
    { value: "hips", label: "Hips" },
  ],
  lower: [
    { value: "glutes", label: "Glutes" },
    { value: "quadriceps", label: "Quadriceps" },
    { value: "hamstrings", label: "Hamstrings" },
    { value: "knees", label: "Knees" },
    { value: "calves", label: "Calves" },
    { value: "ankles", label: "Ankles" },
    { value: "feet", label: "Feet" },
  ],
};

export const LIMITATION_CATEGORIES = [
  {
    value: "joint",
    label: "Joint Issues",
    examples: "Knee, shoulder, hip, ankle problems",
    icon: "🦴",
  },
  {
    value: "spinal",
    label: "Spinal / Back",
    examples: "Lower back, neck, disc issues",
    icon: "🔙",
  },
  {
    value: "soft_tissue",
    label: "Soft Tissue",
    examples: "Tendinitis, strains, muscle tears",
    icon: "💪",
  },
  {
    value: "chronic",
    label: "Chronic Condition",
    examples: "Arthritis, fibromyalgia, chronic pain",
    icon: "♾️",
  },
  {
    value: "post_surgery",
    label: "Post-Surgery",
    examples: "ACL repair, rotator cuff, joint replacement",
    icon: "🏥",
  },
  {
    value: "neurological",
    label: "Neurological",
    examples: "Balance issues, neuropathy, vertigo",
    icon: "🧠",
  },
  {
    value: "cardiovascular",
    label: "Cardiovascular",
    examples: "Heart conditions, blood pressure issues",
    icon: "❤️",
  },
  {
    value: "respiratory",
    label: "Respiratory",
    examples: "Asthma, breathing limitations",
    icon: "🫁",
  },
  {
    value: "preference",
    label: "Personal Preference",
    examples: "Movements you'd prefer to avoid",
    icon: "✋",
  },
];

export const CAUSE_TYPES = [
  { value: "sports", label: "Sports Injury" },
  { value: "accident", label: "Accident" },
  { value: "overuse", label: "Overuse / Repetitive Strain" },
  { value: "surgery", label: "Surgical Procedure" },
  { value: "congenital", label: "Born With It" },
  { value: "age_related", label: "Age-Related" },
  { value: "work", label: "Work-Related" },
  { value: "unknown", label: "Unknown / Gradual Onset" },
];

export const HEALING_TIMELINES = [
  { value: "days", label: "Days (acute injury)" },
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
  { value: "years", label: "Years" },
  { value: "permanent", label: "Permanent / Chronic" },
  { value: "unknown", label: "Unknown" },
];

export const SEVERITY_LEVELS = [
  { value: "mild", label: "Mild", color: "bg-yellow-500", description: "Minor discomfort, can work around it" },
  { value: "moderate", label: "Moderate", color: "bg-orange-500", description: "Noticeable limitation, needs modifications" },
  { value: "severe", label: "Severe", color: "bg-red-500", description: "Significant restriction, many movements affected" },
  { value: "recovering", label: "Recovering", color: "bg-blue-500", description: "Getting better, still need to be careful" },
];

export const COMMON_CONDITIONS = {
  joint: [
    "ACL tear/reconstruction",
    "MCL sprain",
    "Meniscus tear",
    "Rotator cuff injury",
    "Shoulder impingement",
    "Tennis elbow",
    "Golfer's elbow",
    "Hip bursitis",
    "Ankle sprain",
  ],
  spinal: [
    "Herniated disc",
    "Bulging disc",
    "Sciatica",
    "Spinal stenosis",
    "Spondylolisthesis",
    "SI joint dysfunction",
    "Cervical strain",
  ],
  soft_tissue: [
    "Muscle strain",
    "Tendinitis",
    "Plantar fasciitis",
    "IT band syndrome",
    "Patellar tendinitis",
    "Achilles tendinitis",
  ],
  chronic: [
    "Osteoarthritis",
    "Rheumatoid arthritis",
    "Fibromyalgia",
    "Chronic fatigue syndrome",
    "EDS (hypermobility)",
  ],
  post_surgery: [
    "ACL reconstruction",
    "Knee replacement",
    "Hip replacement",
    "Rotator cuff repair",
    "Spinal fusion",
    "Hernia repair",
  ],
};

export const FUNCTIONAL_IMPACT_OPTIONS = {
  squatDepth: [
    { value: "full", label: "Full depth (past parallel)", icon: "✅" },
    { value: "parallel", label: "To parallel only", icon: "🔶" },
    { value: "quarter", label: "Quarter squat only", icon: "⚠️" },
    { value: "none", label: "Cannot squat", icon: "❌" },
  ],
  bendingCapacity: [
    { value: "full", label: "Can bend freely", icon: "✅" },
    { value: "limited", label: "Limited bending", icon: "🔶" },
    { value: "none", label: "Cannot bend forward", icon: "❌" },
  ],
  overheadReach: [
    { value: "full", label: "Full overhead reach", icon: "✅" },
    { value: "limited", label: "Limited range", icon: "🔶" },
    { value: "painful", label: "Causes pain", icon: "⚠️" },
    { value: "none", label: "Cannot reach overhead", icon: "❌" },
  ],
  loadingCapacity: [
    { value: "normal", label: "Normal weight tolerance", icon: "✅" },
    { value: "reduced", label: "Reduced weight only", icon: "🔶" },
    { value: "minimal", label: "Light weights only", icon: "⚠️" },
    { value: "none", label: "No loading allowed", icon: "❌" },
  ],
  impactTolerance: [
    { value: "full", label: "Can do jumping/running", icon: "✅" },
    { value: "limited", label: "Limited impact ok", icon: "🔶" },
    { value: "none", label: "No impact activities", icon: "❌" },
  ],
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface EnhancedLimitationsProps {
  limitations: EnhancedLimitation[];
  onChange: (limitations: EnhancedLimitation[]) => void;
  onSave?: (limitation: EnhancedLimitation) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  readOnly?: boolean;
  showHeader?: boolean;
}

export function EnhancedLimitations({
  limitations,
  onChange,
  onSave,
  onDelete,
  readOnly = false,
  showHeader = true,
}: EnhancedLimitationsProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingLimitation, setEditingLimitation] = useState<EnhancedLimitation | null>(null);
  const [saving, setSaving] = useState(false);

  const openAddDialog = () => {
    setEditingLimitation(null);
    setShowDialog(true);
  };

  const openEditDialog = (limitation: EnhancedLimitation) => {
    setEditingLimitation(limitation);
    setShowDialog(true);
  };

  const handleSave = async (limitation: EnhancedLimitation) => {
    setSaving(true);
    try {
      if (onSave) {
        await onSave(limitation);
      }
      
      if (editingLimitation?.id) {
        // Update existing
        onChange(limitations.map(l => l.id === editingLimitation.id ? limitation : l));
      } else {
        // Add new
        onChange([...limitations, { ...limitation, id: crypto.randomUUID() }]);
      }
      
      setShowDialog(false);
      toast.success(editingLimitation ? "Limitation updated" : "Limitation added");
    } catch {
      toast.error("Failed to save limitation");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this limitation?")) return;
    
    try {
      if (onDelete) {
        await onDelete(id);
      }
      onChange(limitations.filter(l => l.id !== id));
      toast.success("Limitation deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const toggleActive = (id: string) => {
    onChange(limitations.map(l => l.id === id ? { ...l, active: !l.active } : l));
  };

  const activeLimitations = limitations.filter(l => l.active);
  const resolvedLimitations = limitations.filter(l => !l.active);

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold">Limitations & Injuries</h3>
          </div>
          {!readOnly && (
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          )}
        </div>
      )}

      {limitations.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted/30">
          <Activity className="mx-auto h-8 w-8 mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">No limitations tracked</p>
          <p className="text-sm text-muted-foreground">
            Track injuries and conditions for safer workout recommendations
          </p>
          {!readOnly && (
            <Button variant="outline" className="mt-4" onClick={openAddDialog}>
              <Plus className="mr-1 h-4 w-4" />
              Add Your First Limitation
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {activeLimitations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Active ({activeLimitations.length})
              </h4>
              {activeLimitations.map((limitation) => (
                <EnhancedLimitationCard
                  key={limitation.id}
                  limitation={limitation}
                  onEdit={() => openEditDialog(limitation)}
                  onToggle={() => limitation.id && toggleActive(limitation.id)}
                  onDelete={() => limitation.id && handleDelete(limitation.id)}
                  readOnly={readOnly}
                />
              ))}
            </div>
          )}

          {resolvedLimitations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Resolved ({resolvedLimitations.length})
              </h4>
              {resolvedLimitations.map((limitation) => (
                <EnhancedLimitationCard
                  key={limitation.id}
                  limitation={limitation}
                  onEdit={() => openEditDialog(limitation)}
                  onToggle={() => limitation.id && toggleActive(limitation.id)}
                  onDelete={() => limitation.id && handleDelete(limitation.id)}
                  readOnly={readOnly}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLimitation ? "Edit Limitation" : "Add Limitation"}
            </DialogTitle>
            <DialogDescription>
              Provide details about your injury or condition so we can customize workouts for you
            </DialogDescription>
          </DialogHeader>
          <LimitationForm
            initialData={editingLimitation}
            onSave={handleSave}
            onCancel={() => setShowDialog(false)}
            saving={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// LIMITATION CARD
// ============================================================================

function EnhancedLimitationCard({
  limitation,
  onEdit,
  onToggle,
  onDelete,
  readOnly,
}: {
  limitation: EnhancedLimitation;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  readOnly?: boolean;
}) {
  const severityInfo = SEVERITY_LEVELS.find(s => s.value === limitation.severity);
  const categoryInfo = LIMITATION_CATEGORIES.find(c => c.value === limitation.type);

  return (
    <div
      className={cn(
        "p-4 rounded-lg border transition-all",
        limitation.active
          ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
          : "bg-muted/50 opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-lg">{categoryInfo?.icon || "⚠️"}</span>
            <Badge variant="outline" className="text-xs capitalize">
              {categoryInfo?.label || limitation.type}
            </Badge>
            {severityInfo && (
              <Badge variant="outline" className="text-xs">
                <div className={cn("w-2 h-2 rounded-full mr-1", severityInfo.color)} />
                {severityInfo.label}
              </Badge>
            )}
            {limitation.isChronicPermanent && (
              <Badge variant="secondary" className="text-xs">
                Chronic
              </Badge>
            )}
            {limitation.treatingWithPT && (
              <Badge variant="outline" className="text-xs text-blue-600">
                <Stethoscope className="h-3 w-3 mr-1" />
                In PT
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="font-medium text-sm mb-2">{limitation.description}</p>

          {/* Medical Diagnosis */}
          {limitation.medicalDiagnosis && (
            <p className="text-xs text-muted-foreground mb-2">
              <span className="font-medium">Diagnosis:</span> {limitation.medicalDiagnosis}
            </p>
          )}

          {/* Affected Areas */}
          {limitation.affectedAreas && limitation.affectedAreas.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {limitation.affectedAreas.map((area) => (
                <Badge key={area} variant="secondary" className="text-xs">
                  {area}
                </Badge>
              ))}
            </div>
          )}

          {/* Functional Impact Summary */}
          {limitation.functionalImpact && Object.keys(limitation.functionalImpact).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 text-xs">
              {limitation.functionalImpact.squatDepth && limitation.functionalImpact.squatDepth !== "full" && (
                <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 rounded">
                  Squat: {limitation.functionalImpact.squatDepth}
                </span>
              )}
              {limitation.functionalImpact.loadingCapacity && limitation.functionalImpact.loadingCapacity !== "normal" && (
                <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 rounded">
                  Load: {limitation.functionalImpact.loadingCapacity}
                </span>
              )}
              {limitation.functionalImpact.impactTolerance && limitation.functionalImpact.impactTolerance !== "full" && (
                <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 rounded">
                  Impact: {limitation.functionalImpact.impactTolerance}
                </span>
              )}
            </div>
          )}

          {/* Timeline Info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {limitation.injuryDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Since {new Date(limitation.injuryDate).toLocaleDateString()}
              </span>
            )}
            {limitation.healingTimeline && limitation.healingTimeline !== "permanent" && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {HEALING_TIMELINES.find(t => t.value === limitation.healingTimeline)?.label}
              </span>
            )}
            {limitation.causeType && (
              <span>
                {CAUSE_TYPES.find(c => c.value === limitation.causeType)?.label}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {!readOnly && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Switch checked={limitation.active} onCheckedChange={onToggle} />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// LIMITATION FORM
// ============================================================================

interface LimitationFormProps {
  initialData: EnhancedLimitation | null;
  onSave: (limitation: EnhancedLimitation) => void;
  onCancel: () => void;
  saving: boolean;
}

function LimitationForm({ initialData, onSave, onCancel, saving }: LimitationFormProps) {
  const [formData, setFormData] = useState<EnhancedLimitation>(() => initialData || {
    type: "",
    description: "",
    affectedAreas: [],
    severity: "moderate",
    painLevel: 5,
    isHealed: false,
    isChronicPermanent: false,
    treatingWithPT: false,
    functionalImpact: {},
    active: true,
  });

  const updateField = <K extends keyof EnhancedLimitation>(field: K, value: EnhancedLimitation[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleBodyPart = (part: string) => {
    setFormData(prev => ({
      ...prev,
      affectedAreas: prev.affectedAreas.includes(part)
        ? prev.affectedAreas.filter(p => p !== part)
        : [...prev.affectedAreas, part],
    }));
  };

  const updateFunctionalImpact = <K extends keyof FunctionalImpact>(key: K, value: FunctionalImpact[K]) => {
    setFormData(prev => ({
      ...prev,
      functionalImpact: { ...prev.functionalImpact, [key]: value },
    }));
  };

  const handleSubmit = () => {
    if (!formData.type) {
      toast.error("Please select a category");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Please describe the limitation");
      return;
    }
    onSave(formData);
  };

  const selectedCategory = LIMITATION_CATEGORIES.find(c => c.value === formData.type);

  return (
    <div className="space-y-6 py-4">
      {/* Category Selection */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">What type of limitation is this?</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {LIMITATION_CATEGORIES.map((category) => (
            <button
              key={category.value}
              type="button"
              onClick={() => updateField("type", category.value)}
              className={cn(
                "p-3 rounded-lg border text-left transition-all",
                formData.type === category.value
                  ? "border-brand bg-brand/10 ring-1 ring-brand"
                  : "border-border hover:border-brand/50"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{category.icon}</span>
                <span className="font-medium text-sm">{category.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{category.examples}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>Describe your limitation *</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="E.g., 'Torn ACL in left knee, had surgery 6 months ago, still in recovery'"
          rows={3}
        />
      </div>

      {/* Quick Condition Selection (if applicable) */}
      {selectedCategory && COMMON_CONDITIONS[selectedCategory.value as keyof typeof COMMON_CONDITIONS] && (
        <div className="space-y-2">
          <Label>Common conditions (optional)</Label>
          <div className="flex flex-wrap gap-1">
            {COMMON_CONDITIONS[selectedCategory.value as keyof typeof COMMON_CONDITIONS]?.map((condition) => (
              <Badge
                key={condition}
                variant={formData.medicalDiagnosis === condition ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => updateField("medicalDiagnosis", formData.medicalDiagnosis === condition ? undefined : condition)}
              >
                {condition}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Medical Diagnosis */}
      <div className="space-y-2">
        <Label>Medical Diagnosis (if any)</Label>
        <Input
          value={formData.medicalDiagnosis || ""}
          onChange={(e) => updateField("medicalDiagnosis", e.target.value)}
          placeholder="E.g., Grade 2 ACL tear, L4-L5 herniation"
        />
      </div>

      {/* Affected Body Parts */}
      <div className="space-y-3">
        <Label>Affected Body Areas</Label>
        <div className="space-y-3">
          {Object.entries(BODY_PARTS).map(([region, parts]) => (
            <div key={region}>
              <p className="text-xs text-muted-foreground uppercase mb-1 capitalize">{region}</p>
              <div className="flex flex-wrap gap-1">
                {parts.map((part) => (
                  <Badge
                    key={part.value}
                    variant={formData.affectedAreas.includes(part.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleBodyPart(part.value)}
                  >
                    {part.label}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Severity & Pain */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Severity</Label>
          <Select value={formData.severity} onValueChange={(v) => updateField("severity", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_LEVELS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", s.color)} />
                    <span>{s.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Pain Level (1-10): {formData.painLevel}</Label>
          <Slider
            value={[formData.painLevel]}
            onValueChange={([v]) => updateField("painLevel", v)}
            min={1}
            max={10}
            step={1}
            className="py-2"
          />
        </div>
      </div>

      {/* Accordion for Additional Details */}
      <Accordion type="single" collapsible className="w-full">
        {/* Healing Status */}
        <AccordionItem value="healing">
          <AccordionTrigger className="text-sm">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-4 w-4" />
              Healing & Recovery Status
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Is this chronic or permanent?</Label>
                <p className="text-xs text-muted-foreground">Will this condition stay long-term?</p>
              </div>
              <Switch
                checked={formData.isChronicPermanent}
                onCheckedChange={(v) => updateField("isChronicPermanent", v)}
              />
            </div>

            {!formData.isChronicPermanent && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Has this healed?</Label>
                    <p className="text-xs text-muted-foreground">Mark as resolved but tracked</p>
                  </div>
                  <Switch
                    checked={formData.isHealed}
                    onCheckedChange={(v) => updateField("isHealed", v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Expected Healing Timeline</Label>
                  <Select value={formData.healingTimeline} onValueChange={(v) => updateField("healingTimeline", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timeline" />
                    </SelectTrigger>
                    <SelectContent>
                      {HEALING_TIMELINES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label>Currently in Physical Therapy?</Label>
                <p className="text-xs text-muted-foreground">Working with a PT or rehab specialist</p>
              </div>
              <Switch
                checked={formData.treatingWithPT}
                onCheckedChange={(v) => updateField("treatingWithPT", v)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Cause & Timeline */}
        <AccordionItem value="cause">
          <AccordionTrigger className="text-sm">
            <div className="flex items-center gap-2">
              <BandageIcon className="h-4 w-4" />
              Cause & Timeline
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>How did this happen?</Label>
              <Select value={formData.causeType} onValueChange={(v) => updateField("causeType", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cause" />
                </SelectTrigger>
                <SelectContent>
                  {CAUSE_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>When did this start?</Label>
              <Input
                type="date"
                value={formData.injuryDate || ""}
                onChange={(e) => updateField("injuryDate", e.target.value)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Functional Impact */}
        <AccordionItem value="functional">
          <AccordionTrigger className="text-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Functional Impact
              <HelpCircle className="h-3 w-3 text-muted-foreground" />
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Help us understand what movements you can do. This helps AI create safer workouts.
            </p>

            {/* Squat Depth */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Squat Depth
                <span className="text-xs text-muted-foreground">(How deep can you squat?)</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {FUNCTIONAL_IMPACT_OPTIONS.squatDepth.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateFunctionalImpact("squatDepth", option.value as FunctionalImpact["squatDepth"])}
                    className={cn(
                      "p-2 rounded border text-sm text-left",
                      formData.functionalImpact.squatDepth === option.value
                        ? "border-brand bg-brand/10"
                        : "border-border"
                    )}
                  >
                    {option.icon} {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Loading Capacity */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Weight Loading
                <span className="text-xs text-muted-foreground">(How much weight can you handle?)</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {FUNCTIONAL_IMPACT_OPTIONS.loadingCapacity.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateFunctionalImpact("loadingCapacity", option.value as FunctionalImpact["loadingCapacity"])}
                    className={cn(
                      "p-2 rounded border text-sm text-left",
                      formData.functionalImpact.loadingCapacity === option.value
                        ? "border-brand bg-brand/10"
                        : "border-border"
                    )}
                  >
                    {option.icon} {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Impact Tolerance */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Impact Tolerance
                <span className="text-xs text-muted-foreground">(Jumping, running, plyometrics)</span>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {FUNCTIONAL_IMPACT_OPTIONS.impactTolerance.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateFunctionalImpact("impactTolerance", option.value as FunctionalImpact["impactTolerance"])}
                    className={cn(
                      "p-2 rounded border text-sm text-left",
                      formData.functionalImpact.impactTolerance === option.value
                        ? "border-brand bg-brand/10"
                        : "border-border"
                    )}
                  >
                    {option.icon} {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Overhead Reach */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Overhead Movement
                <span className="text-xs text-muted-foreground">(Arms above head)</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {FUNCTIONAL_IMPACT_OPTIONS.overheadReach.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateFunctionalImpact("overheadReach", option.value as FunctionalImpact["overheadReach"])}
                    className={cn(
                      "p-2 rounded border text-sm text-left",
                      formData.functionalImpact.overheadReach === option.value
                        ? "border-brand bg-brand/10"
                        : "border-border"
                    )}
                  >
                    {option.icon} {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bending */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Bending Capacity
                <span className="text-xs text-muted-foreground">(Forward bending, hip hinge)</span>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {FUNCTIONAL_IMPACT_OPTIONS.bendingCapacity.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateFunctionalImpact("bendingCapacity", option.value as FunctionalImpact["bendingCapacity"])}
                    className={cn(
                      "p-2 rounded border text-sm text-left",
                      formData.functionalImpact.bendingCapacity === option.value
                        ? "border-brand bg-brand/10"
                        : "border-border"
                    )}
                  >
                    {option.icon} {option.label}
                  </button>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Modification Notes */}
        <AccordionItem value="notes">
          <AccordionTrigger className="text-sm">
            <div className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Modification Notes
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>What modifications work for you?</Label>
              <Textarea
                value={formData.modificationNotes || ""}
                onChange={(e) => updateField("modificationNotes", e.target.value)}
                placeholder="E.g., 'I can do leg extensions but not full squats. Box squats to parallel work okay. Need to avoid lateral movements.'"
                rows={3}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Form Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update" : "Add"} Limitation
        </Button>
      </div>
    </div>
  );
}

export default EnhancedLimitations;
