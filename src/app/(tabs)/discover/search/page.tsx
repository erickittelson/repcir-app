"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchInput } from "@/components/ui/search-input";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Dumbbell,
  Users,
  Trophy,
  User,
  Loader2,
  Search,
  Filter,
  Clock,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import debounce from "lodash/debounce";

interface SearchResult {
  type: "user" | "workout" | "challenge" | "circle";
  id: string;
  name: string;
  subtitle?: string;
  imageUrl?: string;
  badges?: string[];
  metadata?: Record<string, unknown>;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-success/20 text-success",
  intermediate: "bg-energy/20 text-energy",
  advanced: "bg-destructive/20 text-destructive",
};

export default function DiscoverSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialType = searchParams.get("type") || "all";

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState(initialType);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    users: SearchResult[];
    workouts: SearchResult[];
    challenges: SearchResult[];
    circles: SearchResult[];
  }>({
    users: [],
    workouts: [],
    challenges: [],
    circles: [],
  });

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, type: string) => {
      if (!searchQuery || searchQuery.length < 2) {
        setResults({ users: [], workouts: [], challenges: [], circles: [] });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const params = new URLSearchParams({ q: searchQuery });
        if (type !== "all") {
          params.set("type", type);
        }

        const response = await fetch(`/api/discover/search?${params}`);
        if (!response.ok) throw new Error();

        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error("Search error:", error);
        toast.error("Search failed");
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(query, activeTab);
    return () => debouncedSearch.cancel();
  }, [query, activeTab, debouncedSearch]);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    // Update URL params
    const params = new URLSearchParams();
    if (value) params.set("q", value);
    if (activeTab !== "all") params.set("type", activeTab);
    router.replace(`/discover/search?${params}`, { scroll: false });
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (tab !== "all") params.set("type", tab);
    router.replace(`/discover/search?${params}`, { scroll: false });
  };

  const totalResults =
    results.users.length +
    results.workouts.length +
    results.challenges.length +
    results.circles.length;

  const getFilteredResults = () => {
    switch (activeTab) {
      case "users":
        return results.users;
      case "workouts":
        return results.workouts;
      case "challenges":
        return results.challenges;
      case "circles":
        return results.circles;
      default:
        return [
          ...results.users,
          ...results.workouts,
          ...results.challenges,
          ...results.circles,
        ];
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <SearchInput
            placeholder="Search users, workouts, challenges..."
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            containerClassName="flex-1"
            autoFocus
          />
        </div>

        {/* Filter Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="px-4">
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              All
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-1">
              <User className="h-3.5 w-3.5 mr-1" />
              People
            </TabsTrigger>
            <TabsTrigger value="workouts" className="flex-1">
              <Dumbbell className="h-3.5 w-3.5 mr-1" />
              Workouts
            </TabsTrigger>
            <TabsTrigger value="circles" className="flex-1">
              <Users className="h-3.5 w-3.5 mr-1" />
              Circles
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {/* Results */}
      <div className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !query || query.length < 2 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              Search for users, workouts, challenges, or circles
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Enter at least 2 characters to search
            </p>
          </div>
        ) : totalResults === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No results found for "{query}"</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Try a different search term
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Result count */}
            <p className="text-sm text-muted-foreground">
              {totalResults} result{totalResults !== 1 ? "s" : ""} for "{query}"
            </p>

            {/* Results list */}
            <div className="space-y-2">
              {getFilteredResults().map((result) => (
                <SearchResultCard
                  key={`${result.type}-${result.id}`}
                  result={result}
                  onClick={() => {
                    switch (result.type) {
                      case "user":
                        router.push(`/profile/${result.id}`);
                        break;
                      case "workout":
                        router.push(`/workout/${result.id}`);
                        break;
                      case "challenge":
                        router.push(`/challenge/${result.id}`);
                        break;
                      case "circle":
                        router.push(`/circle/${result.id}`);
                        break;
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResultCard({
  result,
  onClick,
}: {
  result: SearchResult;
  onClick: () => void;
}) {
  const typeIcons = {
    user: User,
    workout: Dumbbell,
    challenge: Trophy,
    circle: Users,
  };

  const typeLabels = {
    user: "Person",
    workout: "Workout",
    challenge: "Challenge",
    circle: "Circle",
  };

  const Icon = typeIcons[result.type];

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {result.type === "user" ? (
            <Avatar className="h-12 w-12">
              <AvatarImage src={result.imageUrl} />
              <AvatarFallback>{result.name.charAt(0)}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{result.name}</p>
              <Badge variant="outline" className="text-xs shrink-0">
                {typeLabels[result.type]}
              </Badge>
            </div>
            {result.subtitle && (
              <p className="text-sm text-muted-foreground truncate">
                {result.subtitle}
              </p>
            )}
            {result.badges && result.badges.length > 0 && (
              <div className="flex gap-1 mt-1">
                {result.badges.slice(0, 3).map((badge, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className={cn(
                      "text-xs",
                      DIFFICULTY_COLORS[badge.toLowerCase()] || ""
                    )}
                  >
                    {badge}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
