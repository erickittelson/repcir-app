"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Check, X, Trophy, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { OnboardingActions } from "./onboarding-actions";
import type { SectionProps } from "./types";

interface Sport {
  id: string;
  name: string;
  icon: string;
  category: "team" | "combat" | "fitness" | "outdoor" | "racquet" | "other";
}

const SPORTS_DATABASE: Sport[] = [
  // Team Sports
  { id: "baseball", name: "Baseball", icon: "⚾", category: "team" },
  { id: "basketball", name: "Basketball", icon: "🏀", category: "team" },
  { id: "football", name: "Football", icon: "🏈", category: "team" },
  { id: "soccer", name: "Soccer", icon: "⚽", category: "team" },
  { id: "hockey", name: "Hockey", icon: "🏒", category: "team" },
  { id: "lacrosse", name: "Lacrosse", icon: "🥍", category: "team" },
  { id: "volleyball", name: "Volleyball", icon: "🏐", category: "team" },
  { id: "rugby", name: "Rugby", icon: "🏉", category: "team" },
  { id: "softball", name: "Softball", icon: "🥎", category: "team" },
  { id: "water_polo", name: "Water Polo", icon: "🤽", category: "team" },
  { id: "field_hockey", name: "Field Hockey", icon: "🏑", category: "team" },
  { id: "cricket", name: "Cricket", icon: "🏏", category: "team" },
  
  // Combat Sports
  { id: "boxing", name: "Boxing", icon: "🥊", category: "combat" },
  { id: "mma", name: "MMA", icon: "🥋", category: "combat" },
  { id: "bjj", name: "Brazilian Jiu-Jitsu", icon: "🥋", category: "combat" },
  { id: "wrestling", name: "Wrestling", icon: "🤼", category: "combat" },
  { id: "judo", name: "Judo", icon: "🥋", category: "combat" },
  { id: "kickboxing", name: "Kickboxing", icon: "🦵", category: "combat" },
  { id: "muay_thai", name: "Muay Thai", icon: "🥊", category: "combat" },
  { id: "taekwondo", name: "Taekwondo", icon: "🥋", category: "combat" },
  { id: "karate", name: "Karate", icon: "🥋", category: "combat" },
  { id: "fencing", name: "Fencing", icon: "🤺", category: "combat" },
  
  // Fitness / Training
  { id: "crossfit", name: "CrossFit", icon: "🏋️", category: "fitness" },
  { id: "bodybuilding", name: "Bodybuilding", icon: "💪", category: "fitness" },
  { id: "powerlifting", name: "Powerlifting", icon: "🏋️", category: "fitness" },
  { id: "olympic_weightlifting", name: "Olympic Weightlifting", icon: "🏋️", category: "fitness" },
  { id: "yoga", name: "Yoga", icon: "🧘", category: "fitness" },
  { id: "pilates", name: "Pilates", icon: "🤸", category: "fitness" },
  { id: "gymnastics", name: "Gymnastics", icon: "🤸", category: "fitness" },
  { id: "calisthenics", name: "Calisthenics", icon: "💪", category: "fitness" },
  { id: "functional_training", name: "Functional Training", icon: "🔄", category: "fitness" },
  { id: "hiit", name: "HIIT", icon: "⚡", category: "fitness" },
  { id: "spinning", name: "Spinning/Cycling Class", icon: "🚴", category: "fitness" },
  { id: "aerobics", name: "Aerobics", icon: "🎵", category: "fitness" },
  
  // Outdoor / Endurance
  { id: "running", name: "Running", icon: "🏃", category: "outdoor" },
  { id: "cycling", name: "Cycling", icon: "🚴", category: "outdoor" },
  { id: "swimming", name: "Swimming", icon: "🏊", category: "outdoor" },
  { id: "triathlon", name: "Triathlon", icon: "🏊", category: "outdoor" },
  { id: "marathon", name: "Marathon/Distance Running", icon: "🏃", category: "outdoor" },
  { id: "trail_running", name: "Trail Running", icon: "🏔️", category: "outdoor" },
  { id: "hiking", name: "Hiking", icon: "🥾", category: "outdoor" },
  { id: "rock_climbing", name: "Rock Climbing", icon: "🧗", category: "outdoor" },
  { id: "surfing", name: "Surfing", icon: "🏄", category: "outdoor" },
  { id: "skiing", name: "Skiing", icon: "⛷️", category: "outdoor" },
  { id: "snowboarding", name: "Snowboarding", icon: "🏂", category: "outdoor" },
  { id: "rowing", name: "Rowing", icon: "🚣", category: "outdoor" },
  { id: "kayaking", name: "Kayaking", icon: "🛶", category: "outdoor" },
  { id: "skateboarding", name: "Skateboarding", icon: "🛹", category: "outdoor" },
  
  // Racquet Sports
  { id: "tennis", name: "Tennis", icon: "🎾", category: "racquet" },
  { id: "pickleball", name: "Pickleball", icon: "🏓", category: "racquet" },
  { id: "badminton", name: "Badminton", icon: "🏸", category: "racquet" },
  { id: "squash", name: "Squash", icon: "🎾", category: "racquet" },
  { id: "racquetball", name: "Racquetball", icon: "🎾", category: "racquet" },
  { id: "table_tennis", name: "Table Tennis", icon: "🏓", category: "racquet" },
  { id: "padel", name: "Padel", icon: "🎾", category: "racquet" },
  
  // Other
  { id: "golf", name: "Golf", icon: "⛳", category: "other" },
  { id: "bowling", name: "Bowling", icon: "🎳", category: "other" },
  { id: "archery", name: "Archery", icon: "🏹", category: "other" },
  { id: "shooting", name: "Shooting Sports", icon: "🎯", category: "other" },
  { id: "equestrian", name: "Equestrian", icon: "🏇", category: "other" },
  { id: "track_field", name: "Track & Field", icon: "🏃", category: "other" },
  { id: "cheerleading", name: "Cheerleading", icon: "📣", category: "other" },
  { id: "dance", name: "Dance", icon: "💃", category: "other" },
  { id: "figure_skating", name: "Figure Skating", icon: "⛸️", category: "other" },
  { id: "esports", name: "Esports", icon: "🎮", category: "other" },
];

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "team", label: "Team" },
  { id: "combat", label: "Combat" },
  { id: "fitness", label: "Fitness" },
  { id: "outdoor", label: "Outdoor" },
  { id: "racquet", label: "Racquet" },
  { id: "other", label: "Other" },
];

export function SportsSection({ data, onUpdate, onNext, onBack }: SectionProps) {
  const [selectedSports, setSelectedSports] = useState<string[]>(
    data.sports?.map(s => s.id) || []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Filter sports based on search and category
  const filteredSports = useMemo(() => {
    let sports = SPORTS_DATABASE;
    
    if (activeCategory !== "all") {
      sports = sports.filter(s => s.category === activeCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      sports = sports.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.id.includes(query)
      );
    }
    
    return sports;
  }, [searchQuery, activeCategory]);

  const toggleSport = (sportId: string) => {
    setSelectedSports(prev => {
      if (prev.includes(sportId)) {
        return prev.filter(id => id !== sportId);
      }
      return [...prev, sportId];
    });
  };

  const removeSport = (sportId: string) => {
    setSelectedSports(prev => prev.filter(id => id !== sportId));
  };

  const handleContinue = () => {
    const sports = selectedSports.map(id => {
      const sport = SPORTS_DATABASE.find(s => s.id === id);
      return {
        id,
        name: sport?.name || id,
        icon: sport?.icon || "🏃",
      };
    });
    onUpdate({ sports, sportsAcknowledged: true });
    onNext();
  };

  const selectedSportsData = selectedSports
    .map(id => SPORTS_DATABASE.find(s => s.id === id))
    .filter(Boolean) as Sport[];

  return (
    <div className="min-h-full flex flex-col items-center justify-start py-6 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg mx-auto w-full"
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-brand/10 flex items-center justify-center">
            <Activity className="w-7 h-7 text-brand" />
          </div>
          <h2 className="text-2xl font-bold mb-1">
            What sports do you play?
          </h2>
          <p className="text-sm text-muted-foreground">
            Select all that apply (optional)
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search sports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
            style={{ fontSize: "16px" }}
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
          {CATEGORIES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                activeCategory === id
                  ? "bg-brand text-white"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Selected Sports */}
        {selectedSports.length > 0 && (
          <div className="bg-success/10 rounded-xl border border-success/20 p-3 mb-3">
            <p className="text-xs text-success font-medium mb-2">
              Selected ({selectedSports.length}):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedSportsData.map((sport) => (
                <button
                  key={sport.id}
                  onClick={() => removeSport(sport.id)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-success/20 text-success flex items-center gap-1 hover:bg-success/30 transition-colors"
                >
                  <span>{sport.icon}</span>
                  <span>{sport.name}</span>
                  <X className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sports Grid */}
        <div className="bg-card rounded-xl border border-border p-3 mb-3 max-h-52 overflow-y-auto">
          {filteredSports.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              No sports found. Try a different search.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {filteredSports.map((sport) => {
                const isSelected = selectedSports.includes(sport.id);
                return (
                  <button
                    key={sport.id}
                    onClick={() => toggleSport(sport.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all",
                      isSelected
                        ? "bg-brand/20 text-brand border border-brand/30"
                        : "bg-muted/50 hover:bg-muted text-foreground"
                    )}
                  >
                    <span className="text-lg">{sport.icon}</span>
                    <span className="text-xs font-medium truncate flex-1">{sport.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Continue Button */}
        <OnboardingActions
          onNext={handleContinue}
          onBack={onBack}
          nextLabel={selectedSports.length > 0
            ? `Continue with ${selectedSports.length} sport${selectedSports.length > 1 ? "s" : ""}`
            : "Skip for now"
          }
        />
        
        <p className="text-xs text-center text-muted-foreground mt-2">
          You can always add more later in your profile
        </p>
      </motion.div>
    </div>
  );
}
