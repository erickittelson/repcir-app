"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Users,
  Search,
  Plus,
  Loader2,
  Check,
  Flame,
  Sparkles,
  Target,
  Dumbbell,
  Heart,
  Zap,
  X,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CreateRallyExperience } from "@/components/rally";
import { CircleDetailSheet } from "@/components/sheets";

interface RallyData {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  handle: string | null;
  memberCount: number;
  focusArea: string | null;
  visibility: string;
  createdAt: string;
  lastActivityAt: string | null;
  isMember: boolean;
}

interface DiscoverResponse {
  circles: RallyData[];
  trending: RallyData[];
  filters: {
    focusAreas: Array<{ focusArea: string | null; count: number }>;
  };
  total: number;
}

// Focus area icons and colors
const FOCUS_AREA_CONFIG: Record<
  string,
  { icon: typeof Dumbbell; color: string; label: string }
> = {
  strength: { icon: Dumbbell, color: "text-red-500", label: "Strength" },
  weight_loss: { icon: Target, color: "text-orange-500", label: "Weight Loss" },
  endurance: { icon: Zap, color: "text-blue-500", label: "Endurance" },
  flexibility: { icon: Sparkles, color: "text-purple-500", label: "Flexibility" },
  general: { icon: Heart, color: "text-brand", label: "General Fitness" },
};

function RallySkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-2/3 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

function TrendingRallySkeleton() {
  return (
    <div className="flex-shrink-0 w-[160px]">
      <Card className="h-full">
        <CardContent className="p-3">
          <Skeleton className="h-12 w-12 rounded-full mx-auto mb-2" />
          <Skeleton className="h-4 w-3/4 mx-auto mb-1" />
          <Skeleton className="h-3 w-1/2 mx-auto" />
        </CardContent>
      </Card>
    </div>
  );
}

export function DiscoverRallies() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<DiscoverResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedFocus, setSelectedFocus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"popular" | "newest" | "active">("popular");
  const [joiningRally, setJoiningRally] = useState<string | null>(null);
  const [showCreateRally, setShowCreateRally] = useState(false);
  const [selectedRallyId, setSelectedRallyId] = useState<string | null>(null);

  // Fetch rallies
  const fetchRallies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(searchQuery && { q: searchQuery }),
        ...(selectedFocus !== "all" && { focusArea: selectedFocus }),
        sort: sortBy,
        limit: "30",
      });

      const response = await fetch(`/api/circles/discover?${params}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch rallies:", error);
      toast.error("Failed to load rallies");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedFocus, sortBy]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRallies();
    }, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchRallies]);

  // Join rally
  const handleJoinRally = async (rallyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setJoiningRally(rallyId);
    try {
      const response = await fetch(`/api/circles/${rallyId}/join`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Joined rally!");
        // Update local state
        setData((prev) =>
          prev
            ? {
                ...prev,
                circles: prev.circles.map((c) =>
                  c.id === rallyId
                    ? { ...c, isMember: true, memberCount: c.memberCount + 1 }
                    : c
                ),
                trending: prev.trending.map((c) =>
                  c.id === rallyId
                    ? { ...c, isMember: true, memberCount: c.memberCount + 1 }
                    : c
                ),
              }
            : null
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to join");
      }
    } catch (error) {
      console.error("Failed to join rally:", error);
      toast.error("Failed to join rally");
    } finally {
      setJoiningRally(null);
    }
  };

  // Get focus area config
  const getFocusConfig = (focusArea: string | null) => {
    if (!focusArea) return FOCUS_AREA_CONFIG.general;
    return FOCUS_AREA_CONFIG[focusArea] || FOCUS_AREA_CONFIG.general;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Discover Rallies</h1>
            <Button size="sm" onClick={() => setShowCreateRally(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or @handle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Focus Area Filters */}
        <ScrollArea className="-mx-4 px-4">
          <div className="flex gap-2 pb-2">
            <Badge
              variant={selectedFocus === "all" ? "default" : "outline"}
              className={cn(
                "cursor-pointer whitespace-nowrap transition-colors",
                selectedFocus === "all" && "bg-brand hover:bg-brand/90"
              )}
              onClick={() => setSelectedFocus("all")}
            >
              All
            </Badge>
            {Object.entries(FOCUS_AREA_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <Badge
                  key={key}
                  variant={selectedFocus === key ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer whitespace-nowrap gap-1.5 transition-colors",
                    selectedFocus === key && "bg-brand hover:bg-brand/90"
                  )}
                  onClick={() => setSelectedFocus(key)}
                >
                  <Icon className="h-3 w-3" />
                  {config.label}
                </Badge>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Trending Section */}
        {!searchQuery && data?.trending && data.trending.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Flame className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold">Trending Now</h2>
                <p className="text-xs text-muted-foreground">
                  Most active rallies
                </p>
              </div>
            </div>

            <ScrollArea className="-mx-4 px-4">
              <div className="flex gap-3 pb-2">
                {loading
                  ? Array(4)
                      .fill(0)
                      .map((_, i) => <TrendingRallySkeleton key={i} />)
                  : data.trending.map((rally) => {
                      const focus = getFocusConfig(rally.focusArea);
                      const Icon = focus.icon;

                      return (
                        <div
                          key={rally.id}
                          className="flex-shrink-0 w-[160px]"
                        >
                          <Card
                            className={cn(
                              "h-full cursor-pointer hover:bg-muted/50 transition-colors",
                              rally.isMember && "ring-2 ring-brand/30"
                            )}
                            onClick={() => setSelectedRallyId(rally.id)}
                          >
                            <CardContent className="p-4 text-center">
                              <div className="relative mx-auto w-fit mb-2">
                                <Avatar className="h-14 w-14">
                                  <AvatarImage src={rally.imageUrl || undefined} />
                                  <AvatarFallback className="bg-brand/20 text-brand text-lg">
                                    {rally.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                {rally.isMember && (
                                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-success flex items-center justify-center ring-2 ring-background">
                                    <Check className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </div>
                              <p className="font-medium text-sm truncate">
                                {rally.name}
                              </p>
                              <div className="flex items-center justify-center gap-1 mt-1">
                                <Icon className={cn("h-3 w-3", focus.color)} />
                                <span className="text-xs text-muted-foreground">
                                  {rally.memberCount} members
                                </span>
                              </div>
                              {!rally.isMember && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-2 h-7 text-xs w-full"
                                  onClick={(e) => handleJoinRally(rally.id, e)}
                                  disabled={joiningRally === rally.id}
                                >
                                  {joiningRally === rally.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    "Join"
                                  )}
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </section>
        )}

        {/* All Rallies */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand" />
              <h2 className="font-semibold">
                {searchQuery
                  ? `Results for "${searchQuery}"`
                  : selectedFocus !== "all"
                  ? FOCUS_AREA_CONFIG[selectedFocus]?.label || "Rallies"
                  : "All Rallies"}
              </h2>
            </div>
            <div className="flex gap-1">
              {(["popular", "newest", "active"] as const).map((sort) => (
                <Button
                  key={sort}
                  variant={sortBy === sort ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs capitalize"
                  onClick={() => setSortBy(sort)}
                >
                  {sort}
                </Button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <RallySkeleton key={i} />
                ))}
            </div>
          ) : !data?.circles || data.circles.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium text-muted-foreground">
                {searchQuery ? "No rallies found" : "No rallies available"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery
                  ? "Try a different search term or create your own"
                  : "Be the first to create one!"}
              </p>
              <Button
                className="mt-4"
                onClick={() => setShowCreateRally(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Rally
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {data.circles.map((rally) => {
                const focus = getFocusConfig(rally.focusArea);
                const Icon = focus.icon;

                return (
                  <Card
                    key={rally.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50 transition-colors",
                      rally.isMember && "border-brand/30"
                    )}
                    onClick={() => setSelectedRallyId(rally.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="relative">
                          <Avatar className="h-14 w-14">
                            <AvatarImage src={rally.imageUrl || undefined} />
                            <AvatarFallback className="bg-brand/20 text-brand text-lg">
                              {rally.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {rally.isMember && (
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-success flex items-center justify-center ring-2 ring-background">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">
                              {rally.name}
                            </h3>
                            {rally.isMember && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                Joined
                              </Badge>
                            )}
                          </div>
                          {rally.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                              {rally.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1">
                              <Icon className={cn("h-3.5 w-3.5", focus.color)} />
                              <span className="text-xs text-muted-foreground">
                                {focus.label}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {rally.memberCount.toLocaleString()} member
                              {rally.memberCount !== 1 && "s"}
                            </span>
                            {rally.handle && (
                              <span className="text-xs text-brand">
                                @{rally.handle}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action */}
                        {rally.isMember ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/circle/${rally.id}`);
                            }}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={(e) => handleJoinRally(rally.id, e)}
                            disabled={joiningRally === rally.id}
                          >
                            {joiningRally === rally.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-1" />
                                Join
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Create Rally Experience */}
      <CreateRallyExperience
        open={showCreateRally}
        onOpenChange={setShowCreateRally}
        onComplete={() => {
          fetchRallies();
        }}
      />

      {/* Circle Detail Sheet */}
      <CircleDetailSheet
        circleId={selectedRallyId}
        open={!!selectedRallyId}
        onOpenChange={(open) => !open && setSelectedRallyId(null)}
        onJoin={(circleId) => handleJoinRally(circleId, { stopPropagation: () => {} } as React.MouseEvent)}
      />
    </div>
  );
}
