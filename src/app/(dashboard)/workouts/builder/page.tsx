"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/components/ui/dialog";
import {
  GripVertical,
  Plus,
  Trash2,
  Save,
  Loader2,
  ArrowLeft,
  Dumbbell,
  Sparkles,
  Zap,
  Target,
  Users,
  User,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  AlertTriangle,
  Clock,
  Flame,
  Calendar,
  TrendingUp,
  CheckCircle,
  Info,
  Brain,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import InteractiveWorkoutGenerator from "@/components/workout/InteractiveWorkoutGenerator";

interface Exercise {
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
  progressions?: string[];
  imageUrl?: string;
  isCustom?: boolean;
}

interface MemberPrescription {
  memberName: string;
  weight?: string | null;
  percentOfMax?: number | null;
  bodyweightMod?: string | null;
  cardioTarget?: string | null;
  sprintTarget?: string | null;
  rpeTarget?: number | null;
  memberNotes?: string | null;
}

interface WorkoutExercise {
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
  exerciseType?: string;
  memberPrescriptions?: MemberPrescription[];
  supersetGroup?: number | null;
  circuitGroup?: number | null;
  // New structure type fields
  structureType?: 'standard' | 'superset' | 'circuit' | 'amrap' | 'emom' | 'interval' | 'tabata';
  timeSeconds?: number | null;
  workSeconds?: number | null;
  restSecondsInterval?: number | null;
}

interface FamilyMember {
  id: string;
  name: string;
  avatar?: string;
  profilePicture?: string;
  latestMetrics?: {
    fitnessLevel?: string;
    weight?: number;
  };
  limitations?: Limitation[];
  goals?: Goal[];
}

interface Limitation {
  id: string;
  type: string;
  description: string;
  affectedAreas?: string[];
  severity?: string;
  active: boolean;
}

interface Goal {
  id: string;
  title: string;
  category: string;
  status: string;
}

interface AIReasoning {
  analysis: {
    memberProfiles: Array<{
      name: string;
      fitnessLevel: string;
      mainGoals: string[];
      limitations: string[];
    }>;
    sharedGoals: string[];
    recommendedFocus: string;
  };
  strategy: {
    workoutType: string;
    intensityApproach: string;
    adaptationsNeeded: string[];
  };
}

// Quick pick categories for fast exercise selection
const QUICK_PICKS = {
  "Big Lifts": [
    "squat", "deadlift", "bench press", "overhead press", "barbell row"
  ],
  "Upper Push": [
    "bench press", "overhead press", "dip", "push-up", "incline"
  ],
  "Upper Pull": [
    "pull-up", "chin-up", "row", "lat pulldown", "face pull"
  ],
  "Lower Body": [
    "squat", "deadlift", "lunge", "leg press", "hip thrust", "romanian"
  ],
  "Core": [
    "plank", "crunch", "leg raise", "russian twist", "ab"
  ],
  "Explosive": [
    "jump", "sprint", "box jump", "power clean", "kettlebell swing", "plyometric"
  ],
};

const MUSCLE_GROUPS = [
  "chest", "back", "shoulders", "biceps", "triceps",
  "quadriceps", "hamstrings", "glutes", "calves", "core",
  "forearms", "full body"
];

function SortableExerciseItem({
  item,
  onUpdate,
  onRemove,
  onExerciseClick,
  isInSuperset,
  isFirstInSuperset,
  isLastInSuperset,
}: {
  item: WorkoutExercise;
  onUpdate: (id: string, updates: Partial<WorkoutExercise>) => void;
  onRemove: (id: string) => void;
  onExerciseClick?: (exercise: Exercise) => void;
  isInSuperset?: boolean;
  isFirstInSuperset?: boolean;
  isLastInSuperset?: boolean;
}) {
  const [showPrescriptionEditor, setShowPrescriptionEditor] = useState(false);
  const hasMemberPrescriptions = item.memberPrescriptions && item.memberPrescriptions.length > 0;

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
    opacity: isDragging ? 0.5 : 1,
  };

  const updatePrescription = (idx: number, field: keyof MemberPrescription, value: string | number | null) => {
    if (!item.memberPrescriptions) return;
    const updated = [...item.memberPrescriptions];
    updated[idx] = { ...updated[idx], [field]: value };
    onUpdate(item.id, { memberPrescriptions: updated });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg p-4 bg-card ${isInSuperset ? 'border-l-4 border-l-purple-500' : ''} ${isFirstInSuperset ? 'rounded-b-none' : ''} ${isLastInSuperset ? 'rounded-t-none border-t-0' : ''} ${isInSuperset && !isFirstInSuperset && !isLastInSuperset ? 'rounded-none border-t-0' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-1"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <button
                type="button"
                onClick={() => onExerciseClick?.(item.exercise)}
                className="font-medium text-left hover:text-primary hover:underline transition-colors flex items-center gap-1.5 group"
                title="Click for exercise details"
              >
                {item.exercise.name}
                <Info className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary opacity-50 group-hover:opacity-100" />
              </button>
              <div className="flex gap-1 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {item.exercise.category}
                </Badge>
                {item.exercise.mechanic && (
                  <Badge
                    variant={item.exercise.mechanic === "compound" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {item.exercise.mechanic}
                  </Badge>
                )}
                {item.exerciseType && item.exerciseType !== "weighted" && item.exerciseType !== "standard" && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {item.exerciseType.replace("_", " ")}
                  </Badge>
                )}
                {/* Structure type badges */}
                {item.structureType === 'amrap' && (
                  <Badge className="text-xs bg-orange-600 text-white">
                    AMRAP {item.timeSeconds ? `${Math.floor(item.timeSeconds / 60)}min` : ''}
                  </Badge>
                )}
                {item.structureType === 'emom' && (
                  <Badge className="text-xs bg-blue-600 text-white">
                    EMOM {item.timeSeconds ? `${Math.floor(item.timeSeconds / 60)}min` : ''}
                  </Badge>
                )}
                {item.structureType === 'interval' && (
                  <Badge className="text-xs bg-red-600 text-white">
                    {item.workSeconds}s/{item.restSecondsInterval}s
                  </Badge>
                )}
                {item.structureType === 'tabata' && (
                  <Badge className="text-xs bg-pink-600 text-white">
                    Tabata
                  </Badge>
                )}
                {item.structureType === 'circuit' && (
                  <Badge className="text-xs bg-green-600 text-white">
                    Circuit
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(item.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>

          {/* Show top-level sets/reps/weight only if NO member prescriptions (individual workout) */}
          {!hasMemberPrescriptions && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Sets</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.sets || ""}
                  onChange={(e) =>
                    onUpdate(item.id, { sets: parseInt(e.target.value) || undefined })
                  }
                  placeholder="3"
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Reps</Label>
                <Input
                  value={item.reps || ""}
                  onChange={(e) => onUpdate(item.id, { reps: e.target.value })}
                  placeholder="8-12"
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Weight</Label>
                <Input
                  value={item.weight || ""}
                  onChange={(e) => onUpdate(item.id, { weight: e.target.value })}
                  placeholder="135 lbs"
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Rest (sec)</Label>
                <Input
                  type="number"
                  min="0"
                  value={item.restBetweenSets || ""}
                  onChange={(e) =>
                    onUpdate(item.id, {
                      restBetweenSets: parseInt(e.target.value) || undefined,
                    })
                  }
                  placeholder="60"
                  className="h-8"
                />
              </div>
            </div>
          )}

          {/* Compact sets/rest display for group workouts */}
          {hasMemberPrescriptions && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="font-medium">{item.sets || 3}</span> sets
              </span>
              <span className="flex items-center gap-1">
                <span className="font-medium">{item.reps || "8-12"}</span> reps
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="font-medium">{item.restBetweenSets || 60}s</span> rest
              </span>
            </div>
          )}

          <div>
            <Label className="text-xs">Notes</Label>
            <Input
              value={item.notes || ""}
              onChange={(e) => onUpdate(item.id, { notes: e.target.value })}
              placeholder="Any special instructions..."
              className="h-8"
            />
          </div>

          {/* Member-specific prescriptions - Editable */}
          {hasMemberPrescriptions && (
            <div className="mt-2 pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Member Prescriptions
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setShowPrescriptionEditor(!showPrescriptionEditor)}
                >
                  {showPrescriptionEditor ? "Done" : "Edit"}
                </Button>
              </div>

              {showPrescriptionEditor ? (
                <div className="space-y-3">
                  {item.memberPrescriptions!.map((prescription, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-muted/50 rounded-md space-y-2"
                    >
                      <div className="font-medium text-primary text-sm">
                        {prescription.memberName}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs">Weight</Label>
                          <Input
                            value={prescription.weight || ""}
                            onChange={(e) => updatePrescription(idx, "weight", e.target.value || null)}
                            placeholder="135 lbs"
                            className="h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">% of Max</Label>
                          <Input
                            type="number"
                            value={prescription.percentOfMax || ""}
                            onChange={(e) => updatePrescription(idx, "percentOfMax", e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="70"
                            className="h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">RPE Target</Label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={prescription.rpeTarget || ""}
                            onChange={(e) => updatePrescription(idx, "rpeTarget", e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="7"
                            className="h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Modification</Label>
                          <Input
                            value={prescription.bodyweightMod || ""}
                            onChange={(e) => updatePrescription(idx, "bodyweightMod", e.target.value || null)}
                            placeholder="Assisted"
                            className="h-7 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Notes</Label>
                        <Input
                          value={prescription.memberNotes || ""}
                          onChange={(e) => updatePrescription(idx, "memberNotes", e.target.value || null)}
                          placeholder="Additional notes for this member..."
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-2">
                  {item.memberPrescriptions!.map((prescription, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-2"
                    >
                      <span className="font-medium text-primary min-w-[80px]">
                        {prescription.memberName}:
                      </span>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {prescription.weight && (
                          <Badge variant="outline" className="text-xs font-normal">
                            {prescription.weight}
                            {prescription.percentOfMax && ` (${prescription.percentOfMax}%)`}
                          </Badge>
                        )}
                        {prescription.bodyweightMod && (
                          <Badge variant="outline" className="text-xs font-normal bg-green-50 dark:bg-green-900/20">
                            {prescription.bodyweightMod}
                          </Badge>
                        )}
                        {prescription.cardioTarget && (
                          <Badge variant="outline" className="text-xs font-normal bg-orange-50 dark:bg-orange-900/20">
                            {prescription.cardioTarget}
                          </Badge>
                        )}
                        {prescription.sprintTarget && (
                          <Badge variant="outline" className="text-xs font-normal bg-red-50 dark:bg-red-900/20">
                            {prescription.sprintTarget}
                          </Badge>
                        )}
                        {prescription.rpeTarget && (
                          <Badge variant="secondary" className="text-xs font-normal">
                            RPE {prescription.rpeTarget}
                          </Badge>
                        )}
                        {prescription.memberNotes && (
                          <span className="text-xs text-muted-foreground italic">
                            "{prescription.memberNotes}"
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorkoutBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [mechanicFilter, setMechanicFilter] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // AI Generation state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState<{
    phase: "idle" | "analyzing" | "planning" | "generating" | "finalizing" | "error";
    message: string;
    startTime?: number;
    elapsedSeconds?: number;
  }>({ phase: "idle", message: "" });
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [workoutFocus, setWorkoutFocus] = useState("auto");
  const [customFocus, setCustomFocus] = useState("");
  const [showCustomFocus, setShowCustomFocus] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<AIReasoning | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [planType, setPlanType] = useState<"single" | "weekly" | "program">("single");
  const [workoutMode, setWorkoutMode] = useState<"individual" | "group">("individual");
  const [programWeeks, setProgramWeeks] = useState("4");
  const [daysPerWeek, setDaysPerWeek] = useState("3");
  const [selectedDays, setSelectedDays] = useState<string[]>(["monday", "wednesday", "friday"]);
  const [programGoal, setProgramGoal] = useState("general_fitness");
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);

  // Per-day settings for multi-day plans (intensity + duration)
  const [daySettings, setDaySettings] = useState<Record<string, { intensity: string; duration: string }>>({
    monday: { intensity: "high", duration: "60" },
    tuesday: { intensity: "moderate", duration: "45" },
    wednesday: { intensity: "high", duration: "60" },
    thursday: { intensity: "low", duration: "30" },
    friday: { intensity: "high", duration: "60" },
    saturday: { intensity: "moderate", duration: "45" },
    sunday: { intensity: "low", duration: "30" },
  });

  // New AI parameters
  const [intensityLevel, setIntensityLevel] = useState("moderate");
  const [targetDuration, setTargetDuration] = useState("45");
  const [restPreference, setRestPreference] = useState("standard");
  const [includeWarmup, setIncludeWarmup] = useState(true);
  const [includeCooldown, setIncludeCooldown] = useState(true);
  const [reasoningLevel, setReasoningLevel] = useState<"none" | "quick" | "standard" | "deep" | "max">("standard");
  const [showInteractiveGenerator, setShowInteractiveGenerator] = useState(false);

  // Exercise detail modal
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const [planName, setPlanName] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [planCategory, setPlanCategory] = useState("");
  const [planDifficulty, setPlanDifficulty] = useState("");
  const [planDuration, setPlanDuration] = useState("");
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchExercises();
    fetchMembers();
    if (editId) {
      fetchPlan(editId);
    } else {
      setLoading(false);
    }
  }, [editId]);

  // Computed: get selected members with their data
  const selectedMembersData = useMemo(() => {
    return members.filter(m => selectedMembers.includes(m.id));
  }, [members, selectedMembers]);

  const fetchExercises = async () => {
    try {
      const response = await fetch("/api/exercises");
      if (response.ok) {
        const data = await response.json();
        setExercises(data);
      }
    } catch (error) {
      console.error("Failed to fetch exercises:", error);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch("/api/members");
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => {
      // In individual mode, only allow one selection (radio behavior)
      if (workoutMode === "individual") {
        return prev.includes(memberId) ? [] : [memberId];
      }
      // In group mode, allow multiple selections (checkbox behavior)
      return prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId];
    });
  };

  const selectAllMembers = () => {
    // Only allow "select all" in group mode
    if (workoutMode === "group") {
      setSelectedMembers(members.map(m => m.id));
    }
  };

  // Handle mode switch - trim to one member if switching to individual
  const handleWorkoutModeChange = (mode: "individual" | "group") => {
    setWorkoutMode(mode);
    if (mode === "individual" && selectedMembers.length > 1) {
      // Keep only the first selected member
      setSelectedMembers([selectedMembers[0]]);
    }
  };

  const clearMemberSelection = () => {
    setSelectedMembers([]);
  };

  const fetchPlan = async (id: string) => {
    try {
      const response = await fetch(`/api/workout-plans/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPlanName(data.name);
        setPlanDescription(data.description || "");
        setPlanCategory(data.category || "");
        setPlanDifficulty(data.difficulty || "");
        setPlanDuration(data.estimatedDuration?.toString() || "");
        setWorkoutExercises(
          data.exercises.map((e: any) => ({
            id: `ex-${e.id}`,
            exerciseId: e.exerciseId,
            exercise: e.exercise,
            order: e.order,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
            duration: e.duration,
            restBetweenSets: e.restBetweenSets,
            notes: e.notes,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch plan:", error);
      toast.error("Failed to load workout plan");
    } finally {
      setLoading(false);
    }
  };

  // Memoized filtered exercises for performance
  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesSearch =
        !search ||
        ex.name.toLowerCase().includes(search.toLowerCase()) ||
        ex.muscleGroups?.some(m => m.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = categoryFilter === "all" || !categoryFilter || ex.category === categoryFilter;
      const matchesMuscle = muscleFilter === "all" || !muscleFilter ||
        ex.muscleGroups?.includes(muscleFilter);
      const matchesMechanic = mechanicFilter === "all" || !mechanicFilter || ex.mechanic === mechanicFilter;
      return matchesSearch && matchesCategory && matchesMuscle && matchesMechanic;
    });
  }, [exercises, search, categoryFilter, muscleFilter, mechanicFilter]);

  // Get exercises matching quick pick keywords
  const getQuickPickExercises = (keywords: string[]) => {
    return exercises.filter(ex =>
      keywords.some(kw => ex.name.toLowerCase().includes(kw.toLowerCase()))
    ).slice(0, 8);
  };

  const addExercise = (exercise: Exercise) => {
    const newExercise: WorkoutExercise = {
      id: `new-${Date.now()}-${Math.random()}`,
      exerciseId: exercise.id,
      exercise,
      order: workoutExercises.length,
      sets: 3,
      reps: "10",
      restBetweenSets: 60,
    };
    setWorkoutExercises([...workoutExercises, newExercise]);
    toast.success(`Added ${exercise.name}`);
  };

  const updateExercise = (id: string, updates: Partial<WorkoutExercise>) => {
    setWorkoutExercises(
      workoutExercises.map((ex) =>
        ex.id === id ? { ...ex, ...updates } : ex
      )
    );
  };

  const removeExercise = (id: string) => {
    setWorkoutExercises(workoutExercises.filter((ex) => ex.id !== id));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setWorkoutExercises((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          order: index,
        }));
      });
    }
  };

  const handleAIGenerate = async () => {
    if (selectedMembers.length === 0) {
      toast.error("Please select at least one family member");
      return;
    }

    setAiGenerating(true);
    setAiReasoning(null);
    const startTime = Date.now();

    // Progress simulation - show different phases as time passes
    const progressMessages = [
      { phase: "analyzing" as const, message: "Analyzing member profiles, goals, and limitations...", delay: 0 },
      { phase: "planning" as const, message: "Planning optimal workout strategy...", delay: 3000 },
      { phase: "generating" as const, message: "Generating personalized exercises...", delay: 8000 },
      { phase: "finalizing" as const, message: "Finalizing workout plan...", delay: 15000 },
    ];

    // Start with first phase
    setAiProgress({ phase: "analyzing", message: progressMessages[0].message, startTime });

    // Update progress phases based on elapsed time
    const progressIntervalId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const elapsedSeconds = Math.floor(elapsed / 1000);

      // Find the appropriate phase based on elapsed time
      let currentPhase = progressMessages[0];
      for (const pm of progressMessages) {
        if (elapsed >= pm.delay) {
          currentPhase = pm;
        }
      }

      setAiProgress({
        phase: currentPhase.phase,
        message: currentPhase.message,
        startTime,
        elapsedSeconds,
      });

      // Show warning if taking too long
      if (elapsedSeconds === 30) {
        setAiProgress(prev => ({
          ...prev,
          message: "Still working... AI is thinking deeply about your workout.",
        }));
      } else if (elapsedSeconds === 60) {
        setAiProgress(prev => ({
          ...prev,
          message: "Almost there... Complex workouts take a bit longer.",
        }));
      }
    }, 1000);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      const response = await fetch("/api/ai/generate-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: selectedMembers,
          focus: workoutFocus && workoutFocus !== "auto" ? workoutFocus : undefined,
          customFocus: showCustomFocus ? customFocus : undefined,
          intensity: intensityLevel,
          targetDuration: parseInt(targetDuration),
          restPreference,
          includeWarmup,
          includeCooldown,
          reasoningLevel,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      clearInterval(progressIntervalId);

      if (response.ok) {
        const data = await response.json();
        const workout = data.workout;

        // Store AI reasoning for display
        if (data.reasoning) {
          setAiReasoning(data.reasoning);
        }

        // Set plan details
        setPlanName(workout.name);
        setPlanDescription(workout.description);
        setPlanDuration(workout.estimatedDuration?.toString() || "");
        if (workout.difficulty) {
          setPlanDifficulty(workout.difficulty);
        }

        // Match generated exercises to our database
        const newExercises: WorkoutExercise[] = [];
        for (const genEx of workout.exercises) {
          const match = exercises.find(
            ex => ex.name.toLowerCase() === genEx.name.toLowerCase()
          );
          if (match) {
            // Build notes including alternatives
            let fullNotes = genEx.notes || "";
            if (genEx.alternatives?.length) {
              fullNotes += (fullNotes ? " | " : "") + `Alternatives: ${genEx.alternatives.join(", ")}`;
            }

            newExercises.push({
              id: `ai-${Date.now()}-${Math.random()}`,
              exerciseId: match.id,
              exercise: match,
              order: newExercises.length,
              sets: genEx.sets,
              reps: genEx.reps,
              restBetweenSets: genEx.restSeconds,
              notes: fullNotes || undefined,
              exerciseType: genEx.exerciseType,
              memberPrescriptions: genEx.memberPrescriptions,
              supersetGroup: genEx.supersetGroup,
            });
          }
        }

        setWorkoutExercises(newExercises);
        setAiDialogOpen(false);
        setAiProgress({ phase: "idle", message: "" });

        const memberNames = selectedMembersData.map(m => m.name).join(", ");
        toast.success(`AI workout generated for ${memberNames}! Review the reasoning and modify as needed.`);
        setShowReasoning(true);
      } else {
        const errorText = await response.text();
        setAiProgress({
          phase: "error",
          message: `Generation failed: ${errorText}`,
        });
        toast.error(`Failed to generate workout: ${errorText}`);
      }
    } catch (error) {
      clearInterval(progressIntervalId);
      console.error("AI generation failed:", error);

      if (error instanceof Error && error.name === "AbortError") {
        setAiProgress({
          phase: "error",
          message: "Request timed out. Please try again with fewer members or simpler settings.",
        });
        toast.error("Request timed out. Please try again.");
      } else {
        setAiProgress({
          phase: "error",
          message: error instanceof Error ? error.message : "An unexpected error occurred.",
        });
        toast.error("Failed to generate workout");
      }
    } finally {
      setAiGenerating(false);
    }
  };

  // Handle interactive generator completion
  const handleInteractiveComplete = (exerciseSlots: any[], plan: any) => {
    // Set plan details
    setPlanName(plan.name);
    setPlanDescription(plan.description);
    setPlanDuration(plan.estimatedDuration?.toString() || "");
    if (plan.difficulty) {
      setPlanDifficulty(plan.difficulty);
    }

    // Convert exercise slots to workout exercises
    const newExercises: WorkoutExercise[] = [];
    for (const slot of exerciseSlots) {
      const match = exercises.find(
        ex => ex.name.toLowerCase() === slot.selected.name.toLowerCase()
      );
      if (match) {
        newExercises.push({
          id: `interactive-${Date.now()}-${Math.random()}`,
          exerciseId: match.id,
          exercise: match,
          order: newExercises.length,
          sets: slot.selected.sets,
          reps: slot.selected.reps,
          restBetweenSets: slot.selected.restSeconds,
          notes: slot.selected.reason,
          memberPrescriptions: slot.selected.memberPrescriptions,
        });
      }
    }

    setWorkoutExercises(newExercises);
    setShowInteractiveGenerator(false);
    setAiDialogOpen(false);

    const memberNames = selectedMembersData.map(m => m.name).join(", ");
    toast.success(`Interactive workout created for ${memberNames}!`);
  };

  // Start interactive generation
  const startInteractiveGeneration = () => {
    if (selectedMembers.length === 0) {
      toast.error("Please select at least one family member");
      return;
    }
    setAiDialogOpen(false);
    setShowInteractiveGenerator(true);
  };

  const handleSave = async () => {
    if (!planName.trim()) {
      toast.error("Please enter a workout name");
      return;
    }

    if (workoutExercises.length === 0) {
      toast.error("Please add at least one exercise");
      return;
    }

    setSaving(true);
    try {
      const url = editId ? `/api/workout-plans/${editId}` : "/api/workout-plans";
      const method = editId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: planName,
          description: planDescription || null,
          category: planCategory || null,
          difficulty: planDifficulty || null,
          estimatedDuration: planDuration ? parseInt(planDuration) : null,
          exercises: workoutExercises.map((ex, index) => ({
            exerciseId: ex.exerciseId,
            order: index,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            duration: ex.duration,
            restBetweenSets: ex.restBetweenSets,
            notes: ex.notes,
          })),
        }),
      });

      if (response.ok) {
        toast.success(editId ? "Workout plan updated" : "Workout plan created");
        router.push("/workouts");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save workout plan");
      }
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save workout plan");
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setMuscleFilter("");
    setMechanicFilter("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeExercise = workoutExercises.find((ex) => ex.id === activeId);
  const hasFilters = search || categoryFilter || muscleFilter || mechanicFilter;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/workouts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {editId ? "Edit Workout Plan" : "Workout Builder"}
            </h1>
            <p className="text-muted-foreground">
              Build your perfect workout with AI assistance
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAiDialogOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            AI Generate
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Plan
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Workout Builder - Now on top */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Workout Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Workout Name *</Label>
                <Input
                  id="name"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="Upper Body Strength"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={planCategory} onValueChange={setPlanCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="hiit">HIIT</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                    <SelectItem value="flexibility">Flexibility</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select value={planDifficulty} onValueChange={setPlanDifficulty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Est. Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={planDuration}
                  onChange={(e) => setPlanDuration(e.target.value)}
                  placeholder="45"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={planDescription}
                onChange={(e) => setPlanDescription(e.target.value)}
                placeholder="Describe this workout..."
                rows={2}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">
                Exercises ({workoutExercises.length})
              </h4>

              {workoutExercises.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
                  <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <h4 className="font-medium text-lg mb-1">Start Building Your Workout</h4>
                  <p className="text-muted-foreground text-sm mb-4">
                    Click exercises from the library or use AI to generate a workout
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" onClick={() => setAiDialogOpen(true)}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate with AI
                    </Button>
                  </div>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={workoutExercises.map((ex) => ex.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {(() => {
                        // Group exercises for superset visual rendering
                        const elements: React.ReactNode[] = [];
                        let i = 0;
                        while (i < workoutExercises.length) {
                          const exercise = workoutExercises[i];

                          if (exercise.supersetGroup) {
                            // Find all exercises in this superset
                            const supersetExercises = workoutExercises.filter(
                              (ex) => ex.supersetGroup === exercise.supersetGroup
                            );
                            const supersetIndices = supersetExercises.map((ex) =>
                              workoutExercises.findIndex((we) => we.id === ex.id)
                            );
                            const minIndex = Math.min(...supersetIndices);

                            // Only render the superset group when we hit the first exercise in it
                            if (i === minIndex) {
                              elements.push(
                                <div
                                  key={`superset-${exercise.supersetGroup}`}
                                  className="relative"
                                >
                                  {/* Superset header */}
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className="bg-purple-600 text-white">
                                      <Zap className="h-3 w-3 mr-1" />
                                      Superset {exercise.supersetGroup}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      ({supersetExercises.length} exercises - perform back to back)
                                    </span>
                                  </div>
                                  {/* Superset container */}
                                  <div className="space-y-0">
                                    {supersetExercises.map((superEx, superIdx) => (
                                      <SortableExerciseItem
                                        key={superEx.id}
                                        item={superEx}
                                        onUpdate={updateExercise}
                                        onRemove={removeExercise}
                                        onExerciseClick={setSelectedExercise}
                                        isInSuperset={true}
                                        isFirstInSuperset={superIdx === 0}
                                        isLastInSuperset={superIdx === supersetExercises.length - 1}
                                      />
                                    ))}
                                  </div>
                                </div>
                              );
                              // Skip the rest of the superset exercises
                              i += supersetExercises.length;
                              continue;
                            }
                          }

                          // Regular exercise (not in a superset, or already handled)
                          if (!exercise.supersetGroup) {
                            elements.push(
                              <SortableExerciseItem
                                key={exercise.id}
                                item={exercise}
                                onUpdate={updateExercise}
                                onRemove={removeExercise}
                                onExerciseClick={setSelectedExercise}
                              />
                            );
                          }
                          i++;
                        }
                        return elements;
                      })()}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeExercise && (
                      <div className="border rounded-lg p-4 bg-card shadow-lg">
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">
                            {activeExercise.exercise.name}
                          </span>
                        </div>
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Add Exercise Search */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Exercises
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Intuitive Quick Search */}
            <SearchInput
              placeholder="Quick search: type exercise name and press Enter to add..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-4"
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredExercises.length > 0) {
                  addExercise(filteredExercises[0]);
                  setSearch("");
                }
              }}
            />

            {/* Quick Search Results - Only show when searching */}
            {search && (
              <div className="border rounded-lg p-2 bg-muted/30 max-h-64 overflow-y-auto">
                {filteredExercises.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No exercises found for "{search}"
                  </p>
                ) : (
                  <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredExercises.slice(0, 12).map((exercise) => (
                      <div
                        key={exercise.id}
                        className="p-2 border rounded hover:bg-primary/10 hover:border-primary transition-all text-sm flex justify-between items-center group"
                      >
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setSelectedExercise(exercise)}
                        >
                          <p className="font-medium truncate">{exercise.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {exercise.muscleGroups?.slice(0, 2).join(", ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedExercise(exercise);
                            }}
                          >
                            <Info className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              addExercise(exercise);
                              setSearch("");
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {filteredExercises.length > 12 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{filteredExercises.length - 12} more results. Keep typing to narrow down.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exercise Library - Full Browse */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Exercise Library
              </span>
              <Badge variant="secondary">{exercises.length} exercises</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Tabs defaultValue="browse" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="browse">Browse</TabsTrigger>
                <TabsTrigger value="quick">Quick Picks</TabsTrigger>
                <TabsTrigger value="filter">Filter</TabsTrigger>
              </TabsList>

              <TabsContent value="browse" className="space-y-4 mt-4">
                {/* Browse by Category */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {["strength", "cardio", "plyometric", "flexibility", "skill"].map((cat) => {
                    const catExercises = exercises.filter((e) => e.category === cat);
                    if (catExercises.length === 0) return null;
                    return (
                      <div key={cat} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium capitalize">{cat}</h4>
                          <Badge variant="outline" className="text-xs">{catExercises.length}</Badge>
                        </div>
                        <ScrollArea className="h-48">
                          <div className="space-y-1">
                            {catExercises.slice(0, 20).map((exercise) => (
                              <div
                                key={exercise.id}
                                className="p-2 rounded hover:bg-primary/10 transition-all text-sm flex justify-between items-center group"
                              >
                                <span
                                  className="truncate flex-1 cursor-pointer"
                                  onClick={() => setSelectedExercise(exercise)}
                                >
                                  {exercise.name}
                                </span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => setSelectedExercise(exercise)}
                                  >
                                    <Info className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => addExercise(exercise)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            {catExercises.length > 20 && (
                              <p className="text-xs text-muted-foreground pt-2">
                                +{catExercises.length - 20} more...
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="quick" className="space-y-4 mt-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(QUICK_PICKS).map(([category, keywords]) => (
                    <div key={category} className="border rounded-lg p-3">
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        {category === "Big Lifts" && <Dumbbell className="h-4 w-4" />}
                        {category === "Explosive" && <Zap className="h-4 w-4" />}
                        {!["Big Lifts", "Explosive"].includes(category) && <Target className="h-4 w-4" />}
                        {category}
                      </h4>
                      <div className="space-y-1">
                        {getQuickPickExercises(keywords).map((exercise) => (
                          <div
                            key={exercise.id}
                            className="p-2 rounded hover:bg-primary/10 transition-all text-sm flex justify-between items-center group"
                          >
                            <span
                              className="truncate flex-1 cursor-pointer"
                              onClick={() => setSelectedExercise(exercise)}
                            >
                              {exercise.name}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setSelectedExercise(exercise)}
                              >
                                <Info className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => addExercise(exercise)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="filter" className="space-y-4 mt-4">
                {/* Advanced Filters */}
                <div className="grid gap-3 md:grid-cols-3">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      <SelectItem value="strength">Strength</SelectItem>
                      <SelectItem value="cardio">Cardio</SelectItem>
                      <SelectItem value="plyometric">Plyometric</SelectItem>
                      <SelectItem value="flexibility">Flexibility</SelectItem>
                      <SelectItem value="skill">Skill</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={muscleFilter} onValueChange={setMuscleFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Muscle group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All muscles</SelectItem>
                      {MUSCLE_GROUPS.map((muscle) => (
                        <SelectItem key={muscle} value={muscle} className="capitalize">
                          {muscle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={mechanicFilter} onValueChange={setMechanicFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Movement type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="compound">Compound</SelectItem>
                      <SelectItem value="isolation">Isolation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {hasFilters && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{filteredExercises.length} results</Badge>
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  </div>
                )}

                {/* Filtered Results */}
                <ScrollArea className="h-80">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredExercises.slice(0, 60).map((exercise) => (
                      <div
                        key={exercise.id}
                        className="p-3 border rounded-lg hover:bg-primary/10 hover:border-primary transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => setSelectedExercise(exercise)}
                          >
                            <p className="font-medium text-sm truncate">{exercise.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {exercise.mechanic === "compound" && (
                                <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  compound
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs capitalize">
                                {exercise.category}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setSelectedExercise(exercise)}
                            >
                              <Info className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => addExercise(exercise)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {filteredExercises.length > 60 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Showing first 60 results. Use filters to narrow down.
                    </p>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* AI Reasoning Panel */}
      {aiReasoning && showReasoning && (
        <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                AI Reasoning
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowReasoning(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div>
              <p className="font-medium text-purple-700 dark:text-purple-300">Strategy: {aiReasoning.strategy.workoutType}</p>
              <p className="text-muted-foreground">{aiReasoning.strategy.intensityApproach}</p>
            </div>
            {aiReasoning.analysis.sharedGoals.length > 0 && (
              <div>
                <p className="font-medium">Shared Goals:</p>
                <div className="flex flex-wrap gap-1">
                  {aiReasoning.analysis.sharedGoals.map((goal, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{goal}</Badge>
                  ))}
                </div>
              </div>
            )}
            {aiReasoning.strategy.adaptationsNeeded.length > 0 && (
              <div>
                <p className="font-medium text-orange-600 dark:text-orange-400">Adaptations Made:</p>
                <ul className="list-disc list-inside text-xs text-muted-foreground">
                  {aiReasoning.strategy.adaptationsNeeded.map((adapt, i) => (
                    <li key={i}>{adapt}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Generation Wizard Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={(open) => {
        setAiDialogOpen(open);
        if (!open) setWizardStep(1);
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Workout Generator
            </DialogTitle>
            <DialogDescription>
              {wizardStep === 1 && "Choose what type of workout plan you want to create"}
              {wizardStep === 2 && "Select who will be working out"}
              {wizardStep === 3 && "Configure your workout details"}
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 py-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step === wizardStep
                      ? "bg-primary text-primary-foreground"
                      : step < wizardStep
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step < wizardStep ? "✓" : step}
                </div>
                {step < 3 && (
                  <div className={`w-12 h-1 mx-1 rounded ${step < wizardStep ? "bg-green-500" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>

          <div className="space-y-4 py-2">
            {/* Step 1: Plan Type Selection */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <Label className="text-sm font-medium">What do you want to create?</Label>
                <div className="grid gap-3">
                  {/* Single Workout */}
                  <button
                    type="button"
                    onClick={() => setPlanType("single")}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      planType === "single"
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${planType === "single" ? "bg-primary/20" : "bg-muted"}`}>
                        <Dumbbell className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">Single Workout</p>
                        <p className="text-sm text-muted-foreground">
                          Generate one workout session for today or a specific day
                        </p>
                      </div>
                      {planType === "single" && <CheckCircle className="h-5 w-5 text-primary" />}
                    </div>
                  </button>

                  {/* Weekly Plan */}
                  <button
                    type="button"
                    onClick={() => setPlanType("weekly")}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      planType === "weekly"
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${planType === "weekly" ? "bg-primary/20" : "bg-muted"}`}>
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">Weekly Plan</p>
                        <p className="text-sm text-muted-foreground">
                          Create a balanced week of workouts with varied muscle groups
                        </p>
                      </div>
                      {planType === "weekly" && <CheckCircle className="h-5 w-5 text-primary" />}
                    </div>
                  </button>

                  {/* Full Program */}
                  <button
                    type="button"
                    onClick={() => setPlanType("program")}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      planType === "program"
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${planType === "program" ? "bg-primary/20" : "bg-muted"}`}>
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">Training Program</p>
                        <p className="text-sm text-muted-foreground">
                          Multi-week progressive program with periodization and goals
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">4-12 weeks</Badge>
                          <Badge variant="secondary" className="text-xs">Progressive overload</Badge>
                        </div>
                      </div>
                      {planType === "program" && <CheckCircle className="h-5 w-5 text-primary" />}
                    </div>
                  </button>
                </div>

                {/* Program Options */}
                {planType === "program" && (
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Program Length</Label>
                        <Select value={programWeeks} onValueChange={setProgramWeeks}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="4">4 weeks</SelectItem>
                            <SelectItem value="6">6 weeks</SelectItem>
                            <SelectItem value="8">8 weeks</SelectItem>
                            <SelectItem value="12">12 weeks</SelectItem>
                            <SelectItem value="16">16 weeks</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Program Goal</Label>
                        <Select value={programGoal} onValueChange={setProgramGoal}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general_fitness">General Fitness</SelectItem>
                            <SelectItem value="strength">Build Strength</SelectItem>
                            <SelectItem value="muscle">Build Muscle</SelectItem>
                            <SelectItem value="fat_loss">Fat Loss</SelectItem>
                            <SelectItem value="endurance">Endurance</SelectItem>
                            <SelectItem value="athletic">Athletic Performance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Weekly/Program: Days selection with per-day intensity */}
                {(planType === "weekly" || planType === "program") && (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                    <div className="space-y-3">
                      <Label className="text-sm">Days per Week</Label>
                      <div className="flex gap-2">
                        {["2", "3", "4", "5", "6"].map((d) => (
                          <Button
                            key={d}
                            type="button"
                            variant={daysPerWeek === d ? "default" : "outline"}
                            size="sm"
                            onClick={() => setDaysPerWeek(d)}
                            className="flex-1"
                          >
                            {d}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm">Schedule, Intensity & Duration</Label>
                      <p className="text-xs text-muted-foreground">
                        Select days and configure each session - AI will choose exercises based on intensity and time
                      </p>
                      <div className="grid gap-2">
                        {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => {
                          const isSelected = selectedDays.includes(day);
                          const settings = daySettings[day] || { intensity: "moderate", duration: "45" };
                          return (
                            <div
                              key={day}
                              className={`p-2 rounded-lg transition-all ${
                                isSelected ? "bg-primary/10 border border-primary/30" : "bg-muted/50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedDays(selectedDays.filter(d => d !== day));
                                    } else if (selectedDays.length < parseInt(daysPerWeek)) {
                                      setSelectedDays([...selectedDays, day]);
                                    }
                                  }}
                                  className={`w-16 px-2 py-1.5 rounded text-sm font-medium capitalize transition-all ${
                                    isSelected
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                                  }`}
                                >
                                  {day.slice(0, 3)}
                                </button>

                                {isSelected && (
                                  <div className="flex gap-3 flex-1 items-center">
                                    {/* Intensity selector */}
                                    <div className="flex gap-1">
                                      {[
                                        { value: "low", label: "Low", color: "bg-green-500", desc: "Recovery" },
                                        { value: "moderate", label: "Mod", color: "bg-yellow-500", desc: "Standard" },
                                        { value: "high", label: "High", color: "bg-orange-500", desc: "Hard" },
                                        { value: "max", label: "Max", color: "bg-red-500", desc: "All out" },
                                      ].map((level) => (
                                        <button
                                          key={level.value}
                                          type="button"
                                          onClick={() => setDaySettings({
                                            ...daySettings,
                                            [day]: { ...settings, intensity: level.value }
                                          })}
                                          className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                                            settings.intensity === level.value
                                              ? `${level.color} text-white`
                                              : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                          }`}
                                          title={level.desc}
                                        >
                                          {level.label}
                                        </button>
                                      ))}
                                    </div>

                                    {/* Duration selector */}
                                    <div className="flex items-center gap-1 ml-auto">
                                      <Clock className="h-3 w-3 text-muted-foreground" />
                                      <select
                                        value={settings.duration}
                                        onChange={(e) => setDaySettings({
                                          ...daySettings,
                                          [day]: { ...settings, duration: e.target.value }
                                        })}
                                        className="h-7 px-2 text-xs rounded border bg-background"
                                      >
                                        <option value="15">15m</option>
                                        <option value="30">30m</option>
                                        <option value="45">45m</option>
                                        <option value="60">60m</option>
                                        <option value="75">75m</option>
                                        <option value="90">90m</option>
                                      </select>
                                    </div>
                                  </div>
                                )}

                                {!isSelected && selectedDays.length >= parseInt(daysPerWeek) && (
                                  <span className="text-xs text-muted-foreground">Max days selected</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {selectedDays.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-2">Schedule overview:</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedDays.sort((a, b) => {
                              const order = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
                              return order.indexOf(a) - order.indexOf(b);
                            }).map((day) => {
                              const settings = daySettings[day];
                              const intensityColors: Record<string, string> = {
                                low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                                moderate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                                high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
                                max: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                              };
                              return (
                                <Badge key={day} className={`text-xs capitalize ${intensityColors[settings.intensity] || ""}`}>
                                  {day.slice(0, 3)}: {settings.intensity} • {settings.duration}m
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Member Selection */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                {/* Individual vs Group */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Workout Style</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleWorkoutModeChange("individual")}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        workoutMode === "individual"
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        <div>
                          <p className="font-semibold">Individual</p>
                          <p className="text-xs text-muted-foreground">One person, focused workout</p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWorkoutModeChange("group")}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        workoutMode === "group"
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        <div>
                          <p className="font-semibold">Group</p>
                          <p className="text-xs text-muted-foreground">Multiple people together</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Member Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      {workoutMode === "individual" ? "Select Member *" : "Select Circle Members *"}
                    </Label>
                    <div className="flex gap-1">
                      {workoutMode === "group" && (
                        <Button variant="ghost" size="sm" onClick={selectAllMembers} className="text-xs h-6 px-2">
                          All
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={clearMemberSelection} className="text-xs h-6 px-2">
                        Clear
                      </Button>
                    </div>
                  </div>
                  {workoutMode === "individual" && (
                    <p className="text-xs text-muted-foreground">
                      Choose one member for a personalized workout
                    </p>
                  )}
                  <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                    {members.map((member) => {
                      const isSelected = selectedMembers.includes(member.id);
                      const hasLimitations = member.limitations && member.limitations.filter(l => l.active).length > 0;
                      return (
                        <div
                          key={member.id}
                          onClick={() => toggleMemberSelection(member.id)}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {/* Radio button style for individual, checkbox style for group */}
                              {workoutMode === "individual" ? (
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                  isSelected ? "border-primary" : "border-muted-foreground"
                                }`}>
                                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                </div>
                              ) : (
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                  isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                                }`}>
                                  {isSelected && <span className="text-primary-foreground text-xs">✓</span>}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                {member.profilePicture ? (
                                  <img src={member.profilePicture} alt={member.name} className="h-8 w-8 rounded-full object-cover" />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium">{member.name}</p>
                                  <div className="flex flex-wrap gap-1">
                                    {member.latestMetrics?.fitnessLevel && (
                                      <Badge variant="outline" className="text-xs">
                                        {member.latestMetrics.fitnessLevel}
                                      </Badge>
                                    )}
                                    {hasLimitations && (
                                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                        Has limitations
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {selectedMembers.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {workoutMode === "individual" ? (
                        <span className="text-primary font-medium">{selectedMembersData[0]?.name} selected</span>
                      ) : (
                        <span>{selectedMembers.length} member{selectedMembers.length > 1 ? "s" : ""} selected for group workout</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Workout Configuration */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                {/* Workout Focus */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Workout Focus</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCustomFocus(!showCustomFocus)}
                      className="text-xs h-6"
                    >
                      {showCustomFocus ? "Use preset" : "Custom focus"}
                    </Button>
                  </div>

                  {showCustomFocus ? (
                    <div className="space-y-2">
                      <Textarea
                        value={customFocus}
                        onChange={(e) => setCustomFocus(e.target.value)}
                        placeholder="Describe what you want to focus on..."
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  ) : (
                    <Select value={workoutFocus} onValueChange={setWorkoutFocus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Let AI decide based on goals" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Let AI decide</SelectItem>
                        <SelectItem value="upper_push">Upper Body - Push</SelectItem>
                        <SelectItem value="upper_pull">Upper Body - Pull</SelectItem>
                        <SelectItem value="lower">Lower Body</SelectItem>
                        <SelectItem value="full_body">Full Body</SelectItem>
                        <SelectItem value="core">Core & Stability</SelectItem>
                        <SelectItem value="explosive">Power & Explosiveness</SelectItem>
                        <SelectItem value="cardio">Cardio & Conditioning</SelectItem>
                        <SelectItem value="recovery">Recovery & Mobility</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Parameters Grid - Single workout shows intensity & duration, multi-day just shows rest */}
                <div className={`grid gap-3 ${planType === "single" ? "grid-cols-3" : ""}`}>
                  {/* Only show intensity & duration for single workouts - multi-day uses per-day settings */}
                  {planType === "single" && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Flame className="h-3 w-3" />
                          Intensity
                        </Label>
                        <Select value={intensityLevel} onValueChange={setIntensityLevel}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low - Recovery</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="high">High - Challenging</SelectItem>
                            <SelectItem value="max">Max Effort</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Duration
                        </Label>
                        <Select value={targetDuration} onValueChange={setTargetDuration}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 min</SelectItem>
                            <SelectItem value="30">30 min</SelectItem>
                            <SelectItem value="45">45 min</SelectItem>
                            <SelectItem value="60">60 min</SelectItem>
                            <SelectItem value="90">90 min</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Rest Between Sets</Label>
                    <Select value={restPreference} onValueChange={setRestPreference}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short (30-45s)</SelectItem>
                        <SelectItem value="standard">Standard (60-90s)</SelectItem>
                        <SelectItem value="long">Long (2-3 min)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* AI Reasoning Level */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    AI Thinking Depth
                  </Label>
                  <Select value={reasoningLevel} onValueChange={(v) => setReasoningLevel(v as "none" | "quick" | "standard" | "deep" | "max")}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <div className="flex flex-col">
                          <span>Instant</span>
                          <span className="text-xs text-muted-foreground">No reasoning, fastest</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="quick">
                        <div className="flex flex-col">
                          <span>Quick</span>
                          <span className="text-xs text-muted-foreground">Light reasoning, fast</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="standard">
                        <div className="flex flex-col">
                          <span>Standard</span>
                          <span className="text-xs text-muted-foreground">Balanced (recommended)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="deep">
                        <div className="flex flex-col">
                          <span>Deep</span>
                          <span className="text-xs text-muted-foreground">Thorough analysis</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="max">
                        <div className="flex flex-col">
                          <span>Maximum</span>
                          <span className="text-xs text-muted-foreground">Extensive reasoning (slowest)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {reasoningLevel === "none" && "Fastest generation, basic workouts without deep analysis"}
                    {reasoningLevel === "quick" && "Fast generation, good for simple single-person workouts"}
                    {reasoningLevel === "standard" && "Recommended for most use cases - balanced speed & quality"}
                    {reasoningLevel === "deep" && "Thorough analysis, best for multi-member or complex workouts"}
                    {reasoningLevel === "max" && "Maximum reasoning power, use for very complex scenarios"}
                  </p>
                </div>

                {/* Info for multi-day plans */}
                {planType !== "single" && (
                  <p className="text-xs text-muted-foreground">
                    Intensity and duration are set per day in Step 1
                  </p>
                )}

                {/* Warmup/Cooldown */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Include in Workout</Label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIncludeWarmup(!includeWarmup)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                        includeWarmup
                          ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300"
                          : "border-muted bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                        includeWarmup ? "border-orange-500 bg-orange-500" : "border-muted-foreground/50"
                      }`}>
                        {includeWarmup && (
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium">Warmup</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncludeCooldown(!includeCooldown)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                        includeCooldown
                          ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                          : "border-muted bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                        includeCooldown ? "border-blue-500 bg-blue-500" : "border-muted-foreground/50"
                      }`}>
                        {includeCooldown && (
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium">Cooldown</span>
                    </button>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
                  <p className="text-sm font-medium">Summary</p>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>
                      <span className="font-medium text-foreground">Type:</span>{" "}
                      {planType === "single" ? "Single Workout" : planType === "weekly" ? "Weekly Plan" : `${programWeeks}-Week Program`}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">For:</span>{" "}
                      {selectedMembersData.map(m => m.name).join(", ")}
                      {workoutMode === "group" && " (group workout)"}
                    </p>
                    {(planType === "weekly" || planType === "program") && (
                      <div>
                        <p className="font-medium text-foreground mb-1">Weekly Schedule:</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedDays.sort((a, b) => {
                            const order = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
                            return order.indexOf(a) - order.indexOf(b);
                          }).map((day) => {
                            const settings = daySettings[day];
                            const intensityColors: Record<string, string> = {
                              low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                              moderate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                              high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
                              max: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                            };
                            return (
                              <Badge key={day} className={`text-xs capitalize ${intensityColors[settings.intensity] || ""}`}>
                                {day.slice(0, 3)}: {settings.intensity} • {settings.duration}m
                              </Badge>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          AI will choose exercises based on each day's intensity and duration
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                if (wizardStep === 1) {
                  setAiDialogOpen(false);
                } else {
                  setWizardStep(wizardStep - 1);
                }
              }}
            >
              {wizardStep === 1 ? "Cancel" : "Back"}
            </Button>
            {wizardStep < 3 ? (
              <Button onClick={() => setWizardStep(wizardStep + 1)}>
                Next
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={startInteractiveGeneration}
                  disabled={selectedMembers.length === 0 || aiGenerating}
                  className="flex-1"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Interactive
                </Button>
                <Button
                  onClick={handleAIGenerate}
                  disabled={selectedMembers.length === 0 || aiGenerating}
                  className="flex-1"
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : aiProgress.phase === "error" ? (
                    <>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Try Again
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Quick Generate
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* AI Generation Progress Display */}
          {aiGenerating && (
            <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                  <div className="absolute -inset-1 bg-primary/20 rounded-full animate-ping" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">AI is creating your workout</p>
                  <p className="text-xs text-muted-foreground">
                    {aiProgress.elapsedSeconds !== undefined && `${aiProgress.elapsedSeconds}s elapsed`}
                  </p>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${aiProgress.phase === "analyzing" || ["planning", "generating", "finalizing"].includes(aiProgress.phase) ? "bg-primary" : "bg-muted"}`} />
                  <span className={`text-xs ${aiProgress.phase === "analyzing" ? "text-primary font-medium" : ["planning", "generating", "finalizing"].includes(aiProgress.phase) ? "text-muted-foreground line-through" : "text-muted-foreground"}`}>
                    Analyzing profiles
                  </span>
                  {aiProgress.phase === "analyzing" && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                  {["planning", "generating", "finalizing"].includes(aiProgress.phase) && <CheckCircle className="h-3 w-3 text-green-500" />}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${aiProgress.phase === "planning" || ["generating", "finalizing"].includes(aiProgress.phase) ? "bg-primary" : "bg-muted"}`} />
                  <span className={`text-xs ${aiProgress.phase === "planning" ? "text-primary font-medium" : ["generating", "finalizing"].includes(aiProgress.phase) ? "text-muted-foreground line-through" : "text-muted-foreground"}`}>
                    Planning strategy
                  </span>
                  {aiProgress.phase === "planning" && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                  {["generating", "finalizing"].includes(aiProgress.phase) && <CheckCircle className="h-3 w-3 text-green-500" />}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${aiProgress.phase === "generating" || aiProgress.phase === "finalizing" ? "bg-primary" : "bg-muted"}`} />
                  <span className={`text-xs ${aiProgress.phase === "generating" ? "text-primary font-medium" : aiProgress.phase === "finalizing" ? "text-muted-foreground line-through" : "text-muted-foreground"}`}>
                    Generating exercises
                  </span>
                  {aiProgress.phase === "generating" && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                  {aiProgress.phase === "finalizing" && <CheckCircle className="h-3 w-3 text-green-500" />}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${aiProgress.phase === "finalizing" ? "bg-primary" : "bg-muted"}`} />
                  <span className={`text-xs ${aiProgress.phase === "finalizing" ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    Finalizing workout
                  </span>
                  {aiProgress.phase === "finalizing" && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-3 italic">
                {aiProgress.message}
              </p>
            </div>
          )}

          {/* Error Display */}
          {aiProgress.phase === "error" && !aiGenerating && (
            <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-destructive">Generation Failed</p>
                  <p className="text-xs text-muted-foreground mt-1">{aiProgress.message}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Exercise Detail Modal */}
      <Dialog open={!!selectedExercise} onOpenChange={() => setSelectedExercise(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedExercise && (
            <>
              {selectedExercise.imageUrl && (
                <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden -mt-2 mb-2">
                  <img
                    src={selectedExercise.imageUrl}
                    alt={selectedExercise.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedExercise.name}
                  {selectedExercise.isCustom && (
                    <Badge variant="secondary">Custom</Badge>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Category, difficulty, force, mechanic */}
                <div className="flex flex-wrap gap-2">
                  <Badge>{selectedExercise.category}</Badge>
                  {selectedExercise.difficulty && (
                    <Badge variant="outline">{selectedExercise.difficulty}</Badge>
                  )}
                  {selectedExercise.force && (
                    <Badge variant="outline" className="capitalize">{selectedExercise.force}</Badge>
                  )}
                  {selectedExercise.mechanic && (
                    <Badge variant="outline" className="capitalize">{selectedExercise.mechanic}</Badge>
                  )}
                </div>

                {selectedExercise.description && (
                  <div>
                    <h4 className="font-medium mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedExercise.description}
                    </p>
                  </div>
                )}

                {/* Benefits - What this develops */}
                {selectedExercise.benefits && selectedExercise.benefits.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1 text-green-600 dark:text-green-400">What This Develops</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedExercise.benefits.map((benefit) => (
                        <Badge key={benefit} className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 capitalize">
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progressions - What this leads to */}
                {selectedExercise.progressions && selectedExercise.progressions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1 text-blue-600 dark:text-blue-400">What This Leads To</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedExercise.progressions.map((prog) => (
                        <Badge key={prog} className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {prog}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedExercise.instructions && (
                  <div>
                    <h4 className="font-medium mb-1">How To Do It</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {selectedExercise.instructions}
                    </p>
                  </div>
                )}

                {/* Primary muscles */}
                {selectedExercise.muscleGroups && selectedExercise.muscleGroups.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1">Primary Muscles</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedExercise.muscleGroups.map((muscle) => (
                        <Badge key={muscle} variant="secondary" className="capitalize">
                          {muscle}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Secondary muscles */}
                {selectedExercise.secondaryMuscles && selectedExercise.secondaryMuscles.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1 text-muted-foreground">Secondary Muscles</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedExercise.secondaryMuscles.map((muscle) => (
                        <Badge key={muscle} variant="outline" className="capitalize text-muted-foreground">
                          {muscle}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedExercise.equipment && selectedExercise.equipment.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1">Equipment</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedExercise.equipment.map((eq) => (
                        <Badge key={eq} variant="outline" className="capitalize">
                          {eq}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add to Workout Button */}
                <div className="pt-2 border-t">
                  <Button
                    className="w-full"
                    onClick={() => {
                      addExercise(selectedExercise);
                      setSelectedExercise(null);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Workout
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Interactive Workout Generator */}
      {showInteractiveGenerator && (
        <InteractiveWorkoutGenerator
          members={members}
          selectedMemberIds={selectedMembers}
          config={{
            memberIds: selectedMembers,
            focus: workoutFocus !== "auto" ? workoutFocus : undefined,
            customFocus: showCustomFocus ? customFocus : undefined,
            intensity: intensityLevel,
            targetDuration: parseInt(targetDuration),
            restPreference,
            includeWarmup,
            includeCooldown,
          }}
          exercises={exercises}
          onComplete={handleInteractiveComplete}
          onCancel={() => setShowInteractiveGenerator(false)}
        />
      )}
    </div>
  );
}
