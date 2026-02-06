"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  GripVertical,
  Plus,
  Trash2,
  Save,
  Eye,
  Copy,
  Link2,
  Unlink,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  Dumbbell,
  Timer,
  Zap,
  RotateCcw,
  Play,
  Minus,
  Check,
  X,
  Search,
  Filter,
  Loader2,
  ArrowRight,
  Sparkles,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type WorkoutStructure =
  | "standard"
  | "emom"
  | "amrap"
  | "for_time"
  | "tabata"
  | "chipper"
  | "ladder"
  | "intervals"
  | "superset"
  | "circuit";

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  category: string;
  muscleGroups?: string[];
  secondaryMuscles?: string[];
  equipment?: string[];
  difficulty?: string;
  mechanic?: string;
  force?: string;
  benefits?: string[];
  imageUrl?: string;
}

export interface BuilderExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  order: number;
  sets?: number;
  reps?: string;
  weight?: string;
  duration?: number;
  restBetweenSets?: number;
  notes?: string;
  groupId?: string;
  groupType?: "superset" | "circuit" | "triset" | "giant_set" | "drop_set";
}

export interface WorkoutPlan {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  difficulty?: string;
  estimatedDuration?: number;
  structureType: WorkoutStructure;
  timeCapSeconds?: number;
  roundsTarget?: number;
  emomIntervalSeconds?: number;
  exercises: BuilderExercise[];
}

interface WorkoutBuilderContextType {
  exercises: BuilderExercise[];
  setExercises: React.Dispatch<React.SetStateAction<BuilderExercise[]>>;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  isMultiSelectMode: boolean;
  setIsMultiSelectMode: React.Dispatch<React.SetStateAction<boolean>>;
  updateExercise: (id: string, updates: Partial<BuilderExercise>) => void;
  removeExercise: (id: string) => void;
  duplicateExercise: (id: string) => void;
  groupSelected: (groupType: BuilderExercise["groupType"]) => void;
  ungroupExercise: (id: string) => void;
}

const WorkoutBuilderContext = createContext<WorkoutBuilderContextType | null>(
  null
);

function useWorkoutBuilder() {
  const context = useContext(WorkoutBuilderContext);
  if (!context) {
    throw new Error(
      "useWorkoutBuilder must be used within WorkoutBuilderProvider"
    );
  }
  return context;
}

// ============================================================================
// Local Storage Utils
// ============================================================================

const DRAFT_KEY = "workout_builder_draft";

function saveDraft(plan: Partial<WorkoutPlan>) {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...plan, savedAt: Date.now() })
    );
  } catch {
    // Ignore storage errors
  }
}

function loadDraft(): (Partial<WorkoutPlan> & { savedAt?: number }) | null {
  try {
    const data = localStorage.getItem(DRAFT_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    // Only restore drafts less than 24 hours old
    if (parsed.savedAt && Date.now() - parsed.savedAt < 86400000) {
      return parsed;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// Structure Configuration Data
// ============================================================================

const STRUCTURE_TYPES: {
  type: WorkoutStructure;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  hasTimeCap?: boolean;
  hasRounds?: boolean;
  hasInterval?: boolean;
}[] = [
  {
    type: "standard",
    label: "Standard",
    description: "Traditional sets and reps with rest periods",
    icon: <Dumbbell className="h-5 w-5" />,
    color: "bg-zinc-600",
  },
  {
    type: "emom",
    label: "EMOM",
    description: "Every Minute On the Minute - work within each minute",
    icon: <Timer className="h-5 w-5" />,
    color: "bg-blue-600",
    hasTimeCap: true,
    hasInterval: true,
  },
  {
    type: "amrap",
    label: "AMRAP",
    description: "As Many Rounds As Possible in a time cap",
    icon: <RotateCcw className="h-5 w-5" />,
    color: "bg-orange-600",
    hasTimeCap: true,
  },
  {
    type: "for_time",
    label: "For Time",
    description: "Complete all work as fast as possible",
    icon: <Zap className="h-5 w-5" />,
    color: "bg-red-600",
    hasTimeCap: true,
  },
  {
    type: "tabata",
    label: "Tabata",
    description: "20 seconds work, 10 seconds rest intervals",
    icon: <Flame className="h-5 w-5" />,
    color: "bg-pink-600",
    hasRounds: true,
  },
  {
    type: "circuit",
    label: "Circuit",
    description: "Move through exercises with minimal rest",
    icon: <LayoutGrid className="h-5 w-5" />,
    color: "bg-green-600",
    hasRounds: true,
  },
  {
    type: "superset",
    label: "Superset",
    description: "Pair exercises back-to-back without rest",
    icon: <Link2 className="h-5 w-5" />,
    color: "bg-purple-600",
  },
  {
    type: "intervals",
    label: "Intervals",
    description: "Timed work and rest intervals",
    icon: <Clock className="h-5 w-5" />,
    color: "bg-cyan-600",
    hasTimeCap: true,
    hasInterval: true,
  },
];

// ============================================================================
// SetsRepsInput Component
// ============================================================================

interface SetsRepsInputProps {
  label: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  suggestions?: string[];
  className?: string;
}

export function SetsRepsInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  suggestions = [],
  className,
}: SetsRepsInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(String(value || ""));
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(String(value || ""));
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onChange(localValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setLocalValue(String(value || ""));
      setIsEditing(false);
    }
  };

  const increment = () => {
    const num = parseInt(String(value)) || 0;
    onChange(String(num + 1));
  };

  const decrement = () => {
    const num = parseInt(String(value)) || 0;
    if (num > 0) {
      onChange(String(num - 1));
    }
  };

  if (isEditing) {
    return (
      <div className={cn("space-y-1", className)}>
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            type={type}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="h-8 text-sm"
          />
        </div>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  setLocalValue(suggestion);
                  onChange(suggestion);
                  setIsEditing(false);
                }}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1">
        {type === "number" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={decrement}
          >
            <Minus className="h-3 w-3" />
          </Button>
        )}
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className={cn(
            "flex-1 h-8 px-3 text-sm font-medium rounded-md",
            "bg-muted/50 hover:bg-muted transition-colors",
            "text-left truncate min-w-[60px]"
          )}
        >
          {value || (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </button>
        {type === "number" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={increment}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// BuilderExerciseCard Component
// ============================================================================

interface BuilderExerciseCardProps {
  item: BuilderExercise;
  isOverlay?: boolean;
  groupColor?: string;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

export function BuilderExerciseCard({
  item,
  isOverlay,
  groupColor,
  isFirstInGroup,
  isLastInGroup,
}: BuilderExerciseCardProps) {
  const {
    updateExercise,
    removeExercise,
    duplicateExercise,
    ungroupExercise,
    selectedIds,
    setSelectedIds,
    isMultiSelectMode,
  } = useWorkoutBuilder();

  const [showDetails, setShowDetails] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isSelected = selectedIds.includes(item.id);
  const isInGroup = !!item.groupId;

  const handleSelect = (e: React.MouseEvent) => {
    if (!isMultiSelectMode) return;
    e.stopPropagation();

    if (isSelected) {
      setSelectedIds((prev) => prev.filter((id) => id !== item.id));
    } else {
      setSelectedIds((prev) => [...prev, item.id]);
    }
  };

  const groupBorderClasses = isInGroup
    ? cn(
        "border-l-4",
        groupColor || "border-l-purple-500",
        isFirstInGroup && "rounded-b-none",
        isLastInGroup && "rounded-t-none border-t-0",
        !isFirstInGroup && !isLastInGroup && "rounded-none border-t-0"
      )
    : "";

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={isOverlay ? { scale: 1.05, opacity: 0.9 } : false}
      animate={isOverlay ? { scale: 1.05, opacity: 0.9 } : { scale: 1, opacity: isDragging ? 0.5 : 1 }}
      className={cn(
        "border rounded-lg bg-card transition-all",
        groupBorderClasses,
        isSelected && "ring-2 ring-amber-500",
        isDragging && "shadow-lg",
        isOverlay && "shadow-2xl"
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className={cn(
              "cursor-grab active:cursor-grabbing mt-1 touch-none",
              "p-1 rounded hover:bg-muted transition-colors"
            )}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Multi-select checkbox */}
          {isMultiSelectMode && (
            <button
              type="button"
              onClick={handleSelect}
              className={cn(
                "mt-1 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors",
                isSelected
                  ? "bg-amber-500 border-amber-500"
                  : "border-muted-foreground hover:border-amber-400"
              )}
            >
              {isSelected && <Check className="h-3 w-3 text-white" />}
            </button>
          )}

          {/* Exercise Content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-medium truncate">{item.exercise.name}</h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {item.exercise.category}
                  </Badge>
                  {item.exercise.mechanic && (
                    <Badge
                      variant={
                        item.exercise.mechanic === "compound"
                          ? "default"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {item.exercise.mechanic}
                    </Badge>
                  )}
                  {item.groupType && (
                    <Badge className="text-xs bg-purple-600 text-white">
                      {item.groupType.replace("_", " ")}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                {isInGroup && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => ungroupExercise(item.id)}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove from group</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => duplicateExercise(item.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Duplicate</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeExercise(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Sets/Reps/Weight/Rest Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SetsRepsInput
                label="Sets"
                value={item.sets}
                onChange={(v) =>
                  updateExercise(item.id, { sets: parseInt(v) || undefined })
                }
                placeholder="3"
                type="number"
              />
              <SetsRepsInput
                label="Reps"
                value={item.reps}
                onChange={(v) => updateExercise(item.id, { reps: v })}
                placeholder="8-12"
                suggestions={["8-12", "10", "12-15", "AMRAP", "Max"]}
              />
              <SetsRepsInput
                label="Weight"
                value={item.weight}
                onChange={(v) => updateExercise(item.id, { weight: v })}
                placeholder="135 lbs"
                suggestions={["BW", "Light", "Moderate", "Heavy"]}
              />
              <SetsRepsInput
                label="Rest (sec)"
                value={item.restBetweenSets}
                onChange={(v) =>
                  updateExercise(item.id, {
                    restBetweenSets: parseInt(v) || undefined,
                  })
                }
                placeholder="60"
                type="number"
              />
            </div>

            {/* Expand/Collapse for Notes */}
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="h-3 w-3" /> Hide notes
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" /> Add notes
                </>
              )}
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <Textarea
                    value={item.notes || ""}
                    onChange={(e) =>
                      updateExercise(item.id, { notes: e.target.value })
                    }
                    placeholder="Exercise notes, cues, or modifications..."
                    className="min-h-[60px] text-sm"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// WorkoutStructureSelector Component
// ============================================================================

interface WorkoutStructureSelectorProps {
  value: WorkoutStructure;
  onChange: (value: WorkoutStructure) => void;
  timeCap?: number;
  onTimeCapChange?: (value: number) => void;
  rounds?: number;
  onRoundsChange?: (value: number) => void;
  interval?: number;
  onIntervalChange?: (value: number) => void;
}

export function WorkoutStructureSelector({
  value,
  onChange,
  timeCap,
  onTimeCapChange,
  rounds,
  onRoundsChange,
  interval,
  onIntervalChange,
}: WorkoutStructureSelectorProps) {
  const selectedStructure = STRUCTURE_TYPES.find((s) => s.type === value);

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Workout Structure</Label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STRUCTURE_TYPES.map((structure) => (
          <button
            key={structure.type}
            type="button"
            onClick={() => onChange(structure.type)}
            className={cn(
              "relative p-4 rounded-lg border-2 text-left transition-all",
              "hover:border-amber-400/50 hover:bg-muted/50",
              value === structure.type
                ? "border-amber-500 bg-amber-500/10"
                : "border-muted"
            )}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                structure.color,
                "text-white"
              )}
            >
              {structure.icon}
            </div>
            <h4 className="font-medium text-sm">{structure.label}</h4>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {structure.description}
            </p>
            {value === structure.type && (
              <div className="absolute top-2 right-2">
                <Check className="h-4 w-4 text-amber-500" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Structure-specific settings */}
      {selectedStructure && (
        <AnimatePresence mode="wait">
          <motion.div
            key={value}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 border-t mt-4">
              <div className="flex flex-wrap gap-4">
                {selectedStructure.hasTimeCap && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Time Cap (minutes)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        value={timeCap ? Math.floor(timeCap / 60) : ""}
                        onChange={(e) =>
                          onTimeCapChange?.(parseInt(e.target.value) * 60 || 0)
                        }
                        className="w-20 h-9"
                        placeholder="20"
                      />
                      <span className="text-sm text-muted-foreground">min</span>
                    </div>
                  </div>
                )}
                {selectedStructure.hasRounds && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Rounds
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={rounds || ""}
                        onChange={(e) =>
                          onRoundsChange?.(parseInt(e.target.value) || 0)
                        }
                        className="w-20 h-9"
                        placeholder="8"
                      />
                      <span className="text-sm text-muted-foreground">
                        rounds
                      </span>
                    </div>
                  </div>
                )}
                {selectedStructure.hasInterval && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Interval (seconds)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={10}
                        max={300}
                        value={interval || ""}
                        onChange={(e) =>
                          onIntervalChange?.(parseInt(e.target.value) || 0)
                        }
                        className="w-20 h-9"
                        placeholder="60"
                      />
                      <span className="text-sm text-muted-foreground">sec</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ============================================================================
// GroupCreator Component
// ============================================================================

interface GroupCreatorProps {
  selectedCount: number;
  onGroupCreate: (type: BuilderExercise["groupType"]) => void;
  onCancel: () => void;
}

export function GroupCreator({
  selectedCount,
  onGroupCreate,
  onCancel,
}: GroupCreatorProps) {
  const groupTypes: {
    type: BuilderExercise["groupType"];
    label: string;
    description: string;
  }[] = [
    {
      type: "superset",
      label: "Superset",
      description: "2 exercises back-to-back",
    },
    { type: "triset", label: "Triset", description: "3 exercises in a row" },
    {
      type: "giant_set",
      label: "Giant Set",
      description: "4+ exercises in sequence",
    },
    {
      type: "circuit",
      label: "Circuit",
      description: "Multiple exercises, one round each",
    },
    {
      type: "drop_set",
      label: "Drop Set",
      description: "Decreasing weight, no rest",
    },
  ];

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg p-4"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold">{selectedCount} exercises selected</h4>
            <p className="text-sm text-muted-foreground">
              Choose a group type to create
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel selection">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {groupTypes.map((group) => (
            <Button
              key={group.type}
              variant="outline"
              className="flex-1 min-w-[120px] h-auto py-3 flex-col items-start"
              onClick={() => onGroupCreate(group.type)}
            >
              <span className="font-medium">{group.label}</span>
              <span className="text-xs text-muted-foreground">
                {group.description}
              </span>
            </Button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// WorkoutPreview Component
// ============================================================================

interface WorkoutPreviewProps {
  plan: Partial<WorkoutPlan>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkoutPreview({ plan, open, onOpenChange }: WorkoutPreviewProps) {
  const exercises = plan.exercises || [];

  // Calculate stats
  const totalSets = exercises.reduce((acc, ex) => acc + (ex.sets || 0), 0);
  const estimatedTime = useMemo(() => {
    let time = 0;
    exercises.forEach((ex) => {
      const sets = ex.sets || 3;
      const restPerSet = ex.restBetweenSets || 60;
      const workPerSet = 45; // Assume 45 seconds per set
      time += sets * (workPerSet + restPerSet);
    });
    return Math.round(time / 60);
  }, [exercises]);

  const muscleGroups = useMemo(() => {
    const groups = new Map<string, number>();
    exercises.forEach((ex) => {
      ex.exercise.muscleGroups?.forEach((mg) => {
        groups.set(mg, (groups.get(mg) || 0) + 1);
      });
    });
    return Array.from(groups.entries()).sort((a, b) => b[1] - a[1]);
  }, [exercises]);

  const structureConfig = STRUCTURE_TYPES.find(
    (s) => s.type === plan.structureType
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Workout Preview
          </DialogTitle>
          <DialogDescription>
            Preview how your workout will appear during execution
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pb-4">
            {/* Workout Header */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">
                {plan.name || "Untitled Workout"}
              </h2>
              {plan.description && (
                <p className="text-muted-foreground">{plan.description}</p>
              )}
              {structureConfig && (
                <Badge className={cn(structureConfig.color, "text-white")}>
                  {structureConfig.label}
                </Badge>
              )}
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <Dumbbell className="h-6 w-6 mx-auto text-amber-500 mb-2" />
                    <p className="text-2xl font-bold">{exercises.length}</p>
                    <p className="text-xs text-muted-foreground">Exercises</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <LayoutGrid className="h-6 w-6 mx-auto text-amber-500 mb-2" />
                    <p className="text-2xl font-bold">{totalSets}</p>
                    <p className="text-xs text-muted-foreground">Total Sets</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <Clock className="h-6 w-6 mx-auto text-amber-500 mb-2" />
                    <p className="text-2xl font-bold">
                      {plan.estimatedDuration || estimatedTime}
                    </p>
                    <p className="text-xs text-muted-foreground">Minutes</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Muscle Groups */}
            {muscleGroups.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Muscle Groups Targeted</h3>
                <div className="flex flex-wrap gap-2">
                  {muscleGroups.slice(0, 8).map(([group, count]) => (
                    <Badge key={group} variant="outline">
                      {group}{" "}
                      <span className="ml-1 text-amber-500">({count})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Exercise List */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Exercise Order</h3>
              {exercises.map((ex, index) => (
                <div
                  key={ex.id}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg border",
                    ex.groupId && "border-l-4 border-l-purple-500"
                  )}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{ex.exercise.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {ex.sets && `${ex.sets} sets`}
                      {ex.reps && ` x ${ex.reps}`}
                      {ex.weight && ` @ ${ex.weight}`}
                    </p>
                  </div>
                  {ex.restBetweenSets && (
                    <div className="text-sm text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {ex.restBetweenSets}s rest
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close Preview
          </Button>
          <Button className="bg-amber-500 hover:bg-amber-600">
            <Play className="h-4 w-4 mr-2" />
            Start Workout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// ExercisePicker Component
// ============================================================================

interface ExercisePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
}

export function ExercisePicker({
  open,
  onOpenChange,
  exercises,
  onSelect,
}: ExercisePickerProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [muscleFilter, setMuscleFilter] = useState("all");

  const categories = useMemo(() => {
    const cats = new Set<string>();
    exercises.forEach((ex) => cats.add(ex.category));
    return Array.from(cats).sort();
  }, [exercises]);

  const muscleGroups = useMemo(() => {
    const muscles = new Set<string>();
    exercises.forEach((ex) => {
      ex.muscleGroups?.forEach((mg) => muscles.add(mg));
    });
    return Array.from(muscles).sort();
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesSearch =
        !search ||
        ex.name.toLowerCase().includes(search.toLowerCase()) ||
        ex.muscleGroups?.some((m) =>
          m.toLowerCase().includes(search.toLowerCase())
        );
      const matchesCategory =
        categoryFilter === "all" || ex.category === categoryFilter;
      const matchesMuscle =
        muscleFilter === "all" || ex.muscleGroups?.includes(muscleFilter);
      return matchesSearch && matchesCategory && matchesMuscle;
    });
  }, [exercises, search, categoryFilter, muscleFilter]);

  const handleSelect = (exercise: Exercise) => {
    onSelect(exercise);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Add Exercise</SheetTitle>
          <SheetDescription>
            Search and select an exercise to add to your workout
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises..."
              className="pl-9"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={muscleFilter} onValueChange={setMuscleFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Muscle Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Muscles</SelectItem>
                {muscleGroups.map((mg) => (
                  <SelectItem key={mg} value={mg}>
                    {mg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exercise List */}
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2 pr-4">
              {filteredExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => handleSelect(exercise)}
                  className={cn(
                    "w-full p-3 rounded-lg border text-left transition-all",
                    "hover:border-amber-400 hover:bg-amber-500/5"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{exercise.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {exercise.category}
                        </Badge>
                        {exercise.difficulty && (
                          <Badge variant="secondary" className="text-xs">
                            {exercise.difficulty}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-amber-500 shrink-0 ml-2" />
                  </div>
                  {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {exercise.muscleGroups.slice(0, 3).join(", ")}
                      {exercise.muscleGroups.length > 3 &&
                        ` +${exercise.muscleGroups.length - 3} more`}
                    </p>
                  )}
                </button>
              ))}
              {filteredExercises.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No exercises found matching your criteria
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// Main WorkoutBuilder Component
// ============================================================================

interface WorkoutBuilderProps {
  initialPlan?: Partial<WorkoutPlan>;
  availableExercises: Exercise[];
  onSave: (plan: WorkoutPlan) => Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
}

export function WorkoutBuilder({
  initialPlan,
  availableExercises,
  onSave,
  onCancel,
  isEditing = false,
}: WorkoutBuilderProps) {
  // Plan state
  const [name, setName] = useState(initialPlan?.name || "");
  const [description, setDescription] = useState(initialPlan?.description || "");
  const [structureType, setStructureType] = useState<WorkoutStructure>(
    initialPlan?.structureType || "standard"
  );
  const [timeCap, setTimeCap] = useState(initialPlan?.timeCapSeconds);
  const [rounds, setRounds] = useState(initialPlan?.roundsTarget);
  const [interval, setInterval] = useState(initialPlan?.emomIntervalSeconds);
  const [exercises, setExercises] = useState<BuilderExercise[]>(
    initialPlan?.exercises || []
  );

  // UI state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load draft on mount
  useEffect(() => {
    if (!initialPlan?.id) {
      const draft = loadDraft();
      if (draft && draft.exercises && draft.exercises.length > 0) {
        setHasDraft(true);
      }
    }
  }, [initialPlan?.id]);

  // Auto-save draft
  useEffect(() => {
    if (!initialPlan?.id && exercises.length > 0) {
      const draftPlan: Partial<WorkoutPlan> = {
        name,
        description,
        structureType,
        timeCapSeconds: timeCap,
        roundsTarget: rounds,
        emomIntervalSeconds: interval,
        exercises,
      };
      saveDraft(draftPlan);
    }
  }, [name, description, structureType, timeCap, rounds, interval, exercises, initialPlan?.id]);

  const loadDraftData = () => {
    const draft = loadDraft();
    if (draft) {
      setName(draft.name || "");
      setDescription(draft.description || "");
      setStructureType(draft.structureType || "standard");
      setTimeCap(draft.timeCapSeconds);
      setRounds(draft.roundsTarget);
      setInterval(draft.emomIntervalSeconds);
      setExercises(draft.exercises || []);
      setHasDraft(false);
    }
  };

  const discardDraft = () => {
    clearDraft();
    setHasDraft(false);
  };

  // Exercise management functions
  const updateExercise = useCallback(
    (id: string, updates: Partial<BuilderExercise>) => {
      setExercises((prev) =>
        prev.map((ex) => (ex.id === id ? { ...ex, ...updates } : ex))
      );
    },
    []
  );

  const removeExercise = useCallback((id: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
    setSelectedIds((prev) => prev.filter((i) => i !== id));
  }, []);

  const duplicateExercise = useCallback((id: string) => {
    setExercises((prev) => {
      const index = prev.findIndex((ex) => ex.id === id);
      if (index === -1) return prev;
      const exercise = prev[index];
      const newExercise: BuilderExercise = {
        ...exercise,
        id: `${exercise.id}-copy-${Date.now()}`,
        order: exercise.order + 0.5,
      };
      const newList = [...prev, newExercise];
      return newList
        .sort((a, b) => a.order - b.order)
        .map((ex, i) => ({ ...ex, order: i }));
    });
  }, []);

  const addExercise = useCallback((exercise: Exercise) => {
    const newExercise: BuilderExercise = {
      id: `new-${Date.now()}-${Math.random()}`,
      exerciseId: exercise.id,
      exercise,
      order: exercises.length,
      sets: 3,
      reps: "10",
      restBetweenSets: 60,
    };
    setExercises((prev) => [...prev, newExercise]);
  }, [exercises.length]);

  const groupSelected = useCallback(
    (groupType: BuilderExercise["groupType"]) => {
      if (selectedIds.length < 2) return;
      const groupId = `group-${Date.now()}`;
      setExercises((prev) =>
        prev.map((ex) =>
          selectedIds.includes(ex.id) ? { ...ex, groupId, groupType } : ex
        )
      );
      setSelectedIds([]);
      setIsMultiSelectMode(false);
    },
    [selectedIds]
  );

  const ungroupExercise = useCallback((id: string) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === id ? { ...ex, groupId: undefined, groupType: undefined } : ex
      )
    );
  }, []);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setExercises((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          order: index,
        }));
      });
    }
  };

  // Save handler
  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      const plan: WorkoutPlan = {
        id: initialPlan?.id,
        name: name.trim(),
        description: description.trim() || undefined,
        structureType,
        timeCapSeconds: timeCap,
        roundsTarget: rounds,
        emomIntervalSeconds: interval,
        exercises: exercises.map((ex, i) => ({ ...ex, order: i })),
      };
      await onSave(plan);
      clearDraft();
    } finally {
      setIsSaving(false);
    }
  };

  const activeExercise = exercises.find((ex) => ex.id === activeId);

  // Group exercises by groupId for rendering
  const groupedExercises = useMemo(() => {
    const groups = new Map<string | undefined, BuilderExercise[]>();
    exercises.forEach((ex) => {
      const key = ex.groupId;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(ex);
    });
    return groups;
  }, [exercises]);

  // Context value
  const contextValue: WorkoutBuilderContextType = {
    exercises,
    setExercises,
    selectedIds,
    setSelectedIds,
    isMultiSelectMode,
    setIsMultiSelectMode,
    updateExercise,
    removeExercise,
    duplicateExercise,
    groupSelected,
    ungroupExercise,
  };

  const currentPlan: Partial<WorkoutPlan> = {
    id: initialPlan?.id,
    name,
    description,
    structureType,
    timeCapSeconds: timeCap,
    roundsTarget: rounds,
    emomIntervalSeconds: interval,
    exercises,
  };

  return (
    <WorkoutBuilderContext.Provider value={contextValue}>
      <div className="space-y-6">
        {/* Draft Recovery Banner */}
        {hasDraft && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
          >
            <Card className="border-amber-500/50 bg-amber-500/10">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="font-medium">Unsaved draft found</p>
                      <p className="text-sm text-muted-foreground">
                        Would you like to restore your previous workout?
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={discardDraft}>
                      Discard
                    </Button>
                    <Button
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600"
                      onClick={loadDraftData}
                    >
                      Restore
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Workout Details */}
        <Card>
          <CardHeader>
            <CardTitle>Workout Details</CardTitle>
            <CardDescription>
              Name your workout and choose its structure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Workout Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Full Body Strength"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this workout"
                  className="h-11"
                />
              </div>
            </div>

            <WorkoutStructureSelector
              value={structureType}
              onChange={setStructureType}
              timeCap={timeCap}
              onTimeCapChange={setTimeCap}
              rounds={rounds}
              onRoundsChange={setRounds}
              interval={interval}
              onIntervalChange={setInterval}
            />
          </CardContent>
        </Card>

        {/* Exercise List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Exercises</CardTitle>
                <CardDescription>
                  Drag to reorder, tap to edit details
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {exercises.length >= 2 && (
                  <Button
                    variant={isMultiSelectMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setIsMultiSelectMode(!isMultiSelectMode);
                      if (isMultiSelectMode) {
                        setSelectedIds([]);
                      }
                    }}
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    {isMultiSelectMode ? "Done" : "Group"}
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600"
                  onClick={() => setShowExercisePicker(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Exercise
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {exercises.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No exercises yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add exercises to build your workout
                </p>
                <Button
                  className="bg-amber-500 hover:bg-amber-600"
                  onClick={() => setShowExercisePicker(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Exercise
                </Button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={exercises.map((ex) => ex.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {exercises.map((exercise, index) => {
                      const groupExercises = exercise.groupId
                        ? groupedExercises.get(exercise.groupId) || []
                        : [];
                      const isFirstInGroup =
                        groupExercises.length > 0 &&
                        groupExercises[0].id === exercise.id;
                      const isLastInGroup =
                        groupExercises.length > 0 &&
                        groupExercises[groupExercises.length - 1].id ===
                          exercise.id;

                      const groupColors: Record<string, string> = {
                        superset: "border-l-purple-500",
                        triset: "border-l-indigo-500",
                        giant_set: "border-l-pink-500",
                        circuit: "border-l-green-500",
                        drop_set: "border-l-orange-500",
                      };

                      return (
                        <BuilderExerciseCard
                          key={exercise.id}
                          item={exercise}
                          groupColor={
                            exercise.groupType
                              ? groupColors[exercise.groupType]
                              : undefined
                          }
                          isFirstInGroup={isFirstInGroup}
                          isLastInGroup={isLastInGroup}
                        />
                      );
                    })}
                  </div>
                </SortableContext>

                <DragOverlay>
                  {activeExercise && (
                    <BuilderExerciseCard item={activeExercise} isOverlay />
                  )}
                </DragOverlay>
              </DndContext>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={exercises.length === 0}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600"
              onClick={handleSave}
              disabled={isSaving || !name.trim() || exercises.length === 0}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? "Update Workout" : "Save Workout"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Group Creator Overlay */}
        <AnimatePresence>
          {isMultiSelectMode && selectedIds.length >= 2 && (
            <GroupCreator
              selectedCount={selectedIds.length}
              onGroupCreate={groupSelected}
              onCancel={() => {
                setSelectedIds([]);
                setIsMultiSelectMode(false);
              }}
            />
          )}
        </AnimatePresence>

        {/* Exercise Picker */}
        <ExercisePicker
          open={showExercisePicker}
          onOpenChange={setShowExercisePicker}
          exercises={availableExercises}
          onSelect={addExercise}
        />

        {/* Preview Modal */}
        <WorkoutPreview
          plan={currentPlan}
          open={showPreview}
          onOpenChange={setShowPreview}
        />
      </div>
    </WorkoutBuilderContext.Provider>
  );
}

export default WorkoutBuilder;
