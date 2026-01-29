"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle,
  Users,
  Target,
  Dumbbell,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
  RefreshCw,
  Zap,
  Clock,
  Flame,
  Heart,
  X,
  ArrowRight,
  RotateCcw,
  Check,
  Brain,
} from "lucide-react";

// Types
interface Member {
  id: string;
  name: string;
  avatar?: string;
  profilePicture?: string;
}

interface MemberAnalysis {
  name: string;
  fitnessLevel: string;
  goals: string[];
  limitations: string[];
  maxLifts: { exercise: string; weight: number }[];
  skills: string[];
}

interface ExerciseOption {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes?: string;
  exerciseType?: string;
  memberPrescriptions?: Array<{
    memberName: string;
    weight?: string;
    percentOfMax?: number;
    bodyweightMod?: string;
    rpeTarget?: number;
  }>;
  reason: string; // Why this exercise was chosen
}

interface ExerciseSlot {
  id: string;
  category: string; // "compound", "accessory", "warmup", "cooldown", "cardio"
  targetMuscles: string[];
  recommended: ExerciseOption;
  alternatives: ExerciseOption[];
  selected: ExerciseOption;
  isExpanded: boolean;
  isLocked: boolean;
}

interface WorkoutPlan {
  name: string;
  description: string;
  estimatedDuration: number;
  difficulty: string;
  reasoning: string;
}

type GenerationPhase =
  | "idle"
  | "analyzing_members"
  | "analyzing_equipment"
  | "planning_structure"
  | "generating_compounds"
  | "generating_accessories"
  | "generating_cardio"
  | "finalizing"
  | "complete"
  | "error";

interface GenerationState {
  phase: GenerationPhase;
  progress: number;
  message: string;
  memberAnalysis?: MemberAnalysis[];
  equipmentSummary?: string[];
  workoutPlan?: WorkoutPlan;
  exerciseSlots?: ExerciseSlot[];
}

interface GenerationConfig {
  memberIds: string[];
  focus?: string;
  customFocus?: string;
  intensity: string;
  targetDuration: number;
  restPreference: string;
  includeWarmup: boolean;
  includeCooldown: boolean;
}

interface InteractiveWorkoutGeneratorProps {
  members: Member[];
  selectedMemberIds: string[];
  config: GenerationConfig;
  exercises: Array<{
    id: string;
    name: string;
    category: string;
    muscleGroups?: string[];
    equipment?: string[];
  }>;
  onComplete: (exercises: ExerciseSlot[], plan: WorkoutPlan) => void;
  onCancel: () => void;
}

// Phase configuration
const PHASES: Record<GenerationPhase, { label: string; icon: React.ElementType; progress: number }> = {
  idle: { label: "Ready", icon: Sparkles, progress: 0 },
  analyzing_members: { label: "Understanding Members", icon: Users, progress: 10 },
  analyzing_equipment: { label: "Checking Equipment", icon: Dumbbell, progress: 20 },
  planning_structure: { label: "Planning Workout", icon: Brain, progress: 35 },
  generating_compounds: { label: "Selecting Compound Movements", icon: Flame, progress: 50 },
  generating_accessories: { label: "Selecting Accessories", icon: Target, progress: 70 },
  generating_cardio: { label: "Adding Cardio & Finishers", icon: Heart, progress: 85 },
  finalizing: { label: "Finalizing Plan", icon: CheckCircle, progress: 95 },
  complete: { label: "Complete", icon: CheckCircle, progress: 100 },
  error: { label: "Error", icon: AlertTriangle, progress: 0 },
};

export default function InteractiveWorkoutGenerator({
  members,
  selectedMemberIds,
  config,
  exercises,
  onComplete,
  onCancel,
}: InteractiveWorkoutGeneratorProps) {
  const [state, setState] = useState<GenerationState>({
    phase: "idle",
    progress: 0,
    message: "Ready to generate your workout",
  });

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSlotId, setSearchSlotId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const selectedMembers = members.filter(m => selectedMemberIds.includes(m.id));

  // Start generation - use selectedMemberIds instead of config.memberIds
  const startGeneration = useCallback(async () => {
    setIsGenerating(true);
    setState({ phase: "analyzing_members", progress: 10, message: "Analyzing member profiles, goals, and limitations..." });

    try {
      // Step 1: Analyze ONLY the selected members
      await simulateDelay(800);
      const memberAnalysis = await fetchMemberAnalysis(selectedMemberIds);
      setState(prev => ({
        ...prev,
        phase: "analyzing_equipment",
        progress: 20,
        message: "Checking available equipment...",
        memberAnalysis,
      }));

      // Step 2: Analyze equipment
      await simulateDelay(600);
      const equipmentSummary = await fetchEquipmentSummary();
      setState(prev => ({
        ...prev,
        phase: "planning_structure",
        progress: 35,
        message: "Planning optimal workout structure...",
        equipmentSummary,
      }));

      // Step 3: Generate workout plan structure
      await simulateDelay(500);
      const planResult = await generateWorkoutPlan(config, memberAnalysis, equipmentSummary);
      setState(prev => ({
        ...prev,
        phase: "generating_compounds",
        progress: 50,
        message: "Selecting compound movements...",
        workoutPlan: planResult.plan,
      }));

      // Step 4: Generate compound exercises
      await simulateDelay(400);
      const compoundSlots = await generateExerciseSlots(
        "compound",
        planResult.compoundCount,
        config,
        memberAnalysis,
        equipmentSummary,
        exercises
      );
      setState(prev => ({
        ...prev,
        phase: "generating_accessories",
        progress: 70,
        message: "Selecting accessory exercises...",
        exerciseSlots: compoundSlots,
      }));

      // Step 5: Generate accessory exercises
      await simulateDelay(400);
      const accessorySlots = await generateExerciseSlots(
        "accessory",
        planResult.accessoryCount,
        config,
        memberAnalysis,
        equipmentSummary,
        exercises
      );
      setState(prev => ({
        ...prev,
        phase: "generating_cardio",
        progress: 85,
        message: "Adding cardio and finishers...",
        exerciseSlots: [...(prev.exerciseSlots || []), ...accessorySlots],
      }));

      // Step 6: Generate cardio/finishers if applicable
      await simulateDelay(300);
      let cardioSlots: ExerciseSlot[] = [];
      if (planResult.includeCardio) {
        cardioSlots = await generateExerciseSlots(
          "cardio",
          planResult.cardioCount,
          config,
          memberAnalysis,
          equipmentSummary,
          exercises
        );
      }

      // Add warmup/cooldown slots if configured
      let warmupSlots: ExerciseSlot[] = [];
      let cooldownSlots: ExerciseSlot[] = [];

      if (config.includeWarmup) {
        warmupSlots = await generateExerciseSlots(
          "warmup",
          2,
          config,
          memberAnalysis,
          equipmentSummary,
          exercises
        );
      }

      if (config.includeCooldown) {
        cooldownSlots = await generateExerciseSlots(
          "cooldown",
          2,
          config,
          memberAnalysis,
          equipmentSummary,
          exercises
        );
      }

      setState(prev => ({
        ...prev,
        phase: "finalizing",
        progress: 95,
        message: "Finalizing your personalized workout...",
        exerciseSlots: [
          ...warmupSlots,
          ...(prev.exerciseSlots || []),
          ...cardioSlots,
          ...cooldownSlots,
        ],
      }));

      await simulateDelay(300);

      setState(prev => ({
        ...prev,
        phase: "complete",
        progress: 100,
        message: "Your workout is ready! Review and customize below.",
      }));

    } catch (error) {
      console.error("Generation error:", error);
      setState(prev => ({
        ...prev,
        phase: "error",
        message: error instanceof Error ? error.message : "Failed to generate workout",
      }));
    } finally {
      setIsGenerating(false);
    }
  }, [config, exercises, selectedMemberIds]);

  // Handle explicit generation start (no auto-start)
  const handleStartGeneration = useCallback(async () => {
    setHasStarted(true);
    try {
      await startGeneration();
    } catch (err) {
      // Error is handled in startGeneration
      console.error("Generation failed:", err);
    }
  }, [startGeneration]);

  // Retry generation with exponential backoff
  const handleRetry = useCallback(async () => {
    setRetryCount(prev => prev + 1);
    setState(prev => ({ ...prev, phase: "idle", message: "Retrying..." }));
    
    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    await handleStartGeneration();
  }, [handleStartGeneration, retryCount]);

  // Handle exercise slot expansion
  const toggleSlotExpansion = (slotId: string) => {
    setState(prev => ({
      ...prev,
      exerciseSlots: prev.exerciseSlots?.map(slot =>
        slot.id === slotId ? { ...slot, isExpanded: !slot.isExpanded } : slot
      ),
    }));
  };

  // Handle exercise selection from alternatives
  const selectAlternative = (slotId: string, alternative: ExerciseOption) => {
    setState(prev => ({
      ...prev,
      exerciseSlots: prev.exerciseSlots?.map(slot =>
        slot.id === slotId ? { ...slot, selected: alternative, isExpanded: false } : slot
      ),
    }));
  };

  // Handle search and swap
  const openSearch = (slotId: string) => {
    setSearchSlotId(slotId);
    setSearchQuery("");
    setSearchOpen(true);
  };

  const selectFromSearch = (exercise: typeof exercises[0]) => {
    if (!searchSlotId) return;

    const newOption: ExerciseOption = {
      name: exercise.name,
      sets: 3,
      reps: "8-12",
      restSeconds: 60,
      reason: "User selected",
    };

    setState(prev => ({
      ...prev,
      exerciseSlots: prev.exerciseSlots?.map(slot =>
        slot.id === searchSlotId ? { ...slot, selected: newOption, isExpanded: false } : slot
      ),
    }));

    setSearchOpen(false);
    setSearchSlotId(null);
  };

  // Lock/unlock slot
  const toggleLock = (slotId: string) => {
    setState(prev => ({
      ...prev,
      exerciseSlots: prev.exerciseSlots?.map(slot =>
        slot.id === slotId ? { ...slot, isLocked: !slot.isLocked } : slot
      ),
    }));
  };

  // Regenerate single slot
  const regenerateSlot = async (slotId: string) => {
    const slot = state.exerciseSlots?.find(s => s.id === slotId);
    if (!slot) return;

    // Generate new alternatives for this slot
    const newAlternatives = await generateExerciseSlots(
      slot.category,
      1,
      config,
      state.memberAnalysis || [],
      state.equipmentSummary || [],
      exercises
    );

    if (newAlternatives.length > 0) {
      setState(prev => ({
        ...prev,
        exerciseSlots: prev.exerciseSlots?.map(s =>
          s.id === slotId ? {
            ...s,
            recommended: newAlternatives[0].recommended,
            alternatives: newAlternatives[0].alternatives,
            selected: newAlternatives[0].recommended,
          } : s
        ),
      }));
    }
  };

  // Handle completion
  const handleComplete = () => {
    if (state.exerciseSlots && state.workoutPlan) {
      onComplete(state.exerciseSlots, state.workoutPlan);
    }
  };

  // Filter exercises for search
  const filteredExercises = searchQuery.length > 0
    ? exercises.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.muscleGroups?.some(mg => mg.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 20)
    : exercises.slice(0, 20);

  const currentPhase = PHASES[state.phase];
  const PhaseIcon = currentPhase.icon;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl my-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                state.phase === "complete" ? "bg-green-100 text-green-600" :
                state.phase === "error" ? "bg-red-100 text-red-600" :
                "bg-primary/10 text-primary"
              )}>
                {isGenerating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <PhaseIcon className="h-5 w-5" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">{currentPhase.label}</CardTitle>
                <CardDescription>{state.message}</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress bar */}
          <Progress value={state.progress} className="h-2 mt-4" />

          {/* Member chips */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {selectedMembers.map(member => (
              <Badge key={member.id} variant="secondary" className="text-xs">
                {member.name}
              </Badge>
            ))}
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {config.targetDuration} min
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Flame className="h-3 w-3 mr-1" />
              {config.intensity}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col pt-4">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-4 pr-4">
              {/* Member Analysis Section */}
              {state.memberAnalysis && state.phase !== "analyzing_members" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Member Analysis
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="grid gap-2">
                    {state.memberAnalysis.map((member, idx) => (
                      <div key={idx} className="bg-muted/50 rounded-lg p-3 text-sm">
                        <div className="font-medium">{member.name}</div>
                        <div className="text-muted-foreground text-xs mt-1">
                          {member.fitnessLevel} • Goals: {member.goals.slice(0, 2).join(", ")}
                          {member.limitations.length > 0 && (
                            <span className="text-orange-500"> • Limitations: {member.limitations.join(", ")}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Equipment Summary */}
              {state.equipmentSummary && state.equipmentSummary.length > 0 && state.phase !== "analyzing_equipment" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Dumbbell className="h-4 w-4" />
                    Available Equipment
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {state.equipmentSummary.slice(0, 8).map((eq, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {eq}
                      </Badge>
                    ))}
                    {state.equipmentSummary.length > 8 && (
                      <Badge variant="outline" className="text-xs">
                        +{state.equipmentSummary.length - 8} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Workout Plan */}
              {state.workoutPlan && state.phase !== "planning_structure" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Target className="h-4 w-4" />
                    Workout Plan
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <div className="font-medium">{state.workoutPlan.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {state.workoutPlan.description}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{state.workoutPlan.estimatedDuration} min</Badge>
                      <Badge variant="secondary">{state.workoutPlan.difficulty}</Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Exercise Slots */}
              {state.exerciseSlots && state.exerciseSlots.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    Exercise Selection
                    {state.phase === "complete" && <CheckCircle className="h-4 w-4 text-green-500" />}
                  </div>

                  <div className="space-y-2">
                    {state.exerciseSlots.map((slot, idx) => (
                      <ExerciseSlotCard
                        key={slot.id}
                        slot={slot}
                        index={idx}
                        onToggleExpand={() => toggleSlotExpansion(slot.id)}
                        onSelectAlternative={(alt) => selectAlternative(slot.id, alt)}
                        onOpenSearch={() => openSearch(slot.id)}
                        onToggleLock={() => toggleLock(slot.id)}
                        onRegenerate={() => regenerateSlot(slot.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Loading placeholder for current phase */}
              {isGenerating && state.phase !== "complete" && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">{state.message}</p>
                  </div>
                </div>
              )}

              {/* Idle state - Show generate button */}
              {state.phase === "idle" && !hasStarted && (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Ready to Generate</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                    Our AI will analyze your members&apos; profiles, equipment, and goals to create a personalized workout plan.
                  </p>
                  <Button size="lg" onClick={handleStartGeneration}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Workout
                  </Button>
                </div>
              )}

              {/* Error state */}
              {state.phase === "error" && (
                <div className="flex flex-col items-center py-8 text-center">
                  <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">{state.message}</p>
                  {retryCount < 3 && (
                    <p className="text-xs text-muted-foreground mb-4">
                      Attempt {retryCount + 1} of 3
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={onCancel}>
                      Cancel
                    </Button>
                    <Button onClick={handleRetry} disabled={retryCount >= 3}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {retryCount >= 3 ? "Max retries reached" : "Try Again"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {state.phase === "complete" && (
            <div className="flex gap-3 pt-4 border-t mt-4 flex-shrink-0">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleComplete} className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                Use This Workout
              </Button>
            </div>
          )}
        </CardContent>

        {/* Search Dialog */}
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Search Exercises</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col flex-1 min-h-0 space-y-4">
              <SearchInput
                placeholder="Search by name, muscle group..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                containerClassName="flex-shrink-0"
                autoFocus
              />
              <div className="flex-1 min-h-0 overflow-y-auto border rounded-md">
                <div className="space-y-1 p-1">
                  {filteredExercises.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No exercises found matching &quot;{searchQuery}&quot;
                    </div>
                  ) : (
                    filteredExercises.map(ex => (
                      <button
                        key={ex.id}
                        onClick={() => selectFromSearch(ex)}
                        className="w-full text-left p-2 rounded hover:bg-muted flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-medium text-sm">{ex.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {ex.category} • {ex.muscleGroups?.join(", ")}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
}

// Exercise Slot Card Component
function ExerciseSlotCard({
  slot,
  index,
  onToggleExpand,
  onSelectAlternative,
  onOpenSearch,
  onToggleLock,
  onRegenerate,
}: {
  slot: ExerciseSlot;
  index: number;
  onToggleExpand: () => void;
  onSelectAlternative: (alt: ExerciseOption) => void;
  onOpenSearch: () => void;
  onToggleLock: () => void;
  onRegenerate: () => void;
}) {
  const categoryColors: Record<string, string> = {
    compound: "bg-red-100 text-red-700 border-red-200",
    accessory: "bg-blue-100 text-blue-700 border-blue-200",
    cardio: "bg-green-100 text-green-700 border-green-200",
    warmup: "bg-yellow-100 text-yellow-700 border-yellow-200",
    cooldown: "bg-purple-100 text-purple-700 border-purple-200",
  };

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden transition-all",
      slot.isLocked && "ring-2 ring-primary"
    )}>
      {/* Main row */}
      <div
        className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50"
        onClick={onToggleExpand}
      >
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{slot.selected.name}</span>
            <Badge className={cn("text-xs", categoryColors[slot.category])}>
              {slot.category}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {slot.selected.sets} sets × {slot.selected.reps} • {slot.selected.restSeconds}s rest
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); onOpenSearch(); }}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {slot.isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {slot.isExpanded && (
        <div className="border-t bg-muted/30 p-3 space-y-3">
          {/* Reason */}
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Why this exercise:</span> {slot.selected.reason}
          </div>

          {/* Member prescriptions */}
          {slot.selected.memberPrescriptions && slot.selected.memberPrescriptions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {slot.selected.memberPrescriptions.map((mp, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {mp.memberName}: {mp.weight || `${mp.percentOfMax}%`}
                  {mp.rpeTarget && ` @ RPE ${mp.rpeTarget}`}
                </Badge>
              ))}
            </div>
          )}

          {/* Alternatives */}
          {slot.alternatives.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Alternatives:</div>
              <div className="grid gap-2">
                {slot.alternatives.map((alt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectAlternative(alt)}
                    className="text-left p-2 rounded border hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{alt.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {alt.sets} × {alt.reps}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {alt.reason}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper functions (these would be API calls in production)
function simulateDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchMemberAnalysis(memberIds: string[]): Promise<MemberAnalysis[]> {
  const response = await fetch("/api/members?" + memberIds.map(id => `ids=${id}`).join("&"));
  if (!response.ok) throw new Error("Failed to fetch member data");

  const members = await response.json();

  return members.map((m: any) => ({
    name: m.name,
    fitnessLevel: m.latestMetrics?.fitnessLevel || "Intermediate",
    goals: m.goals?.map((g: any) => g.title) || [],
    limitations: m.limitations?.filter((l: any) => l.active).map((l: any) => l.description) || [],
    maxLifts: m.personalRecords?.map((pr: any) => ({
      exercise: pr.exercise?.name || "Unknown",
      weight: pr.value,
    })) || [],
    skills: m.skills?.map((s: any) => s.name) || [],
  }));
}

async function fetchEquipmentSummary(): Promise<string[]> {
  try {
    const response = await fetch("/api/equipment");
    if (!response.ok) return [];

    const equipment = await response.json();
    return equipment.map((e: any) => e.name);
  } catch {
    return [];
  }
}

async function generateWorkoutPlan(
  config: GenerationConfig,
  memberAnalysis: MemberAnalysis[],
  equipment: string[]
): Promise<{
  plan: WorkoutPlan;
  compoundCount: number;
  accessoryCount: number;
  cardioCount: number;
  includeCardio: boolean;
}> {
  // Calculate exercise counts based on duration and intensity
  const baseExercises = Math.floor(config.targetDuration / 10);
  const intensityMultiplier = config.intensity === "light" ? 0.7 : config.intensity === "intense" ? 1.2 : 1;
  const totalExercises = Math.round(baseExercises * intensityMultiplier);

  const compoundCount = Math.max(2, Math.floor(totalExercises * 0.4));
  const accessoryCount = Math.max(1, Math.floor(totalExercises * 0.4));
  const cardioCount = config.intensity === "light" ? 1 : Math.floor(totalExercises * 0.2);

  const focusName = config.focus && config.focus !== "auto"
    ? config.focus.charAt(0).toUpperCase() + config.focus.slice(1)
    : "Full Body";

  return {
    plan: {
      name: `${focusName} ${config.intensity.charAt(0).toUpperCase() + config.intensity.slice(1)} Session`,
      description: `A ${config.targetDuration}-minute ${config.intensity} workout designed for ${memberAnalysis.map(m => m.name).join(" & ")}`,
      estimatedDuration: config.targetDuration,
      difficulty: config.intensity === "light" ? "beginner" : config.intensity === "intense" ? "advanced" : "intermediate",
      reasoning: `Based on ${memberAnalysis.length} member(s) with ${equipment.length} pieces of equipment available.`,
    },
    compoundCount,
    accessoryCount,
    cardioCount,
    includeCardio: config.intensity !== "light" && config.targetDuration >= 30,
  };
}

async function generateExerciseSlots(
  category: string,
  count: number,
  config: GenerationConfig,
  memberAnalysis: MemberAnalysis[],
  equipment: string[],
  allExercises: Array<{ id: string; name: string; category: string; muscleGroups?: string[]; equipment?: string[] }>
): Promise<ExerciseSlot[]> {
  const slots: ExerciseSlot[] = [];

  // Filter exercises by category type
  const categoryMap: Record<string, string[]> = {
    compound: ["strength"],
    accessory: ["strength"],
    cardio: ["cardio"],
    warmup: ["flexibility", "cardio"],
    cooldown: ["flexibility"],
  };

  const relevantExercises = allExercises.filter(ex =>
    categoryMap[category]?.includes(ex.category) || category === ex.category
  );

  for (let i = 0; i < count; i++) {
    // Pick random exercises for demo (in production, this would be AI-generated)
    const shuffled = [...relevantExercises].sort(() => Math.random() - 0.5);
    const primary = shuffled[0];
    const alt1 = shuffled[1];
    const alt2 = shuffled[2];

    if (!primary) continue;

    const createOption = (ex: typeof primary, isPrimary: boolean): ExerciseOption => ({
      name: ex.name,
      sets: category === "warmup" || category === "cooldown" ? 2 : category === "compound" ? 4 : 3,
      reps: category === "cardio" ? "5-10 min" : category === "warmup" ? "10-15" : "8-12",
      restSeconds: category === "compound" ? 90 : 60,
      reason: isPrimary
        ? `Best match for ${config.focus || "overall fitness"} based on available equipment`
        : `Alternative targeting similar muscle groups`,
      memberPrescriptions: memberAnalysis.map(m => ({
        memberName: m.name,
        percentOfMax: category === "compound" ? 70 : 65,
        rpeTarget: config.intensity === "intense" ? 8 : 7,
      })),
    });

    slots.push({
      id: `${category}-${i}-${Date.now()}`,
      category,
      targetMuscles: primary.muscleGroups || [],
      recommended: createOption(primary, true),
      alternatives: [alt1, alt2].filter(Boolean).map(ex => createOption(ex, false)),
      selected: createOption(primary, true),
      isExpanded: false,
      isLocked: false,
    });
  }

  return slots;
}
