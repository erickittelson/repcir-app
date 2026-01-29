"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Sparkles,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface CapabilityAssessment {
  // Mobility Tests
  canTouchToes?: "easily" | "barely" | "no";
  canDeepSquat?: "full_depth" | "parallel" | "quarter" | "no";
  canChildsPose?: "comfortable" | "tight" | "no";
  canOverheadReach?: "full" | "limited" | "painful";
  canLungeDeep?: "full" | "partial" | "no";
  
  // Stability Tests
  canSingleLegStand?: "30s+" | "10-30s" | "<10s";
  canPlankHold?: "60s+" | "30-60s" | "<30s" | "no";
  
  // Power/Plyometric Readiness
  canBoxJump?: "yes" | "low_only" | "no";
  canJumpRope?: "yes" | "limited" | "no";
  canBurpees?: "full" | "modified" | "no";
  
  // Strength Baseline
  canPushup?: "full" | "modified" | "wall_only" | "no";
  canPullup?: "multiple" | "one" | "assisted" | "no";
  canDeadliftHinge?: "good_form" | "needs_work" | "pain";
  
  // Special Considerations
  balanceIssues: boolean;
  dizzinessWithMovement: boolean;
  cardioLimitationsNotes?: string;
  
  // Overall Assessment (calculated)
  overallMobilityScore?: number;
  overallStrengthScore?: number;
  readinessLevel?: "rehabilitation" | "beginner" | "general" | "athletic";
}

// ============================================================================
// TEST DEFINITIONS
// ============================================================================

interface TestOption {
  value: string;
  label: string;
  description: string;
  icon: string;
  score: number; // For calculating readiness
}

interface MovementTest {
  id: keyof CapabilityAssessment;
  category: "mobility" | "stability" | "power" | "strength" | "special";
  title: string;
  description: string;
  illustration?: string; // Emoji illustration
  tip?: string;
  options: TestOption[];
}

const MOVEMENT_TESTS: MovementTest[] = [
  // MOBILITY TESTS
  {
    id: "canTouchToes",
    category: "mobility",
    title: "Touch Your Toes",
    description: "Standing with straight legs, can you touch your toes?",
    illustration: "🧎",
    tip: "Keep your knees straight and bend from the hips",
    options: [
      { value: "easily", label: "Easily", description: "Palms touch floor", icon: "✅", score: 3 },
      { value: "barely", label: "Barely", description: "Fingertips reach toes", icon: "🔶", score: 2 },
      { value: "no", label: "No", description: "Can't reach past shins", icon: "❌", score: 1 },
    ],
  },
  {
    id: "canDeepSquat",
    category: "mobility",
    title: "Deep Squat",
    description: "How low can you squat with heels on the ground?",
    illustration: "🏋️",
    tip: "Keep your heels down and chest up",
    options: [
      { value: "full_depth", label: "Full Depth", description: "Butt below knees, heels down", icon: "✅", score: 4 },
      { value: "parallel", label: "Parallel", description: "Thighs parallel to floor", icon: "🔶", score: 3 },
      { value: "quarter", label: "Quarter", description: "Only slight knee bend", icon: "⚠️", score: 2 },
      { value: "no", label: "Can't Squat", description: "Pain or unable", icon: "❌", score: 1 },
    ],
  },
  {
    id: "canChildsPose",
    category: "mobility",
    title: "Child's Pose",
    description: "Can you sit back on your heels with arms extended?",
    illustration: "🧘",
    tip: "Knees apart, forehead toward floor",
    options: [
      { value: "comfortable", label: "Comfortable", description: "Hold easily for 30s+", icon: "✅", score: 3 },
      { value: "tight", label: "Tight", description: "Feel tightness, can hold", icon: "🔶", score: 2 },
      { value: "no", label: "Can't Do", description: "Pain or unable", icon: "❌", score: 1 },
    ],
  },
  {
    id: "canOverheadReach",
    category: "mobility",
    title: "Overhead Reach",
    description: "Raise both arms straight overhead - how far can you go?",
    illustration: "🙆",
    tip: "Keep your back straight, don't arch",
    options: [
      { value: "full", label: "Full Range", description: "Arms by ears, straight", icon: "✅", score: 3 },
      { value: "limited", label: "Limited", description: "Some restriction", icon: "🔶", score: 2 },
      { value: "painful", label: "Causes Pain", description: "Pain when reaching up", icon: "⚠️", score: 1 },
    ],
  },
  {
    id: "canLungeDeep",
    category: "mobility",
    title: "Deep Lunge",
    description: "Can you do a deep lunge with back knee near floor?",
    illustration: "🦵",
    tip: "Front knee over ankle, back knee toward floor",
    options: [
      { value: "full", label: "Full Depth", description: "Back knee touches floor", icon: "✅", score: 3 },
      { value: "partial", label: "Partial", description: "Halfway down", icon: "🔶", score: 2 },
      { value: "no", label: "Can't Lunge", description: "Pain or balance issues", icon: "❌", score: 1 },
    ],
  },
  
  // STABILITY TESTS
  {
    id: "canSingleLegStand",
    category: "stability",
    title: "Single Leg Balance",
    description: "Stand on one leg with eyes open - how long?",
    illustration: "🦩",
    tip: "Arms out for balance is okay, just don't hold anything",
    options: [
      { value: "30s+", label: "30+ Seconds", description: "Solid balance", icon: "✅", score: 3 },
      { value: "10-30s", label: "10-30 Seconds", description: "Some wobbling", icon: "🔶", score: 2 },
      { value: "<10s", label: "Less than 10s", description: "Need support", icon: "❌", score: 1 },
    ],
  },
  {
    id: "canPlankHold",
    category: "stability",
    title: "Plank Hold",
    description: "How long can you hold a forearm plank with good form?",
    illustration: "💪",
    tip: "Body in a straight line, don't let hips sag",
    options: [
      { value: "60s+", label: "60+ Seconds", description: "Strong core", icon: "✅", score: 4 },
      { value: "30-60s", label: "30-60 Seconds", description: "Moderate", icon: "🔶", score: 3 },
      { value: "<30s", label: "Less than 30s", description: "Building strength", icon: "⚠️", score: 2 },
      { value: "no", label: "Can't Hold", description: "Unable to plank", icon: "❌", score: 1 },
    ],
  },
  
  // POWER/PLYOMETRIC
  {
    id: "canBoxJump",
    category: "power",
    title: "Box Jump / Jump Up",
    description: "Can you jump up onto a raised surface?",
    illustration: "📦",
    tip: "Think jumping onto a step or low box",
    options: [
      { value: "yes", label: "Yes, Comfortable", description: "Can jump onto platforms", icon: "✅", score: 3 },
      { value: "low_only", label: "Low Only", description: "Only small steps/curbs", icon: "🔶", score: 2 },
      { value: "no", label: "No Jumping", description: "Avoid impact", icon: "❌", score: 1 },
    ],
  },
  {
    id: "canJumpRope",
    category: "power",
    title: "Jump Rope / Hopping",
    description: "Can you do repeated small jumps?",
    illustration: "⏫",
    tip: "Light bouncing on balls of feet",
    options: [
      { value: "yes", label: "Yes", description: "Can jump continuously", icon: "✅", score: 3 },
      { value: "limited", label: "Limited", description: "Some jumps ok, gets uncomfortable", icon: "🔶", score: 2 },
      { value: "no", label: "No", description: "Need to avoid jumping", icon: "❌", score: 1 },
    ],
  },
  {
    id: "canBurpees",
    category: "power",
    title: "Burpees",
    description: "Can you do a full burpee (squat-push up-jump)?",
    illustration: "🤸",
    tip: "Standard burpee: squat down, kick back, pushup, jump up",
    options: [
      { value: "full", label: "Full Burpees", description: "No problem", icon: "✅", score: 3 },
      { value: "modified", label: "Modified", description: "Step back, no jump", icon: "🔶", score: 2 },
      { value: "no", label: "Can't Do", description: "Need to avoid", icon: "❌", score: 1 },
    ],
  },
  
  // STRENGTH BASELINE
  {
    id: "canPushup",
    category: "strength",
    title: "Push-Up",
    description: "What type of push-up can you do?",
    illustration: "💪",
    tip: "Full push-up = hands and toes, body straight",
    options: [
      { value: "full", label: "Full Push-ups", description: "Multiple reps", icon: "✅", score: 4 },
      { value: "modified", label: "Knee Push-ups", description: "From knees", icon: "🔶", score: 3 },
      { value: "wall_only", label: "Wall Push-ups", description: "Standing against wall", icon: "⚠️", score: 2 },
      { value: "no", label: "None", description: "Can't do any", icon: "❌", score: 1 },
    ],
  },
  {
    id: "canPullup",
    category: "strength",
    title: "Pull-Up / Hang",
    description: "Can you do a pull-up or hang from a bar?",
    illustration: "🏋️",
    tip: "Any grip style counts",
    options: [
      { value: "multiple", label: "Multiple Pull-ups", description: "3+ reps", icon: "✅", score: 4 },
      { value: "one", label: "One Pull-up", description: "Can do one", icon: "🔶", score: 3 },
      { value: "assisted", label: "Assisted/Hang", description: "Can hang or use band", icon: "⚠️", score: 2 },
      { value: "no", label: "None", description: "Can't hang", icon: "❌", score: 1 },
    ],
  },
  {
    id: "canDeadliftHinge",
    category: "strength",
    title: "Hip Hinge / Deadlift",
    description: "Can you bend forward from hips with flat back?",
    illustration: "🏋️",
    tip: "Like picking something up - hinge at hips, not round the back",
    options: [
      { value: "good_form", label: "Good Form", description: "Can hinge properly", icon: "✅", score: 3 },
      { value: "needs_work", label: "Needs Work", description: "Form could improve", icon: "🔶", score: 2 },
      { value: "pain", label: "Causes Pain", description: "Back pain when bending", icon: "❌", score: 1 },
    ],
  },
];

const SPECIAL_CONSIDERATIONS = [
  {
    id: "balanceIssues" as const,
    title: "Balance Issues",
    description: "Do you have ongoing balance or coordination issues?",
    icon: "⚖️",
  },
  {
    id: "dizzinessWithMovement" as const,
    title: "Dizziness with Movement",
    description: "Do you get dizzy when standing up quickly or during exercise?",
    icon: "😵",
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateScores(assessment: CapabilityAssessment): {
  mobilityScore: number;
  strengthScore: number;
  readinessLevel: "rehabilitation" | "beginner" | "general" | "athletic";
} {
  let mobilityTotal = 0;
  let mobilityCount = 0;
  let strengthTotal = 0;
  let strengthCount = 0;

  MOVEMENT_TESTS.forEach(test => {
    const value = assessment[test.id];
    if (value && typeof value === "string") {
      const option = test.options.find(o => o.value === value);
      if (option) {
        if (test.category === "mobility" || test.category === "stability") {
          mobilityTotal += option.score;
          mobilityCount++;
        } else if (test.category === "strength" || test.category === "power") {
          strengthTotal += option.score;
          strengthCount++;
        }
      }
    }
  });

  const mobilityScore = mobilityCount > 0 ? Math.round((mobilityTotal / (mobilityCount * 3)) * 10) : 5;
  const strengthScore = strengthCount > 0 ? Math.round((strengthTotal / (strengthCount * 3.5)) * 10) : 5;
  
  // Determine readiness level
  const avgScore = (mobilityScore + strengthScore) / 2;
  let readinessLevel: "rehabilitation" | "beginner" | "general" | "athletic";
  
  if (avgScore <= 3 || assessment.balanceIssues || assessment.dizzinessWithMovement) {
    readinessLevel = "rehabilitation";
  } else if (avgScore <= 5) {
    readinessLevel = "beginner";
  } else if (avgScore <= 7) {
    readinessLevel = "general";
  } else {
    readinessLevel = "athletic";
  }

  return { mobilityScore, strengthScore, readinessLevel };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CapabilityAssessmentProps {
  initialData?: Partial<CapabilityAssessment>;
  onComplete: (assessment: CapabilityAssessment) => void;
  onBack?: () => void;
  showProgress?: boolean;
}

export function CapabilityAssessmentComponent({
  initialData,
  onComplete,
  onBack,
  showProgress = true,
}: CapabilityAssessmentProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [assessment, setAssessment] = useState<CapabilityAssessment>({
    balanceIssues: false,
    dizzinessWithMovement: false,
    ...initialData,
  });
  const [saving, setSaving] = useState(false);

  const categories = [
    { id: "mobility", label: "Mobility", tests: MOVEMENT_TESTS.filter(t => t.category === "mobility") },
    { id: "stability", label: "Stability", tests: MOVEMENT_TESTS.filter(t => t.category === "stability") },
    { id: "power", label: "Power", tests: MOVEMENT_TESTS.filter(t => t.category === "power") },
    { id: "strength", label: "Strength", tests: MOVEMENT_TESTS.filter(t => t.category === "strength") },
    { id: "special", label: "Final Questions", tests: [] },
  ];

  const totalSteps = categories.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const updateAssessment = <K extends keyof CapabilityAssessment>(
    key: K,
    value: CapabilityAssessment[K]
  ) => {
    setAssessment(prev => ({ ...prev, [key]: value }));
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const { mobilityScore, strengthScore, readinessLevel } = calculateScores(assessment);
      const finalAssessment: CapabilityAssessment = {
        ...assessment,
        overallMobilityScore: mobilityScore,
        overallStrengthScore: strengthScore,
        readinessLevel,
      };
      await onComplete(finalAssessment);
    } finally {
      setSaving(false);
    }
  };

  const currentCategory = categories[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-brand" />
          <h2 className="text-xl font-bold">Physical Capability Assessment</h2>
        </div>
        <p className="text-muted-foreground">
          Help us understand your current fitness level so we can create safe, effective workouts.
        </p>
      </div>

      {/* Progress */}
      {showProgress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{currentCategory.label}</span>
            <span className="text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex gap-1 justify-center">
            {categories.map((cat, idx) => (
              <button
                key={cat.id}
                onClick={() => setCurrentStep(idx)}
                className={cn(
                  "h-2 w-8 rounded-full transition-colors",
                  idx <= currentStep ? "bg-brand" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Test Content */}
      <div className="min-h-[400px]">
        {currentCategory.id !== "special" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="text-sm">
                {currentCategory.label} Tests
              </Badge>
              <span className="text-sm text-muted-foreground">
                ({currentCategory.tests.length} questions)
              </span>
            </div>

            {currentCategory.tests.map((test) => (
              <TestCard
                key={test.id}
                test={test}
                value={assessment[test.id] as string | undefined}
                onChange={(value) => updateAssessment(test.id, value as CapabilityAssessment[typeof test.id])}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="text-sm">
                Final Questions
              </Badge>
            </div>

            {/* Special Considerations */}
            {SPECIAL_CONSIDERATIONS.map((item) => (
              <Card key={item.id} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={assessment[item.id]}
                      onCheckedChange={(v) => updateAssessment(item.id, v)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Cardio Notes */}
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>❤️</span>
                  Cardio Limitations (Optional)
                </CardTitle>
                <CardDescription>
                  Any heart, breathing, or endurance issues we should know about?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={assessment.cardioLimitationsNotes || ""}
                  onChange={(e) => updateAssessment("cardioLimitationsNotes", e.target.value)}
                  placeholder="E.g., 'Asthma - use inhaler before intense cardio', 'High blood pressure - doctor said avoid max efforts'"
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Summary Preview */}
            <Card className="border-2 border-brand/30 bg-brand/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-brand" />
                  Your Assessment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AssessmentSummary assessment={assessment} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => {
            if (currentStep === 0 && onBack) {
              onBack();
            } else {
              setCurrentStep(Math.max(0, currentStep - 1));
            }
          }}
          className="flex-1"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {currentStep === 0 ? "Back" : "Previous"}
        </Button>

        {isLastStep ? (
          <Button onClick={handleComplete} disabled={saving} className="flex-1">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Complete Assessment
          </Button>
        ) : (
          <Button onClick={() => setCurrentStep(currentStep + 1)} className="flex-1">
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TEST CARD
// ============================================================================

function TestCard({
  test,
  value,
  onChange,
}: {
  test: MovementTest;
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Card className={cn("border-2 transition-colors", value ? "border-brand/30" : "border-border")}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{test.illustration}</span>
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {test.title}
              {value && <CheckCircle2 className="h-4 w-4 text-brand" />}
            </CardTitle>
            <CardDescription>{test.description}</CardDescription>
            {test.tip && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                <Info className="h-3 w-3" />
                {test.tip}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {test.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "p-3 rounded-lg border text-left transition-all",
                value === option.value
                  ? "border-brand bg-brand/10 ring-1 ring-brand"
                  : "border-border hover:border-brand/50"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{option.icon}</span>
                <span className="font-medium text-sm">{option.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ASSESSMENT SUMMARY
// ============================================================================

function AssessmentSummary({ assessment }: { assessment: CapabilityAssessment }) {
  const { mobilityScore, strengthScore, readinessLevel } = calculateScores(assessment);

  const readinessInfo = {
    rehabilitation: {
      label: "Rehabilitation Focus",
      description: "We'll focus on gentle, recovery-focused movements",
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    beginner: {
      label: "Beginner",
      description: "Building foundations with progressive exercises",
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    general: {
      label: "General Fitness",
      description: "Ready for standard workout programming",
      color: "text-brand",
      bgColor: "bg-brand/10",
    },
    athletic: {
      label: "Athletic",
      description: "Ready for challenging, performance-focused training",
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
  };

  const info = readinessInfo[readinessLevel];

  return (
    <div className="space-y-4">
      {/* Readiness Level */}
      <div className={cn("p-4 rounded-lg", info.bgColor)}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className={cn("h-5 w-5", info.color)} />
          <span className={cn("font-semibold", info.color)}>{info.label}</span>
        </div>
        <p className="text-sm text-muted-foreground">{info.description}</p>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Mobility</span>
            <span className="text-sm text-muted-foreground">{mobilityScore}/10</span>
          </div>
          <Progress value={mobilityScore * 10} className="h-2" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Strength</span>
            <span className="text-sm text-muted-foreground">{strengthScore}/10</span>
          </div>
          <Progress value={strengthScore * 10} className="h-2" />
        </div>
      </div>

      {/* Warnings */}
      {(assessment.balanceIssues || assessment.dizzinessWithMovement) && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-yellow-800 dark:text-yellow-200">Safety Note</p>
            <p className="text-yellow-700 dark:text-yellow-300">
              {assessment.balanceIssues && "Balance issues noted. "}
              {assessment.dizzinessWithMovement && "Dizziness with movement. "}
              We&apos;ll ensure workouts include extra stability support.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPACT DISPLAY COMPONENT (for profile views)
// ============================================================================

export function CapabilityDisplay({
  assessment,
  showDetails = false,
}: {
  assessment: CapabilityAssessment;
  showDetails?: boolean;
}) {
  const { mobilityScore, strengthScore, readinessLevel } = calculateScores(assessment);

  const readinessLabels = {
    rehabilitation: "Rehab Focus",
    beginner: "Beginner",
    general: "General Fitness",
    athletic: "Athletic",
  };

  return (
    <div className="space-y-3">
      {/* Summary Row */}
      <div className="flex items-center gap-4">
        <Badge variant="outline" className="text-sm">
          {readinessLabels[readinessLevel]}
        </Badge>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Mobility:</span>
          <span className="font-medium">{mobilityScore}/10</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Strength:</span>
          <span className="font-medium">{strengthScore}/10</span>
        </div>
      </div>

      {/* Detailed View */}
      {showDetails && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {MOVEMENT_TESTS.slice(0, 6).map((test) => {
            const value = assessment[test.id];
            if (!value) return null;
            const option = test.options.find(o => o.value === value);
            return (
              <div key={test.id} className="flex items-center gap-1">
                <span>{option?.icon}</span>
                <span className="text-muted-foreground">{test.title}:</span>
                <span>{option?.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CapabilityAssessmentComponent;
