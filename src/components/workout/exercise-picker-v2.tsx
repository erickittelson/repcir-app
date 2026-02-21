"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Search,
  Plus,
  Clock,
  TrendingUp,
  Sparkles,
  Dumbbell,
  X,
  Zap,
  Heart,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

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

// ============================================================================
// Filter Configuration
// ============================================================================

interface FilterOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  searchTerms: string[]; // Terms to search for
  color: string;
}

const BODY_REGION_FILTERS: FilterOption[] = [
  {
    id: "upper",
    label: "Upper Body",
    searchTerms: ["chest", "back", "shoulder", "bicep", "tricep", "arm"],
    color: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  },
  {
    id: "lower",
    label: "Lower Body",
    searchTerms: ["quad", "hamstring", "glute", "calf", "leg", "hip"],
    color: "bg-green-500/20 text-green-600 border-green-500/30",
  },
  {
    id: "core",
    label: "Core",
    searchTerms: ["abs", "core", "oblique", "abdominal"],
    color: "bg-orange-500/20 text-orange-600 border-orange-500/30",
  },
  {
    id: "full",
    label: "Full Body",
    searchTerms: ["full body", "compound", "total body"],
    color: "bg-purple-500/20 text-purple-600 border-purple-500/30",
  },
];

const MUSCLE_GROUP_FILTERS: FilterOption[] = [
  { id: "chest", label: "Chest", searchTerms: ["chest", "pec"], color: "bg-red-500/20 text-red-600 border-red-500/30" },
  { id: "back", label: "Back", searchTerms: ["back", "lat", "rhomboid", "trap"], color: "bg-indigo-500/20 text-indigo-600 border-indigo-500/30" },
  { id: "shoulders", label: "Shoulders", searchTerms: ["shoulder", "delt"], color: "bg-cyan-500/20 text-cyan-600 border-cyan-500/30" },
  { id: "biceps", label: "Biceps", searchTerms: ["bicep", "curl"], color: "bg-pink-500/20 text-pink-600 border-pink-500/30" },
  { id: "triceps", label: "Triceps", searchTerms: ["tricep", "pushdown", "extension"], color: "bg-violet-500/20 text-violet-600 border-violet-500/30" },
  { id: "quads", label: "Quads", searchTerms: ["quad", "squat", "leg press", "lunge"], color: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30" },
  { id: "hamstrings", label: "Hamstrings", searchTerms: ["hamstring", "leg curl", "romanian"], color: "bg-teal-500/20 text-teal-600 border-teal-500/30" },
  { id: "glutes", label: "Glutes", searchTerms: ["glute", "hip thrust", "bridge"], color: "bg-rose-500/20 text-rose-600 border-rose-500/30" },
  { id: "calves", label: "Calves", searchTerms: ["calf", "calves"], color: "bg-amber-500/20 text-amber-600 border-amber-500/30" },
  { id: "abs", label: "Abs", searchTerms: ["abs", "crunch", "plank", "sit-up"], color: "bg-lime-500/20 text-lime-600 border-lime-500/30" },
];

const CATEGORY_FILTERS: FilterOption[] = [
  { id: "strength", label: "Strength", icon: <Dumbbell className="h-3 w-3" />, searchTerms: ["strength"], color: "bg-zinc-500/20 text-zinc-600 border-zinc-500/30" },
  { id: "cardio", label: "Cardio", icon: <Heart className="h-3 w-3" />, searchTerms: ["cardio"], color: "bg-red-500/20 text-red-600 border-red-500/30" },
  { id: "plyometric", label: "Explosive", icon: <Zap className="h-3 w-3" />, searchTerms: ["plyometric", "jump", "explosive"], color: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" },
  { id: "flexibility", label: "Flexibility", icon: <Target className="h-3 w-3" />, searchTerms: ["flexibility", "stretch", "mobility"], color: "bg-sky-500/20 text-sky-600 border-sky-500/30" },
];

// ============================================================================
// Types
// ============================================================================

interface ExercisePickerV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: Exercise) => void;
  title?: string;
  subtitle?: string;
  autoClose?: boolean; // Default true - set to false for multi-exercise selection
}

interface SuggestedExercises {
  recentlyUsed: Exercise[];
  popular: Exercise[];
  recommended: Exercise[];
}

interface SearchResult {
  results: Exercise[];
  query: string;
  total: number;
}

// ============================================================================
// Hooks
// ============================================================================

function useExerciseSearch(query: string, activeFilter: FilterOption | null) {
  const [results, setResults] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Combine user query with filter search terms
  const effectiveQuery = useMemo(() => {
    if (debouncedQuery && debouncedQuery.length >= 2) {
      return debouncedQuery;
    }
    if (activeFilter) {
      // Use the first search term from the filter
      return activeFilter.searchTerms[0];
    }
    return "";
  }, [debouncedQuery, activeFilter]);

  useEffect(() => {
    if (!effectiveQuery || effectiveQuery.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    async function search() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/exercises/search?q=${encodeURIComponent(effectiveQuery)}&limit=30`,
          { signal: controller.signal, credentials: "include" }
        );

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data: SearchResult = await response.json();

        // If we have an active filter, also filter client-side for better accuracy
        let filteredResults = data.results;
        if (activeFilter && !debouncedQuery) {
          filteredResults = data.results.filter(exercise => {
            const searchableText = [
              exercise.name,
              exercise.category,
              ...(exercise.muscleGroups || []),
              ...(exercise.secondaryMuscles || []),
            ].join(" ").toLowerCase();

            return activeFilter.searchTerms.some(term =>
              searchableText.includes(term.toLowerCase())
            );
          });
        }

        setResults(filteredResults);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // Ignore aborted requests
        }
        console.error("Search error:", err);
        setError("Failed to search exercises");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }

    search();

    return () => {
      controller.abort();
    };
  }, [effectiveQuery, activeFilter, debouncedQuery]);

  return { results, isLoading, error, isFiltered: !!activeFilter && !debouncedQuery };
}

function useSuggestedExercises(enabled: boolean = true) {
  const [data, setData] = useState<SuggestedExercises | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!enabled || hasFetched) return;

    async function fetchSuggestions() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/exercises/suggested?limit=8", {
          credentials: "include",
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Suggestions API error:", response.status, errorData);
          // If 401, likely auth issue - just show empty state instead of error
          if (response.status === 401) {
            setData({ recentlyUsed: [], popular: [], recommended: [] });
            setHasFetched(true);
            return;
          }
          // For any error, just show empty state - user can still search
          setData({ recentlyUsed: [], popular: [], recommended: [] });
          setHasFetched(true);
          return;
        }
        const fetchedData = await response.json();
        setData(fetchedData);
        setHasFetched(true);
      } catch (err) {
        console.error("Error fetching suggestions:", err);
        // Show empty state instead of error for better UX
        setData({ recentlyUsed: [], popular: [], recommended: [] });
        setHasFetched(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSuggestions();
  }, [enabled, hasFetched]);

  return { data, isLoading, error };
}

// ============================================================================
// Components
// ============================================================================

interface ExerciseCardProps {
  exercise: Exercise;
  onSelect: () => void;
  showBadge?: "recent" | "popular" | "recommended";
}

function ExerciseCard({ exercise, onSelect, showBadge }: ExerciseCardProps) {
  const badgeConfig = {
    recent: { icon: Clock, label: "Recent", className: "bg-blue-500/20 text-blue-500" },
    popular: { icon: TrendingUp, label: "Popular", className: "bg-green-500/20 text-green-500" },
    recommended: { icon: Sparkles, label: "Suggested", className: "bg-amber-500/20 text-amber-500" },
  };

  const badge = showBadge ? badgeConfig[showBadge] : null;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "w-full p-4 rounded-xl border text-left transition-all",
        "hover:border-amber-400 hover:bg-amber-500/5 active:scale-[0.98]",
        "focus:outline-none focus:ring-2 focus:ring-amber-500/50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Exercise Image or Placeholder */}
        <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden shrink-0">
          {exercise.imageUrl ? (
            <img
              src={exercise.imageUrl}
              alt={exercise.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              <Dumbbell className="h-6 w-6 text-amber-500/60" />
            </div>
          )}
        </div>

        {/* Exercise Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold truncate">{exercise.name}</p>
            {badge && (
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs", badge.className)}>
                <badge.icon className="h-3 w-3" />
                {badge.label}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Badge variant="outline" className="text-xs">
              {exercise.category}
            </Badge>
            {exercise.mechanic && (
              <Badge
                variant={exercise.mechanic === "compound" ? "default" : "secondary"}
                className="text-xs"
              >
                {exercise.mechanic}
              </Badge>
            )}
            {exercise.difficulty && (
              <Badge variant="secondary" className="text-xs capitalize">
                {exercise.difficulty}
              </Badge>
            )}
          </div>
          {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {exercise.muscleGroups.slice(0, 3).join(", ")}
              {exercise.muscleGroups.length > 3 && ` +${exercise.muscleGroups.length - 3}`}
            </p>
          )}
        </div>

        {/* Add Button */}
        <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 self-center">
          <Plus className="h-5 w-5 text-amber-500" />
        </div>
      </div>
    </motion.button>
  );
}

function ExerciseSkeleton() {
  return (
    <div className="p-4 rounded-xl border">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ExercisePickerV2({
  open,
  onOpenChange,
  onSelect,
  title,
  subtitle,
  autoClose = true,
}: ExercisePickerV2Props) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterOption | null>(null);
  const [filterSection, setFilterSection] = useState<"body" | "muscle" | "category" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results: searchResults, isLoading: isSearching, isFiltered } = useExerciseSearch(search, activeFilter);
  const { data: suggestions, isLoading: isLoadingSuggestions } = useSuggestedExercises(open);

  // Reset search when closing
  useEffect(() => {
    if (!open) {
      setSearch("");
      setActiveFilter(null);
      setFilterSection(null);
    }
  }, [open]);

  // Auto-focus input when opening
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Clear filter when user starts typing
  useEffect(() => {
    if (search.length > 0 && activeFilter) {
      setActiveFilter(null);
    }
  }, [search, activeFilter]);

  const handleFilterSelect = (filter: FilterOption) => {
    if (activeFilter?.id === filter.id) {
      setActiveFilter(null);
    } else {
      setActiveFilter(filter);
      setSearch(""); // Clear search when filter is selected
    }
  };

  const clearFilter = () => {
    setActiveFilter(null);
    setFilterSection(null);
  };

  const handleSelect = (exercise: Exercise) => {
    onSelect(exercise);
    if (autoClose) {
      onOpenChange(false);
    }
  };

  const isSearchMode = search.length >= 2 || activeFilter !== null;
  const hasResults = searchResults.length > 0;
  const hasSuggestions = suggestions && (
    suggestions.recentlyUsed.length > 0 ||
    suggestions.popular.length > 0 ||
    suggestions.recommended.length > 0
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-6">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-amber-500" />
            {title || "Add Exercise"}
          </SheetTitle>
          <SheetDescription>
            {subtitle || "Search or tap a filter to find exercises"}
          </SheetDescription>
        </SheetHeader>

        {/* Search Bar */}
        <div className="space-y-3 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises..."
              className="pl-10 pr-10 h-11"
            />
            {(search || activeFilter) && (
              <button
                type="button"
                onClick={() => { setSearch(""); clearFilter(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Active Filter Badge */}
          {activeFilter && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filtered by:</span>
              <button
                onClick={clearFilter}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                  activeFilter.color
                )}
              >
                {activeFilter.label}
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Quick Filter Chips */}
          {!search && !activeFilter && (
            <div className="space-y-2">
              {/* Body Region Filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                <span className="text-xs text-muted-foreground shrink-0">Body:</span>
                {BODY_REGION_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => handleFilterSelect(filter)}
                    className={cn(
                      "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      "hover:scale-105 active:scale-95",
                      filter.color
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Muscle Group Filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                <span className="text-xs text-muted-foreground shrink-0">Muscle:</span>
                {MUSCLE_GROUP_FILTERS.slice(0, 6).map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => handleFilterSelect(filter)}
                    className={cn(
                      "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      "hover:scale-105 active:scale-95",
                      filter.color
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
                <button
                  onClick={() => setFilterSection(filterSection === "muscle" ? null : "muscle")}
                  className="shrink-0 px-2 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground"
                >
                  +{MUSCLE_GROUP_FILTERS.length - 6} more
                </button>
              </div>

              {/* Expanded Muscle Groups */}
              <AnimatePresence>
                {filterSection === "muscle" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-2 pt-1">
                      {MUSCLE_GROUP_FILTERS.slice(6).map((filter) => (
                        <button
                          key={filter.id}
                          onClick={() => handleFilterSelect(filter)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                            "hover:scale-105 active:scale-95",
                            filter.color
                          )}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Category Filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                <span className="text-xs text-muted-foreground shrink-0">Type:</span>
                {CATEGORY_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => handleFilterSelect(filter)}
                    className={cn(
                      "shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      "hover:scale-105 active:scale-95",
                      filter.color
                    )}
                  >
                    {filter.icon}
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(85vh-180px)]">
          <div className="space-y-6 pr-4 pb-8">
            {/* Search/Filter Results */}
            {isSearchMode && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {isSearching ? "Searching..." : (
                    activeFilter && !search
                      ? `${activeFilter.label} exercises`
                      : `Results for "${search}"`
                  )}
                </h3>

                {isSearching ? (
                  <div className="space-y-3">
                    <ExerciseSkeleton />
                    <ExerciseSkeleton />
                    <ExerciseSkeleton />
                  </div>
                ) : hasResults ? (
                  <div className="space-y-2">
                    {searchResults.map((exercise) => (
                      <ExerciseCard
                        key={exercise.id}
                        exercise={exercise}
                        onSelect={() => handleSelect(exercise)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No exercises found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {activeFilter ? "Try a different filter" : "Try a different search term"}
                    </p>
                    {activeFilter && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilter}
                        className="mt-4"
                      >
                        Clear filter
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Suggestions (when not searching) */}
            {!isSearchMode && (
              <>
                {isLoadingSuggestions ? (
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <ExerciseSkeleton />
                    <ExerciseSkeleton />
                  </div>
                ) : hasSuggestions ? (
                  <>
                    {/* Recently Used */}
                    {suggestions.recentlyUsed.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <h3 className="text-sm font-medium">Recently Used</h3>
                        </div>
                        <div className="space-y-2">
                          {suggestions.recentlyUsed.map((exercise) => (
                            <ExerciseCard
                              key={exercise.id}
                              exercise={exercise}
                              onSelect={() => handleSelect(exercise)}
                              showBadge="recent"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Popular */}
                    {suggestions.popular.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <h3 className="text-sm font-medium">Popular Exercises</h3>
                        </div>
                        <div className="space-y-2">
                          {suggestions.popular.map((exercise) => (
                            <ExerciseCard
                              key={exercise.id}
                              exercise={exercise}
                              onSelect={() => handleSelect(exercise)}
                              showBadge="popular"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended */}
                    {suggestions.recommended.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-amber-500" />
                          <h3 className="text-sm font-medium">Suggested for You</h3>
                        </div>
                        <div className="space-y-2">
                          {suggestions.recommended.map((exercise) => (
                            <ExerciseCard
                              key={exercise.id}
                              exercise={exercise}
                              onSelect={() => handleSelect(exercise)}
                              showBadge="recommended"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="font-medium">Start typing to search</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Search from hundreds of exercises
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
