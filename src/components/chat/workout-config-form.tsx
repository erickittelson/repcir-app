"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Dumbbell,
  Timer,
  Repeat,
  Flame,
  Zap,
  RotateCcw,
  Shuffle,
  Waves,
  Users,
  User,
  UserCheck,
  MapPin,
  Target,
  Loader2,
  Search,
  X,
  Plus,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkoutConfigData } from "@/lib/ai/structured-chat";
import type {
  WorkoutConfigFormData,
  WorkoutType,
  WorkoutIntensity,
  WorkoutStructureSection,
  TargetType,
  MemberContextForForm,
} from "@/lib/types/workout-config";

// Workout type options
const WORKOUT_TYPES: Array<{
  value: WorkoutType;
  label: string;
  icon: typeof Dumbbell;
  description: string;
}> = [
  { value: "standard", label: "Standard", icon: Dumbbell, description: "Sets & reps" },
  { value: "emom", label: "EMOM", icon: Timer, description: "Every minute" },
  { value: "amrap", label: "AMRAP", icon: Repeat, description: "Max rounds" },
  { value: "for_time", label: "For Time", icon: Flame, description: "Race the clock" },
  { value: "tabata", label: "Tabata", icon: Zap, description: "20s on / 10s off" },
  { value: "superset", label: "Superset", icon: Shuffle, description: "Paired exercises" },
  { value: "circuit", label: "Circuit", icon: RotateCcw, description: "Station rotation" },
  { value: "intervals", label: "Intervals", icon: Waves, description: "Work / rest" },
];

const DURATION_PRESETS = [15, 30, 45, 60, 90];

const INTENSITY_OPTIONS: Array<{
  value: WorkoutIntensity;
  label: string;
  color: string;
}> = [
  { value: "light", label: "Light", color: "text-green-500 border-green-500/30 bg-green-500/10" },
  { value: "moderate", label: "Moderate", color: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10" },
  { value: "hard", label: "Hard", color: "text-orange-500 border-orange-500/30 bg-orange-500/10" },
  { value: "max", label: "Max", color: "text-red-500 border-red-500/30 bg-red-500/10" },
];

// Selected member with source info
interface SelectedMember {
  id: string; // memberId for circle members, or a temp ID for connections
  userId: string;
  name: string;
  profilePicture: string | null;
  source: "circle" | "connection";
  isCurrentUser: boolean;
}

// Connection search result from /api/users/search
interface ConnectionSearchResult {
  id: string;
  userId: string;
  name: string;
  handle: string | null;
  profilePicture: string | null;
}

interface WorkoutConfigFormProps {
  defaults?: WorkoutConfigData;
  memberId: string;
  onSubmit: (config: WorkoutConfigFormData) => void;
  disabled?: boolean;
}

export function WorkoutConfigForm({
  defaults,
  memberId,
  onSubmit,
  disabled = false,
}: WorkoutConfigFormProps) {
  // Context data from API
  const [context, setContext] = useState<MemberContextForForm | null>(null);
  const [contextLoading, setContextLoading] = useState(true);

  // Circle selection
  const [selectedCircleId, setSelectedCircleId] = useState<string>("");

  // Who selection
  const [targetType, setTargetType] = useState<TargetType>("individual");
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [connectionResults, setConnectionResults] = useState<ConnectionSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Workout structure sections
  const [workoutSections, setWorkoutSections] = useState<WorkoutStructureSection[]>(() => {
    if (defaults?.suggestedWorkoutSections && defaults.suggestedWorkoutSections.length > 0) {
      return defaults.suggestedWorkoutSections.map((s, i) => ({
        workoutType: s.workoutType as WorkoutType,
        label: s.label,
        order: i,
      }));
    }
    const sugType = (defaults?.suggestedWorkoutType as WorkoutType) || "standard";
    return [{ workoutType: sugType, order: 0 }];
  });

  // Duration, intensity, location, warmup/cooldown
  const [duration, setDuration] = useState<number>(defaults?.defaultDuration || 30);
  const [customDuration, setCustomDuration] = useState("");
  const [intensity, setIntensity] = useState<WorkoutIntensity>(
    (defaults?.defaultIntensity as WorkoutIntensity) || "moderate"
  );
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [includeWarmup, setIncludeWarmup] = useState(true);
  const [includeCooldown, setIncludeCooldown] = useState(true);

  // Goals — removal tracking: all start selected, track which ones user removes
  const [removedGoalIds, setRemovedGoalIds] = useState<Set<string>>(new Set());
  const [removedCircleGoalIds, setRemovedCircleGoalIds] = useState<Set<string>>(new Set());

  // Fetch context for the selected circle
  const fetchContext = useCallback(async (circleId?: string) => {
    setContextLoading(true);
    try {
      const url = circleId
        ? `/api/members/context?circleId=${circleId}`
        : "/api/members/context";
      const res = await fetch(url);
      if (res.ok) {
        const data: MemberContextForForm = await res.json();
        setContext(data);

        // Always set circle ID from response if we don't have one yet
        if (data.circles.length > 0) {
          setSelectedCircleId((prev) => {
            if (prev) return prev; // Already set
            const defaultCircle = data.circles.find(c => !c.isSystemCircle) || data.circles[0];
            return defaultCircle.id;
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch member context:", error);
    } finally {
      setContextLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchContext();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when circle changes
  const handleCircleChange = (circleId: string) => {
    setSelectedCircleId(circleId);
    setSelectedMembers([]);
    setTargetType("individual"); // Reset to safe default on circle change
    setRemovedGoalIds(new Set());
    setRemovedCircleGoalIds(new Set());
    fetchContext(circleId);
  };

  // Member search with debounce
  const handleMemberSearch = (query: string) => {
    setMemberSearchQuery(query);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (query.length < 2) {
      setConnectionResults([]);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(query)}&connectedOnly=true&limit=10`
        );
        if (res.ok) {
          const data = await res.json();
          setConnectionResults(data.users || []);
        }
      } catch {
        // Silently fail search
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  // Filter circle members by search query (client-side)
  const filteredCircleMembers = context?.members.filter((m) =>
    memberSearchQuery
      ? m.name.toLowerCase().includes(memberSearchQuery.toLowerCase())
      : true
  ) || [];

  // Filter out connection results that are already in the circle
  const circleUserIds = new Set(context?.members.map(m => m.userId) || []);
  const selectedUserIds = new Set(selectedMembers.map(m => m.userId));
  const filteredConnectionResults = connectionResults.filter(
    (r) => !circleUserIds.has(r.userId) && !selectedUserIds.has(r.userId)
  );

  // Add/remove member
  const addMember = (member: SelectedMember) => {
    setSelectedMembers((prev) => [...prev, member]);
  };
  const removeMember = (userId: string) => {
    setSelectedMembers((prev) => prev.filter(m => m.userId !== userId));
    // Clean removed goal IDs for this member's goals
    const memberGoalIds = context?.members.find(m => m.userId === userId)
      ?.goals.map(g => g.id) || [];
    setRemovedGoalIds(prev => {
      const next = new Set(prev);
      memberGoalIds.forEach(id => next.delete(id));
      return next;
    });
  };

  // Workout section management
  const addSection = (type: WorkoutType) => {
    if (workoutSections.length >= 5) return;
    setWorkoutSections((prev) => [
      ...prev,
      { workoutType: type, order: prev.length },
    ]);
  };
  const removeSection = (index: number) => {
    if (workoutSections.length <= 1) return;
    setWorkoutSections((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i }))
    );
  };

  // Goal toggle (removal tracking)
  const toggleGoalRemoval = (goalId: string) => {
    setRemovedGoalIds((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) next.delete(goalId);
      else next.add(goalId);
      return next;
    });
  };
  const toggleCircleGoalRemoval = (goalId: string) => {
    setRemovedCircleGoalIds((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) next.delete(goalId);
      else next.add(goalId);
      return next;
    });
  };

  // Duration handlers
  const handleDurationPreset = (mins: number) => {
    setDuration(mins);
    setCustomDuration("");
  };
  const handleCustomDuration = (val: string) => {
    setCustomDuration(val);
    const parsed = parseInt(val, 10);
    if (parsed >= 10 && parsed <= 180) setDuration(parsed);
  };

  // Compute effective goals
  const getEffectiveMembers = (): string[] => {
    if (targetType === "individual") {
      const currentMember = context?.members.find(m => m.isCurrentUser);
      return currentMember ? [currentMember.id] : [];
    }
    if (targetType === "circle") {
      return context?.members.map(m => m.id) || [];
    }
    return selectedMembers.filter(m => m.source === "circle").map(m => m.id);
  };

  const effectiveMemberIds = getEffectiveMembers();

  // All available goals for effective members
  const allMemberGoals = context?.members
    .filter(m => effectiveMemberIds.includes(m.id))
    .flatMap(m => m.goals.map(g => ({ ...g, memberName: m.name, memberId: m.id }))) || [];

  const effectiveGoalIds = allMemberGoals
    .filter(g => !removedGoalIds.has(g.id))
    .map(g => g.id);

  const effectiveCircleGoalIds = (context?.circleGoals || [])
    .filter(g => !removedCircleGoalIds.has(g.id))
    .map(g => g.id);

  // Submit
  const handleSubmit = () => {
    const guestUserIds = selectedMembers
      .filter(m => m.source === "connection")
      .map(m => m.userId);

    const circleId = selectedCircleId || context?.circles[0]?.id;
    const config: WorkoutConfigFormData = {
      targetType,
      ...(circleId && { circleId }),
      workoutSections,
      duration,
      intensity,
      includeWarmup,
      includeCooldown,
      ...(targetType === "selected_members" && {
        memberIds: selectedMembers.filter(m => m.source === "circle").map(m => m.id),
      }),
      ...(guestUserIds.length > 0 && { guestMemberUserIds: guestUserIds }),
      ...(effectiveGoalIds.length > 0 && { goalIds: effectiveGoalIds }),
      ...(effectiveCircleGoalIds.length > 0 && { circleGoalIds: effectiveCircleGoalIds }),
      ...(selectedLocation && { locationId: selectedLocation }),
    };
    onSubmit(config);
  };

  const hasMultipleCircles = (context?.circles.length ?? 0) > 1;
  // Only show "Everyone" when the circle has 2+ members (not just the current user)
  const circleMemberCount = context?.members.length ?? 0;
  const isSoloCircle = circleMemberCount <= 1;
  // Check if active circle is the personal "My Training" circle
  const activeCircleInfo = context?.circles.find(c => c.id === selectedCircleId);
  const isPersonalCircle = activeCircleInfo?.isSystemCircle ?? false;

  // Group goals by member for display
  const goalsByMember = new Map<string, { memberName: string; goals: typeof allMemberGoals }>();
  for (const g of allMemberGoals) {
    const key = g.memberId;
    if (!goalsByMember.has(key)) {
      goalsByMember.set(key, { memberName: g.memberName, goals: [] });
    }
    goalsByMember.get(key)!.goals.push(g);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border bg-card overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="p-4 bg-brand-gradient text-white">
        <h3 className="font-semibold text-lg">Configure Workout</h3>
        {defaults?.contextMessage && (
          <p className="text-sm text-white/80 mt-1">{defaults.contextMessage}</p>
        )}
      </div>

      <div className="p-4 space-y-5">
        {/* Circle Selector */}
        {hasMultipleCircles && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Circle</p>
            <div className="relative">
              <select
                value={selectedCircleId}
                onChange={(e) => handleCircleChange(e.target.value)}
                disabled={disabled}
                className={cn(
                  "w-full appearance-none py-2.5 px-3 pr-8 rounded-lg text-sm font-medium border transition-all",
                  "min-h-[44px] touch-manipulation bg-card text-foreground",
                  "border-border/60 focus:border-brand focus:ring-1 focus:ring-brand/20"
                )}
              >
                {context?.circles.map((circle) => (
                  <option key={circle.id} value={circle.id}>
                    {circle.isSystemCircle ? "My Training" : circle.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        )}

        {/* Who - Target Type */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Who</p>
          <div className="flex gap-2">
            {/* Build options dynamically based on circle context */}
            {(isSoloCircle || isPersonalCircle
              ? ([
                  { value: "individual" as const, label: "Just Me", icon: User },
                  { value: "selected_members" as const, label: "Add People", icon: UserCheck },
                ])
              : ([
                  { value: "individual" as const, label: "Just Me", icon: User },
                  { value: "circle" as const, label: "Everyone", icon: Users },
                  { value: "selected_members" as const, label: "Select", icon: UserCheck },
                ])
            ).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTargetType(value)}
                disabled={disabled}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium border transition-all",
                  "min-h-[44px] touch-manipulation",
                  targetType === value
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border/60 bg-card text-muted-foreground hover:border-brand/30"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Member selection */}
          {targetType === "selected_members" && (
            <div className="mt-3 space-y-3">
              {/* Selected member pills */}
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedMembers.map((member) => (
                    <span
                      key={member.userId}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium",
                        member.source === "connection"
                          ? "bg-purple-500/10 text-purple-500 border border-purple-500/30"
                          : "bg-brand/10 text-brand border border-brand/30"
                      )}
                    >
                      <div className="h-4 w-4 rounded-full bg-current/10 flex items-center justify-center text-[9px] font-bold">
                        {member.name[0]}
                      </div>
                      {member.name}
                      {member.source === "connection" && (
                        <span className="text-[9px] opacity-70">guest</span>
                      )}
                      <button
                        onClick={() => removeMember(member.userId)}
                        className="ml-0.5 hover:bg-current/10 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search members or connections..."
                  value={memberSearchQuery}
                  onChange={(e) => handleMemberSearch(e.target.value)}
                  disabled={disabled}
                  className="pl-9 h-[44px] text-sm rounded-lg"
                />
                {searchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Circle members */}
              {filteredCircleMembers.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                    In this circle
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {filteredCircleMembers
                      .filter(m => !selectedUserIds.has(m.userId))
                      .map((member) => (
                        <button
                          key={member.id}
                          onClick={() => addMember({
                            id: member.id,
                            userId: member.userId,
                            name: member.name,
                            profilePicture: member.profilePicture,
                            source: "circle",
                            isCurrentUser: member.isCurrentUser,
                          })}
                          disabled={disabled}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all",
                            "min-h-[40px] touch-manipulation",
                            "border-border/60 bg-card text-foreground/80 hover:border-brand/30"
                          )}
                        >
                          <div className="h-5 w-5 rounded-full bg-brand/20 flex items-center justify-center text-[10px] font-bold text-brand">
                            {member.name[0]}
                          </div>
                          {member.name}
                          {member.isCurrentUser && (
                            <span className="text-[10px] text-muted-foreground">(you)</span>
                          )}
                          <Plus className="h-3 w-3 text-muted-foreground" />
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Connection search results */}
              {filteredConnectionResults.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                    Your connections
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {filteredConnectionResults.map((conn) => (
                      <button
                        key={conn.userId}
                        onClick={() => addMember({
                          id: `conn-${conn.userId}`,
                          userId: conn.userId,
                          name: conn.name,
                          profilePicture: conn.profilePicture,
                          source: "connection",
                          isCurrentUser: false,
                        })}
                        disabled={disabled}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all",
                          "min-h-[40px] touch-manipulation",
                          "border-purple-500/20 bg-purple-500/5 text-foreground/80 hover:border-purple-500/40"
                        )}
                      >
                        <div className="h-5 w-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] font-bold text-purple-500">
                          {conn.name[0]}
                        </div>
                        {conn.name}
                        {conn.handle && (
                          <span className="text-[10px] text-muted-foreground">@{conn.handle}</span>
                        )}
                        <Plus className="h-3 w-3 text-purple-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {contextLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading members...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Workout Structure — multi-section */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Workout Structure</p>

          {/* AI hint */}
          {defaults?.aiStructureHint && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-brand/5 border border-brand/10 text-xs text-brand">
              <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{defaults.aiStructureHint}</span>
            </div>
          )}

          {/* Current sections as numbered pills */}
          {workoutSections.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {workoutSections.map((section, idx) => {
                const typeInfo = WORKOUT_TYPES.find(t => t.value === section.workoutType);
                const Icon = typeInfo?.icon || Dumbbell;
                return (
                  <span
                    key={idx}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-brand/10 text-brand border border-brand/30"
                  >
                    <span className="h-4 w-4 rounded-full bg-brand/20 flex items-center justify-center text-[9px] font-bold">
                      {idx + 1}
                    </span>
                    <Icon className="h-3 w-3" />
                    {section.label || typeInfo?.label || section.workoutType}
                    {workoutSections.length > 1 && (
                      <button
                        onClick={() => removeSection(idx)}
                        className="ml-0.5 hover:bg-brand/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {/* Grid to add sections — tap to add, tap active to remove */}
          <div className="grid grid-cols-4 gap-2">
            {WORKOUT_TYPES.map(({ value, label, icon: Icon }) => {
              const isInSections = workoutSections.some(s => s.workoutType === value);
              return (
                <button
                  key={value}
                  onClick={() => {
                    if (isInSections) {
                      // Remove this type (but keep at least 1 section)
                      if (workoutSections.length > 1) {
                        const idx = workoutSections.findIndex(s => s.workoutType === value);
                        removeSection(idx);
                      }
                    } else {
                      // Add this type as a new section
                      addSection(value);
                    }
                  }}
                  disabled={disabled || (!isInSections && workoutSections.length >= 5)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg text-xs font-medium border transition-all",
                    "min-h-[64px] touch-manipulation",
                    isInSections
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border/60 bg-card text-muted-foreground hover:border-brand/30"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>

          {workoutSections.length < 5 && (
            <p className="text-[10px] text-muted-foreground">
              Tap to toggle — select multiple for mixed workouts (e.g., Standard + AMRAP finisher)
            </p>
          )}
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Duration</p>
          <div className="flex gap-2">
            {DURATION_PRESETS.map((mins) => (
              <button
                key={mins}
                onClick={() => handleDurationPreset(mins)}
                disabled={disabled}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all",
                  "min-h-[44px] touch-manipulation",
                  duration === mins && !customDuration
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border/60 bg-card text-muted-foreground hover:border-brand/30"
                )}
              >
                {mins}m
              </button>
            ))}
            <div className="relative w-16">
              <Input
                type="number"
                placeholder="Min"
                value={customDuration}
                onChange={(e) => handleCustomDuration(e.target.value)}
                disabled={disabled}
                className="w-full h-[44px] text-center text-sm rounded-lg pr-1 pl-1"
                min={10}
                max={180}
              />
            </div>
          </div>
        </div>

        {/* Goals — grouped by source, auto-populated, removal tracking */}
        {(allMemberGoals.length > 0 || (context?.circleGoals?.length ?? 0) > 0) && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Goals</p>

            {/* Circle Goals */}
            {context?.circleGoals && context.circleGoals.length > 0 && (
              <div>
                <p className="text-[10px] text-purple-500 uppercase tracking-wider mb-1.5 font-medium">
                  Circle Goals
                </p>
                <div className="flex flex-wrap gap-2">
                  {context.circleGoals.map((goal) => {
                    const isActive = !removedCircleGoalIds.has(goal.id);
                    return (
                      <button
                        key={goal.id}
                        onClick={() => toggleCircleGoalRemoval(goal.id)}
                        disabled={disabled}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs border transition-all",
                          "min-h-[36px] touch-manipulation",
                          isActive
                            ? "border-purple-500 bg-purple-500/10 text-purple-500"
                            : "border-border/40 bg-card text-muted-foreground/50 line-through"
                        )}
                      >
                        <Users className="h-3 w-3" />
                        {goal.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Member Goals — grouped by member */}
            {Array.from(goalsByMember.entries()).map(([mId, { memberName, goals }]) => (
              <div key={mId}>
                <p className="text-[10px] text-brand uppercase tracking-wider mb-1.5 font-medium">
                  {memberName}&apos;s Goals
                </p>
                <div className="flex flex-wrap gap-2">
                  {goals.map((goal) => {
                    const isActive = !removedGoalIds.has(goal.id);
                    return (
                      <button
                        key={goal.id}
                        onClick={() => toggleGoalRemoval(goal.id)}
                        disabled={disabled}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs border transition-all",
                          "min-h-[36px] touch-manipulation",
                          isActive
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-border/40 bg-card text-muted-foreground/50 line-through"
                        )}
                      >
                        <Target className="h-3 w-3" />
                        {goal.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {allMemberGoals.length === 0 && (context?.circleGoals?.length ?? 0) === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No goals set — workout will be based on general fitness
              </p>
            )}
          </div>
        )}

        {/* Location */}
        {context?.locations && context.locations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Location</p>
            <div className="flex flex-wrap gap-2">
              {context.locations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocation(selectedLocation === loc.id ? null : loc.id)}
                  disabled={disabled}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all",
                    "min-h-[40px] touch-manipulation",
                    selectedLocation === loc.id
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border/60 bg-card text-muted-foreground hover:border-brand/30"
                  )}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {loc.name}
                  {loc.equipment.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      ({loc.equipment.length} equip.)
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Intensity */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Intensity</p>
          <div className="flex gap-2">
            {INTENSITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setIntensity(opt.value)}
                disabled={disabled}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all",
                  "min-h-[44px] touch-manipulation",
                  intensity === opt.value
                    ? opt.color
                    : "border-border/60 bg-card text-muted-foreground hover:border-brand/30"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Warmup/Cooldown toggles */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer touch-manipulation">
            <input
              type="checkbox"
              checked={includeWarmup}
              onChange={(e) => setIncludeWarmup(e.target.checked)}
              disabled={disabled}
              className="rounded border-border accent-brand h-4 w-4"
            />
            Include Warmup
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer touch-manipulation">
            <input
              type="checkbox"
              checked={includeCooldown}
              onChange={(e) => setIncludeCooldown(e.target.checked)}
              disabled={disabled}
              className="rounded border-border accent-brand h-4 w-4"
            />
            Include Cooldown
          </label>
        </div>
      </div>

      {/* Submit button */}
      <div className="p-4 border-t bg-muted/30">
        <Button
          onClick={handleSubmit}
          disabled={
            disabled ||
            contextLoading ||
            (targetType === "selected_members" && selectedMembers.length === 0)
          }
          className="w-full bg-brand-gradient hover:opacity-90 text-white font-semibold h-12 text-base"
        >
          <Dumbbell className="h-5 w-5 mr-2" />
          Generate Workout
        </Button>
      </div>
    </motion.div>
  );
}
