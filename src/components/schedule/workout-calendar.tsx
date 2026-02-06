"use client";

/**
 * Workout Calendar Component
 * 
 * A drag-and-drop calendar for visualizing and managing scheduled workouts.
 * Supports:
 * - Week/Month views
 * - Drag and drop to reschedule
 * - Click to view workout details
 * - Visual status indicators (scheduled, completed, missed, skipped)
 */

import { useState, useMemo, useCallback } from "react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isPast, isFuture, addWeeks, subWeeks, startOfMonth, endOfMonth, isSameMonth, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, List, Clock, CheckCircle, XCircle, AlertCircle, GripVertical, MoreHorizontal, Play, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Types
interface ScheduledWorkout {
  id: string;
  scheduledDate: string;
  scheduledTime?: string | null;
  status: "scheduled" | "completed" | "missed" | "skipped" | "rescheduled";
  originalDate?: string | null;
  rescheduledCount?: number;
  notes?: string | null;
  programWorkout: {
    id: string;
    name: string;
    focus: string;
    weekNumber: number;
    dayNumber: number;
    estimatedDuration: number;
  };
  program?: {
    id: string;
    name: string;
    category: string;
  };
}

interface WorkoutCalendarProps {
  workouts: ScheduledWorkout[];
  onReschedule?: (workoutId: string, newDate: string) => void;
  onSkip?: (workoutId: string, reason?: string) => void;
  onComplete?: (workoutId: string) => void;
  onWorkoutClick?: (workout: ScheduledWorkout) => void;
  onStartWorkout?: (workout: ScheduledWorkout) => void;
  view?: "week" | "month";
  showViewToggle?: boolean;
  preferredDays?: number[];
}

// Status colors and icons
const statusConfig = {
  scheduled: {
    color: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
    textColor: "text-blue-700 dark:text-blue-300",
    icon: Clock,
    label: "Scheduled",
  },
  completed: {
    color: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
    textColor: "text-green-700 dark:text-green-300",
    icon: CheckCircle,
    label: "Completed",
  },
  missed: {
    color: "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700",
    textColor: "text-red-700 dark:text-red-300",
    icon: AlertCircle,
    label: "Missed",
  },
  skipped: {
    color: "bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600",
    textColor: "text-gray-500 dark:text-gray-400",
    icon: XCircle,
    label: "Skipped",
  },
  rescheduled: {
    color: "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700",
    textColor: "text-amber-700 dark:text-amber-300",
    icon: Clock,
    label: "Rescheduled",
  },
};

// Workout Card Component
function WorkoutCard({
  workout,
  onReschedule,
  onSkip,
  onComplete,
  onClick,
  onStartWorkout,
  isDragging,
  compact = false,
}: {
  workout: ScheduledWorkout;
  onReschedule?: (workoutId: string, newDate: string) => void;
  onSkip?: (workoutId: string, reason?: string) => void;
  onComplete?: (workoutId: string) => void;
  onClick?: () => void;
  onStartWorkout?: () => void;
  isDragging?: boolean;
  compact?: boolean;
}) {
  const config = statusConfig[workout.status];
  const StatusIcon = config.icon;
  const canStart = workout.status === "scheduled" && isToday(new Date(workout.scheduledDate));
  const canReschedule = workout.status === "scheduled" || workout.status === "missed";

  return (
    <div
      draggable={canReschedule}
      onDragStart={(e) => {
        e.dataTransfer.setData("workoutId", workout.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onClick}
      className={cn(
        "group rounded-lg border p-2 transition-all cursor-pointer",
        config.color,
        isDragging && "opacity-50 scale-95",
        "hover:shadow-md active:scale-[0.98]"
      )}
    >
      <div className="flex items-start gap-2">
        {canReschedule && (
          <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <StatusIcon className={cn("h-3.5 w-3.5", config.textColor)} />
            <span className={cn("font-medium text-sm truncate", config.textColor)}>
              {workout.programWorkout.name}
            </span>
          </div>
          
          {!compact && (
            <>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {workout.programWorkout.focus}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {workout.programWorkout.estimatedDuration}min
                </Badge>
                {workout.rescheduledCount && workout.rescheduledCount > 0 && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                    Rescheduled {workout.rescheduledCount}x
                  </Badge>
                )}
              </div>
            </>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canStart && onStartWorkout && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStartWorkout(); }}>
                <Play className="h-4 w-4 mr-2" />
                Start Workout
              </DropdownMenuItem>
            )}
            {workout.status === "scheduled" && onComplete && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onComplete(workout.id); }}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Complete
              </DropdownMenuItem>
            )}
            {canReschedule && onSkip && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSkip(workout.id); }}>
                <SkipForward className="h-4 w-4 mr-2" />
                Skip Workout
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Day Cell Component
function DayCell({
  date,
  workouts,
  isPreferredDay,
  onDrop,
  onReschedule,
  onSkip,
  onComplete,
  onWorkoutClick,
  onStartWorkout,
}: {
  date: Date;
  workouts: ScheduledWorkout[];
  isPreferredDay: boolean;
  onDrop?: (workoutId: string, date: string) => void;
  onReschedule?: (workoutId: string, newDate: string) => void;
  onSkip?: (workoutId: string, reason?: string) => void;
  onComplete?: (workoutId: string) => void;
  onWorkoutClick?: (workout: ScheduledWorkout) => void;
  onStartWorkout?: (workout: ScheduledWorkout) => void;
}) {
  const [isDropTarget, setIsDropTarget] = useState(false);
  const dateStr = format(date, "yyyy-MM-dd");
  const isCurrentDay = isToday(date);
  const isPastDay = isPast(date) && !isCurrentDay;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDropTarget(true);
  };

  const handleDragLeave = () => {
    setIsDropTarget(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTarget(false);
    const workoutId = e.dataTransfer.getData("workoutId");
    if (workoutId && onDrop) {
      onDrop(workoutId, dateStr);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "min-h-[120px] p-2 border-r border-b transition-colors",
        isCurrentDay && "bg-blue-50/50 dark:bg-blue-950/20",
        isPastDay && "bg-gray-50/50 dark:bg-gray-900/20",
        isDropTarget && "bg-blue-100/50 dark:bg-blue-900/30 ring-2 ring-blue-400 ring-inset",
        !isPreferredDay && "bg-gray-50/30 dark:bg-gray-900/10"
      )}
    >
      {/* Date Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-sm font-medium",
              isCurrentDay && "text-blue-600 dark:text-blue-400",
              isPastDay && "text-muted-foreground"
            )}
          >
            {format(date, "d")}
          </span>
          {isCurrentDay && (
            <Badge variant="default" className="text-[10px] h-4 px-1.5 bg-blue-500">
              Today
            </Badge>
          )}
        </div>
        {isPreferredDay && (
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Preferred workout day" />
        )}
      </div>

      {/* Workouts */}
      <div className="space-y-1.5">
        {workouts.map((workout) => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            onReschedule={onReschedule}
            onSkip={onSkip}
            onComplete={onComplete}
            onClick={() => onWorkoutClick?.(workout)}
            onStartWorkout={() => onStartWorkout?.(workout)}
            compact={workouts.length > 1}
          />
        ))}
      </div>

      {/* Empty state for preferred days */}
      {workouts.length === 0 && isPreferredDay && !isPastDay && (
        <div className="text-xs text-muted-foreground italic">
          Rest day
        </div>
      )}
    </div>
  );
}

// Main Calendar Component
export function WorkoutCalendar({
  workouts,
  onReschedule,
  onSkip,
  onComplete,
  onWorkoutClick,
  onStartWorkout,
  view: initialView = "week",
  showViewToggle = true,
  preferredDays = [1, 3, 5],
}: WorkoutCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState(initialView);

  // Group workouts by date
  const workoutsByDate = useMemo(() => {
    const map = new Map<string, ScheduledWorkout[]>();
    workouts.forEach((workout) => {
      const date = workout.scheduledDate;
      if (!map.has(date)) {
        map.set(date, []);
      }
      map.get(date)!.push(workout);
    });
    return map;
  }, [workouts]);

  // Get days to display based on view
  const displayDays = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, view]);

  // Navigation
  const goToPrevious = useCallback(() => {
    if (view === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  }, [currentDate, view]);

  const goToNext = useCallback(() => {
    if (view === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  }, [currentDate, view]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Handle drop (reschedule)
  const handleDrop = useCallback(
    (workoutId: string, newDate: string) => {
      if (onReschedule) {
        onReschedule(workoutId, newDate);
      }
    },
    [onReschedule]
  );

  // Stats
  const stats = useMemo(() => {
    return {
      total: workouts.length,
      scheduled: workouts.filter((w) => w.status === "scheduled").length,
      completed: workouts.filter((w) => w.status === "completed").length,
      missed: workouts.filter((w) => w.status === "missed").length,
    };
  }, [workouts]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={goToPrevious} aria-label="Previous week">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={goToNext} aria-label="Next week">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Current period */}
            <CardTitle className="text-lg font-semibold">
              {view === "week"
                ? `${format(displayDays[0], "MMM d")} - ${format(displayDays[6], "MMM d, yyyy")}`
                : format(currentDate, "MMMM yyyy")}
            </CardTitle>
          </div>

          <div className="flex items-center gap-4">
            {/* Stats */}
            <div className="hidden md:flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{stats.scheduled}</span> scheduled
              </span>
              <span className="text-green-600 dark:text-green-400">
                <span className="font-medium">{stats.completed}</span> done
              </span>
              {stats.missed > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  <span className="font-medium">{stats.missed}</span> missed
                </span>
              )}
            </div>

            {/* View Toggle */}
            {showViewToggle && (
              <div className="flex items-center border rounded-lg p-0.5">
                <Button
                  variant={view === "week" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setView("week")}
                  className="h-7 px-2"
                >
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  Week
                </Button>
                <Button
                  variant={view === "month" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setView("month")}
                  className="h-7 px-2"
                >
                  <List className="h-3.5 w-3.5 mr-1" />
                  Month
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
            <div
              key={day}
              className={cn(
                "p-2 text-center text-sm font-medium border-r last:border-r-0",
                preferredDays.includes(i) && "text-green-600 dark:text-green-400"
              )}
            >
              {day}
              {preferredDays.includes(i) && (
                <span className="ml-1 text-[10px]">●</span>
              )}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className={cn("grid grid-cols-7", view === "month" && "divide-y")}>
          {displayDays.map((date) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const dayWorkouts = workoutsByDate.get(dateStr) || [];
            const isPreferred = preferredDays.includes(date.getDay());
            const isCurrentMonth = view === "month" ? isSameMonth(date, currentDate) : true;

            return (
              <div
                key={dateStr}
                className={cn(!isCurrentMonth && "opacity-40")}
              >
                <DayCell
                  date={date}
                  workouts={dayWorkouts}
                  isPreferredDay={isPreferred}
                  onDrop={handleDrop}
                  onReschedule={onReschedule}
                  onSkip={onSkip}
                  onComplete={onComplete}
                  onWorkoutClick={onWorkoutClick}
                  onStartWorkout={onStartWorkout}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default WorkoutCalendar;
