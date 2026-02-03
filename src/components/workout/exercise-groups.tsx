"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  RotateCw,
  Layers,
  Link2,
  Repeat,
  Zap,
  CheckCircle,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export type GroupType = "superset" | "triset" | "circuit" | "giant_set" | "drop_set";

export interface GroupedExercise {
  id: string;
  name: string;
  sets?: number;
  reps?: string;
  duration?: number; // seconds
  weight?: string;
  notes?: string;
  completed?: boolean;
}

export interface ExerciseGroupProps {
  groupId: string;
  groupName?: string;
  exercises: GroupedExercise[];
  restBetweenExercises?: number; // seconds
  restAfterGroup?: number; // seconds
  rounds?: number;
  currentRound?: number;
  onExerciseComplete?: (exerciseId: string) => void;
  onGroupComplete?: () => void;
  onRoundComplete?: (round: number) => void;
  className?: string;
}

// ============================================================================
// GROUP HEADER
// ============================================================================

interface GroupHeaderProps {
  groupType: GroupType;
  groupName?: string;
  exerciseCount: number;
  currentRound?: number;
  totalRounds?: number;
  isExpanded: boolean;
  isCompleted?: boolean;
  onToggleExpand: () => void;
  className?: string;
}

const groupTypeConfig: Record<GroupType, {
  icon: typeof Layers;
  label: string;
  description: string;
  bgColor: string;
  borderColor: string;
  badgeColor: string;
}> = {
  superset: {
    icon: Link2,
    label: "Superset",
    description: "Back-to-back exercises",
    bgColor: "bg-amber-500/5",
    borderColor: "border-amber-500/20",
    badgeColor: "bg-amber-500 text-black",
  },
  triset: {
    icon: Layers,
    label: "Tri-set",
    description: "3 exercises back-to-back",
    bgColor: "bg-orange-500/5",
    borderColor: "border-orange-500/20",
    badgeColor: "bg-orange-500 text-white",
  },
  circuit: {
    icon: Repeat,
    label: "Circuit",
    description: "Multiple rounds",
    bgColor: "bg-emerald-500/5",
    borderColor: "border-emerald-500/20",
    badgeColor: "bg-emerald-500 text-white",
  },
  giant_set: {
    icon: Zap,
    label: "Giant Set",
    description: "4+ exercises targeting same muscle",
    bgColor: "bg-purple-500/5",
    borderColor: "border-purple-500/20",
    badgeColor: "bg-purple-500 text-white",
  },
  drop_set: {
    icon: RotateCw,
    label: "Drop Set",
    description: "Decreasing weight",
    bgColor: "bg-red-500/5",
    borderColor: "border-red-500/20",
    badgeColor: "bg-red-500 text-white",
  },
};

export function GroupHeader({
  groupType,
  groupName,
  exerciseCount,
  currentRound,
  totalRounds,
  isExpanded,
  isCompleted,
  onToggleExpand,
  className,
}: GroupHeaderProps) {
  const config = groupTypeConfig[groupType];
  const Icon = config.icon;

  return (
    <button
      onClick={onToggleExpand}
      className={cn(
        "w-full flex items-center justify-between p-3 rounded-t-lg transition-colors",
        "hover:bg-white/5 active:scale-[0.995]",
        "touch-target",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          config.bgColor,
          isCompleted && "bg-success/20"
        )}>
          {isCompleted ? (
            <CheckCircle className="h-5 w-5 text-success" />
          ) : (
            <Icon className="h-5 w-5 text-brand" />
          )}
        </div>
        <div className="text-left">
          <div className="flex items-center gap-2">
            <Badge className={cn(config.badgeColor, "text-xs")}>
              {config.label}
            </Badge>
            {groupName && (
              <span className="text-sm font-medium text-foreground">
                {groupName}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {exerciseCount} exercises
            {totalRounds && totalRounds > 1 && (
              <span className="ml-1">
                - Round {currentRound || 1}/{totalRounds}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isCompleted && (
          <Badge variant="outline" className="text-success border-success/30 text-xs">
            Complete
          </Badge>
        )}
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    </button>
  );
}

// ============================================================================
// GROUP CONNECTOR - Visual line/bracket connecting exercises
// ============================================================================

interface GroupConnectorProps {
  exerciseCount: number;
  variant?: "line" | "bracket" | "dots";
  color?: string;
  className?: string;
}

export function GroupConnector({
  exerciseCount,
  variant = "dots",
  color = "brand",
  className,
}: GroupConnectorProps) {
  const colorClasses = {
    brand: "bg-brand",
    amber: "bg-amber-500",
    orange: "bg-orange-500",
    emerald: "bg-emerald-500",
    purple: "bg-purple-500",
  };

  const bgClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.brand;

  if (variant === "bracket") {
    return (
      <div className={cn("flex flex-col items-center py-2", className)}>
        <div className={cn("w-0.5 h-full rounded-full", bgClass, "opacity-30")} />
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-2 border-l-2 border-t-2 border-b-2 rounded-l-lg",
          `border-${color}`,
          "opacity-30"
        )} />
      </div>
    );
  }

  if (variant === "line") {
    return (
      <div className={cn("w-0.5 rounded-full mx-auto", bgClass, "opacity-40", className)} />
    );
  }

  // Default: dots variant
  return (
    <div className={cn("flex flex-col items-center gap-1 py-1", className)}>
      {Array.from({ length: Math.min(exerciseCount - 1, 3) }).map((_, i) => (
        <div
          key={i}
          className={cn("w-1.5 h-1.5 rounded-full", bgClass, "opacity-50")}
        />
      ))}
      <div className={cn("w-0.5 flex-1 min-h-2", bgClass, "opacity-30")} />
    </div>
  );
}

// ============================================================================
// EXERCISE ITEM (within a group)
// ============================================================================

interface GroupExerciseItemProps {
  exercise: GroupedExercise;
  label: string; // e.g., "A1", "A2", "1", "2"
  isLast?: boolean;
  isCompleted?: boolean;
  onComplete?: () => void;
  className?: string;
}

function GroupExerciseItem({
  exercise,
  label,
  isLast,
  isCompleted,
  onComplete,
  className,
}: GroupExerciseItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={cn(
        "flex items-center gap-3 py-3 px-4",
        !isLast && "border-b border-border/50",
        isCompleted && "opacity-60",
        className
      )}
    >
      {/* Label Badge */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
        isCompleted ? "bg-success/20 text-success" : "bg-brand/20 text-brand"
      )}>
        {isCompleted ? <CheckCircle className="h-4 w-4" /> : label}
      </div>

      {/* Exercise Info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-sm truncate",
          isCompleted && "line-through"
        )}>
          {exercise.name}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {exercise.sets && exercise.reps && (
            <span>{exercise.sets} x {exercise.reps}</span>
          )}
          {exercise.duration && (
            <span className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {exercise.duration}s
            </span>
          )}
          {exercise.weight && (
            <span>{exercise.weight}</span>
          )}
        </div>
      </div>

      {/* Complete Button */}
      {onComplete && (
        <Button
          variant={isCompleted ? "ghost" : "outline"}
          size="sm"
          onClick={onComplete}
          className={cn(
            "touch-target h-10 w-10 p-0",
            isCompleted && "text-success"
          )}
        >
          <CheckCircle className="h-5 w-5" />
        </Button>
      )}
    </motion.div>
  );
}

// ============================================================================
// REST INDICATOR
// ============================================================================

interface RestIndicatorProps {
  seconds: number;
  label?: string;
  className?: string;
}

function RestIndicator({ seconds, label = "Rest", className }: RestIndicatorProps) {
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    return `${secs}s`;
  };

  return (
    <div className={cn(
      "flex items-center justify-center gap-2 py-2 px-4 bg-muted/30 text-muted-foreground text-xs",
      className
    )}>
      <Timer className="h-3 w-3" />
      <span>{label}: {formatTime(seconds)}</span>
    </div>
  );
}

// ============================================================================
// SUPERSET GROUP
// ============================================================================

export function SupersetGroup({
  groupId: _groupId,
  groupName,
  exercises,
  restAfterGroup = 60,
  onExerciseComplete,
  onGroupComplete,
  className,
}: ExerciseGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

  const handleExerciseComplete = (exerciseId: string) => {
    const newCompleted = new Set(completedExercises);
    if (newCompleted.has(exerciseId)) {
      newCompleted.delete(exerciseId);
    } else {
      newCompleted.add(exerciseId);
    }
    setCompletedExercises(newCompleted);
    onExerciseComplete?.(exerciseId);

    if (newCompleted.size === exercises.length) {
      onGroupComplete?.();
    }
  };

  const isGroupComplete = completedExercises.size === exercises.length;
  const config = groupTypeConfig.superset;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className={cn(
        "overflow-hidden transition-all",
        config.bgColor,
        config.borderColor,
        "border-l-4",
        isGroupComplete && "border-l-success"
      )}>
        <GroupHeader
          groupType="superset"
          groupName={groupName}
          exerciseCount={exercises.length}
          isExpanded={isExpanded}
          isCompleted={isGroupComplete}
          onToggleExpand={() => setIsExpanded(!isExpanded)}
        />

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="p-0">
                <div className="flex">
                  {/* Connector */}
                  <div className="w-8 flex justify-center py-2">
                    <GroupConnector
                      exerciseCount={exercises.length}
                      variant="dots"
                      color="amber"
                    />
                  </div>

                  {/* Exercises */}
                  <div className="flex-1">
                    {exercises.map((exercise, index) => (
                      <GroupExerciseItem
                        key={exercise.id}
                        exercise={exercise}
                        label={`A${index + 1}`}
                        isLast={index === exercises.length - 1}
                        isCompleted={completedExercises.has(exercise.id)}
                        onComplete={() => handleExerciseComplete(exercise.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Rest After Group */}
                {restAfterGroup > 0 && (
                  <RestIndicator
                    seconds={restAfterGroup}
                    label="Rest after superset"
                  />
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completion Celebration */}
        <AnimatePresence>
          {isGroupComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
            >
              <div className="absolute inset-0 bg-success/5 animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// TRISET GROUP
// ============================================================================

export function TrisetGroup({
  groupId: _groupId,
  groupName,
  exercises,
  restAfterGroup = 90,
  onExerciseComplete,
  onGroupComplete,
  className,
}: ExerciseGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

  const handleExerciseComplete = (exerciseId: string) => {
    const newCompleted = new Set(completedExercises);
    if (newCompleted.has(exerciseId)) {
      newCompleted.delete(exerciseId);
    } else {
      newCompleted.add(exerciseId);
    }
    setCompletedExercises(newCompleted);
    onExerciseComplete?.(exerciseId);

    if (newCompleted.size === exercises.length) {
      onGroupComplete?.();
    }
  };

  const isGroupComplete = completedExercises.size === exercises.length;
  const config = groupTypeConfig.triset;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className={cn(
        "overflow-hidden transition-all",
        config.bgColor,
        config.borderColor,
        "border-l-4",
        isGroupComplete && "border-l-success"
      )}>
        <GroupHeader
          groupType="triset"
          groupName={groupName}
          exerciseCount={exercises.length}
          isExpanded={isExpanded}
          isCompleted={isGroupComplete}
          onToggleExpand={() => setIsExpanded(!isExpanded)}
        />

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="p-0">
                <div className="flex">
                  <div className="w-8 flex justify-center py-2">
                    <GroupConnector
                      exerciseCount={exercises.length}
                      variant="dots"
                      color="orange"
                    />
                  </div>

                  <div className="flex-1">
                    {exercises.map((exercise, index) => (
                      <GroupExerciseItem
                        key={exercise.id}
                        exercise={exercise}
                        label={`A${index + 1}`}
                        isLast={index === exercises.length - 1}
                        isCompleted={completedExercises.has(exercise.id)}
                        onComplete={() => handleExerciseComplete(exercise.id)}
                      />
                    ))}
                  </div>
                </div>

                {restAfterGroup > 0 && (
                  <RestIndicator
                    seconds={restAfterGroup}
                    label="Rest after tri-set"
                  />
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// CIRCUIT GROUP
// ============================================================================

export function CircuitGroup({
  groupId: _groupId,
  groupName,
  exercises,
  rounds = 3,
  currentRound: initialRound = 1,
  restBetweenExercises: _restBetweenExercises = 0,
  restAfterGroup = 120,
  onExerciseComplete,
  onGroupComplete,
  onRoundComplete,
  className,
}: ExerciseGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentRound, setCurrentRound] = useState(initialRound);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [completedRounds, setCompletedRounds] = useState<number[]>([]);

  const handleExerciseComplete = (exerciseId: string) => {
    const newCompleted = new Set(completedExercises);
    if (newCompleted.has(exerciseId)) {
      newCompleted.delete(exerciseId);
    } else {
      newCompleted.add(exerciseId);
    }
    setCompletedExercises(newCompleted);
    onExerciseComplete?.(exerciseId);

    // Check if round is complete
    if (newCompleted.size === exercises.length) {
      if (currentRound < rounds) {
        // Move to next round
        setCompletedRounds([...completedRounds, currentRound]);
        setCurrentRound(currentRound + 1);
        setCompletedExercises(new Set());
        onRoundComplete?.(currentRound);
      } else {
        // Circuit complete
        setCompletedRounds([...completedRounds, currentRound]);
        onGroupComplete?.();
      }
    }
  };

  const isGroupComplete = completedRounds.length === rounds;
  const config = groupTypeConfig.circuit;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className={cn(
        "overflow-hidden transition-all relative",
        config.bgColor,
        config.borderColor,
        "border-l-4",
        isGroupComplete && "border-l-success"
      )}>
        <GroupHeader
          groupType="circuit"
          groupName={groupName}
          exerciseCount={exercises.length}
          currentRound={currentRound}
          totalRounds={rounds}
          isExpanded={isExpanded}
          isCompleted={isGroupComplete}
          onToggleExpand={() => setIsExpanded(!isExpanded)}
        />

        {/* Round Progress Indicator */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-1">
            {Array.from({ length: rounds }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-colors",
                  completedRounds.includes(i + 1)
                    ? "bg-success"
                    : i + 1 === currentRound
                      ? "bg-brand"
                      : "bg-muted"
                )}
              />
            ))}
          </div>
          <p className="text-xs text-center text-muted-foreground mt-1">
            Repeat {rounds} rounds
          </p>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="p-0">
                <div className="flex">
                  <div className="w-8 flex justify-center py-2">
                    <GroupConnector
                      exerciseCount={exercises.length}
                      variant="line"
                      color="emerald"
                    />
                  </div>

                  <div className="flex-1">
                    {exercises.map((exercise, index) => (
                      <GroupExerciseItem
                        key={exercise.id}
                        exercise={exercise}
                        label={`${index + 1}`}
                        isLast={index === exercises.length - 1}
                        isCompleted={completedExercises.has(exercise.id)}
                        onComplete={() => handleExerciseComplete(exercise.id)}
                      />
                    ))}
                  </div>
                </div>

                {restAfterGroup > 0 && currentRound < rounds && (
                  <RestIndicator
                    seconds={restAfterGroup}
                    label="Rest between rounds"
                  />
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Round Complete Animation */}
        <AnimatePresence>
          {completedRounds.length > 0 && completedRounds.length < rounds && (
            <motion.div
              key={completedRounds.length}
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 pointer-events-none flex items-center justify-center"
            >
              <div className="text-4xl font-bold text-success">
                Round {completedRounds.length} Complete!
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// GIANT SET GROUP
// ============================================================================

export function GiantSetGroup({
  groupId: _groupId,
  groupName,
  exercises,
  restAfterGroup = 120,
  onExerciseComplete,
  onGroupComplete,
  className,
}: ExerciseGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

  const handleExerciseComplete = (exerciseId: string) => {
    const newCompleted = new Set(completedExercises);
    if (newCompleted.has(exerciseId)) {
      newCompleted.delete(exerciseId);
    } else {
      newCompleted.add(exerciseId);
    }
    setCompletedExercises(newCompleted);
    onExerciseComplete?.(exerciseId);

    if (newCompleted.size === exercises.length) {
      onGroupComplete?.();
    }
  };

  const isGroupComplete = completedExercises.size === exercises.length;
  const config = groupTypeConfig.giant_set;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className={cn(
        "overflow-hidden transition-all",
        config.bgColor,
        config.borderColor,
        "border-l-4",
        isGroupComplete && "border-l-success"
      )}>
        <GroupHeader
          groupType="giant_set"
          groupName={groupName}
          exerciseCount={exercises.length}
          isExpanded={isExpanded}
          isCompleted={isGroupComplete}
          onToggleExpand={() => setIsExpanded(!isExpanded)}
        />

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="p-0">
                <div className="flex">
                  <div className="w-8 flex justify-center py-2">
                    <GroupConnector
                      exerciseCount={exercises.length}
                      variant="dots"
                      color="purple"
                    />
                  </div>

                  <div className="flex-1">
                    {exercises.map((exercise, index) => (
                      <GroupExerciseItem
                        key={exercise.id}
                        exercise={exercise}
                        label={`${index + 1}`}
                        isLast={index === exercises.length - 1}
                        isCompleted={completedExercises.has(exercise.id)}
                        onComplete={() => handleExerciseComplete(exercise.id)}
                      />
                    ))}
                  </div>
                </div>

                {restAfterGroup > 0 && (
                  <RestIndicator
                    seconds={restAfterGroup}
                    label="Rest after giant set"
                  />
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completion Pulse Effect */}
        <AnimatePresence>
          {isGroupComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.3, 0],
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 0.6,
                repeat: 2,
              }}
              className="absolute inset-0 pointer-events-none bg-success rounded-xl"
            />
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// GENERIC EXERCISE GROUP WRAPPER
// ============================================================================

interface ExerciseGroupWrapperProps extends ExerciseGroupProps {
  groupType: GroupType;
}

export function ExerciseGroup({ groupType, ...props }: ExerciseGroupWrapperProps) {
  switch (groupType) {
    case "superset":
      return <SupersetGroup {...props} />;
    case "triset":
      return <TrisetGroup {...props} />;
    case "circuit":
      return <CircuitGroup {...props} />;
    case "giant_set":
      return <GiantSetGroup {...props} />;
    default:
      return <SupersetGroup {...props} />;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  GroupHeaderProps,
  GroupConnectorProps,
  GroupExerciseItemProps,
  RestIndicatorProps,
  ExerciseGroupWrapperProps,
};
