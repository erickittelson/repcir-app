"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dumbbell,
  Plus,
  Loader2,
  Filter,
  X,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

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
  force?: string;
  mechanic?: string;
  benefits?: string[];
  progressions?: string[];
  imageUrl?: string;
  isCustom: boolean;
}

const categories = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "flexibility", label: "Flexibility" },
  { value: "plyometric", label: "Plyometric" },
  { value: "skill", label: "Skill" },
  { value: "sport", label: "Sport" },
];

const difficulties = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const muscleGroups = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quadriceps",
  "hamstrings",
  "glutes",
  "calves",
  "core",
  "forearms",
  "cardiovascular",
  "full body",
];

const PAGE_SIZE = 24;

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Exercise card skeleton
function ExerciseCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="w-full h-40" />
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-3/4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3 mb-3" />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Cache for filtered results
  const cacheRef = useRef<Map<string, Exercise[]>>(new Map());

  const debouncedSearch = useDebounce(search, 300);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    instructions: "",
    category: "",
    muscleGroups: [] as string[],
    equipment: "",
    difficulty: "",
  });

  // Generate cache key from current filters
  const getCacheKey = useCallback((offset = 0) => {
    return `${debouncedSearch}|${categoryFilter}|${difficultyFilter}|${muscleFilter}|${offset}`;
  }, [debouncedSearch, categoryFilter, difficultyFilter, muscleFilter]);

  // Fetch exercises with pagination
  const fetchExercises = useCallback(async (reset = false) => {
    const offset = reset ? 0 : exercises.length;
    const cacheKey = getCacheKey(offset);

    // Check cache first
    if (!reset && cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)!;
      setExercises((prev) => [...prev, ...cached]);
      setHasMore(cached.length === PAGE_SIZE);
      return;
    }

    if (reset) {
      setInitialLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (categoryFilter) params.append("category", categoryFilter);
      if (difficultyFilter) params.append("difficulty", difficultyFilter);
      if (muscleFilter) params.append("muscleGroup", muscleFilter);
      params.append("limit", PAGE_SIZE.toString());
      params.append("offset", offset.toString());

      const response = await fetch(`/api/exercises?${params}`);
      if (response.ok) {
        const data = await response.json();

        // Cache the results
        cacheRef.current.set(cacheKey, data);

        if (reset) {
          setExercises(data);
        } else {
          setExercises((prev) => [...prev, ...data]);
        }

        setHasMore(data.length === PAGE_SIZE);
        setTotalCount((prev) => reset ? data.length : prev + data.length);
      }
    } catch (error) {
      console.error("Failed to fetch exercises:", error);
      toast.error("Failed to load exercises");
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, [exercises.length, debouncedSearch, categoryFilter, difficultyFilter, muscleFilter, getCacheKey]);

  // Initial load and filter changes
  useEffect(() => {
    fetchExercises(true);
  }, [debouncedSearch, categoryFilter, difficultyFilter, muscleFilter]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchExercises(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          equipment: formData.equipment
            ? formData.equipment.split(",").map((e) => e.trim())
            : [],
        }),
      });

      if (response.ok) {
        toast.success("Exercise added successfully");
        setDialogOpen(false);
        setFormData({
          name: "",
          description: "",
          instructions: "",
          category: "",
          muscleGroups: [],
          equipment: "",
          difficulty: "",
        });
        // Clear cache and refetch
        cacheRef.current.clear();
        fetchExercises(true);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to add exercise");
      }
    } catch (error) {
      console.error("Failed to add exercise:", error);
      toast.error("Failed to add exercise");
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setDifficultyFilter("");
    setMuscleFilter("");
  };

  const hasFilters = search || categoryFilter || difficultyFilter || muscleFilter;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exercise Library</h1>
          <p className="text-muted-foreground">
            Browse, search, and add exercises to your workouts
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Exercise
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Custom Exercise</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) =>
                      setFormData({ ...formData, difficulty: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {difficulties.map((diff) => (
                        <SelectItem key={diff.value} value={diff.value}>
                          {diff.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Muscle Groups</Label>
                  <div className="flex flex-wrap gap-2">
                    {muscleGroups.map((muscle) => (
                      <Badge
                        key={muscle}
                        variant={
                          formData.muscleGroups.includes(muscle)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() => {
                          const updated = formData.muscleGroups.includes(muscle)
                            ? formData.muscleGroups.filter((m) => m !== muscle)
                            : [...formData.muscleGroups, muscle];
                          setFormData({ ...formData, muscleGroups: updated });
                        }}
                      >
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment">Equipment (comma separated)</Label>
                  <Input
                    id="equipment"
                    value={formData.equipment}
                    onChange={(e) =>
                      setFormData({ ...formData, equipment: e.target.value })
                    }
                    placeholder="barbell, bench"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) =>
                      setFormData({ ...formData, instructions: e.target.value })
                    }
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Exercise
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <SearchInput
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              containerClassName="flex-1 min-w-[200px]"
            />

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                {difficulties.map((diff) => (
                  <SelectItem key={diff.value} value={diff.value}>
                    {diff.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={muscleFilter} onValueChange={setMuscleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Muscle" />
              </SelectTrigger>
              <SelectContent>
                {muscleGroups.map((muscle) => (
                  <SelectItem key={muscle} value={muscle}>
                    {muscle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button type="button" variant="ghost" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Exercise count */}
      {!initialLoading && (
        <p className="text-sm text-muted-foreground">
          Showing {exercises.length} exercises
          {hasMore && " • Scroll down for more"}
        </p>
      )}

      {/* Exercise List */}
      {initialLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ExerciseCardSkeleton key={i} />
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No exercises found</h3>
            <p className="text-muted-foreground">
              {hasFilters
                ? "Try adjusting your filters"
                : "Loading exercise library..."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {exercises.map((exercise) => (
              <Card
                key={exercise.id}
                className="cursor-pointer hover:border-primary transition-colors overflow-hidden"
                onClick={() => setSelectedExercise(exercise)}
              >
                {exercise.imageUrl && (
                  <div className="relative w-full h-40 bg-muted">
                    <img
                      src={exercise.imageUrl}
                      alt={exercise.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{exercise.name}</CardTitle>
                    {exercise.isCustom && (
                      <Badge variant="secondary">Custom</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {exercise.description || "No description"}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <Badge variant="outline">{exercise.category}</Badge>
                    {exercise.difficulty && (
                      <Badge variant="outline">{exercise.difficulty}</Badge>
                    )}
                  </div>
                  {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {exercise.muscleGroups.slice(0, 3).map((muscle) => (
                        <Badge key={muscle} variant="secondary" className="text-xs">
                          {muscle}
                        </Badge>
                      ))}
                      {exercise.muscleGroups.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{exercise.muscleGroups.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="min-w-[200px]"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" />
                    Load More Exercises
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Exercise Detail Dialog */}
      <Dialog
        open={!!selectedExercise}
        onOpenChange={() => setSelectedExercise(null)}
      >
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
                {selectedExercise.benefits &&
                  selectedExercise.benefits.length > 0 && (
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
                {selectedExercise.progressions &&
                  selectedExercise.progressions.length > 0 && (
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
                {selectedExercise.muscleGroups &&
                  selectedExercise.muscleGroups.length > 0 && (
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
                {selectedExercise.secondaryMuscles &&
                  selectedExercise.secondaryMuscles.length > 0 && (
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

                {selectedExercise.equipment &&
                  selectedExercise.equipment.length > 0 && (
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
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
