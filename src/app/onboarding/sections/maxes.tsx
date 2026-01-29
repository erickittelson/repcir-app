"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Plus, X, Trophy, Timer, Dumbbell, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SectionProps } from "./types";

interface MaxEntry {
  id: string;
  category: "strength" | "cardio" | "benchmark" | "skill";
  exercise: string;
  value: string;
  unit: string;
  confirmed: boolean;
}

// Strength exercises (weight-based)
const STRENGTH_EXERCISES = [
  { name: "Bench Press", unit: "lbs", placeholder: "225" },
  { name: "Squat", unit: "lbs", placeholder: "315" },
  { name: "Deadlift", unit: "lbs", placeholder: "405" },
  { name: "Strict Press", unit: "lbs", placeholder: "135" },
  { name: "Power Clean", unit: "lbs", placeholder: "185" },
  { name: "Pull-ups", unit: "reps", placeholder: "15" },
  { name: "Push-ups", unit: "reps", placeholder: "50" },
  { name: "Dips", unit: "reps", placeholder: "20" },
];

// Cardio exercises (time-based)
const CARDIO_EXERCISES = [
  { name: "Mile Run", unit: "mm:ss", placeholder: "7:30" },
  { name: "5K Run", unit: "mm:ss", placeholder: "25:00" },
  { name: "10K Run", unit: "hh:mm:ss", placeholder: "0:55:00" },
  { name: "Half Marathon", unit: "hh:mm:ss", placeholder: "2:00:00" },
  { name: "400m Sprint", unit: "ss.ms", placeholder: "60.0" },
  { name: "40 Yard Dash", unit: "ss.ms", placeholder: "4.8" },
  { name: "2K Row", unit: "mm:ss", placeholder: "7:00" },
];

// Benchmark WODs (time-based)
const BENCHMARK_EXERCISES = [
  { name: "Fran", unit: "mm:ss", placeholder: "3:30" },
  { name: "Grace", unit: "mm:ss", placeholder: "2:00" },
  { name: "Murph", unit: "mm:ss", placeholder: "45:00" },
  { name: "Cindy", unit: "rounds", placeholder: "20" },
  { name: "Helen", unit: "mm:ss", placeholder: "12:00" },
  { name: "Diane", unit: "mm:ss", placeholder: "8:00" },
];

// Skills (achievement-based, no numeric value)
const SKILL_EXERCISES = [
  { name: "Muscle Up", icon: "💪" },
  { name: "Handstand", icon: "🤸" },
  { name: "Handstand Walk", icon: "🚶" },
  { name: "Pistol Squat", icon: "🦵" },
  { name: "Double Unders", icon: "🪢" },
  { name: "Butterfly Pull-up", icon: "🦋" },
  { name: "Kipping Pull-up", icon: "🔄" },
  { name: "Rope Climb", icon: "🧗" },
  { name: "Back Tuck", icon: "🔙" },
  { name: "Back Handspring", icon: "⭐" },
  { name: "Front Flip", icon: "🌀" },
  { name: "Box Jump 40\"+", icon: "📦" },
];

const CATEGORIES = [
  { id: "strength", label: "Strength", icon: Dumbbell },
  { id: "cardio", label: "Cardio", icon: Timer },
  { id: "benchmark", label: "WODs", icon: Trophy },
  { id: "skill", label: "Skills", icon: Check },
] as const;

// Validation functions
const validateTimeFormat = (value: string, format: string): boolean => {
  if (!value) return false;
  
  if (format === "mm:ss") {
    // Allow m:ss or mm:ss format
    return /^\d{1,2}:\d{2}$/.test(value);
  }
  if (format === "hh:mm:ss") {
    // Allow h:mm:ss or hh:mm:ss format
    return /^\d{1,2}:\d{2}:\d{2}$/.test(value);
  }
  if (format === "ss.ms") {
    // Allow seconds with decimal
    return /^\d+\.?\d*$/.test(value);
  }
  return true;
};

const validateNumeric = (value: string): boolean => {
  return /^\d+$/.test(value);
};

const formatTimeInput = (value: string, format: string): string => {
  // Remove non-numeric except colons
  let cleaned = value.replace(/[^\d:]/g, "");
  
  if (format === "mm:ss" || format === "hh:mm:ss") {
    // Auto-add colons
    const digits = cleaned.replace(/:/g, "");
    if (format === "mm:ss" && digits.length > 2) {
      return digits.slice(0, -2) + ":" + digits.slice(-2);
    }
    if (format === "hh:mm:ss" && digits.length > 4) {
      return digits.slice(0, -4) + ":" + digits.slice(-4, -2) + ":" + digits.slice(-2);
    }
  }
  
  return cleaned;
};

export function MaxesSection({ data, onUpdate, onNext }: SectionProps) {
  const [entries, setEntries] = useState<MaxEntry[]>(
    data.currentMaxes?.map((m, i) => ({
      id: `existing-${i}`,
      category: "strength" as const,
      exercise: m.exercise,
      value: String(m.value),
      unit: m.unit,
      confirmed: true,
    })) || []
  );
  const [activeCategory, setActiveCategory] = useState<"strength" | "cardio" | "benchmark" | "skill">("strength");
  const [customName, setCustomName] = useState("");

  const getExerciseList = () => {
    switch (activeCategory) {
      case "strength": return STRENGTH_EXERCISES;
      case "cardio": return CARDIO_EXERCISES;
      case "benchmark": return BENCHMARK_EXERCISES;
      default: return [];
    }
  };

  const addExercise = (exercise: string, unit: string) => {
    if (entries.some((e) => e.exercise === exercise)) return;
    
    const newEntry: MaxEntry = {
      id: `${activeCategory}-${Date.now()}`,
      category: activeCategory,
      exercise,
      value: "",
      unit,
      confirmed: false,
    };
    setEntries((prev) => [...prev, newEntry]);
  };

  const addSkill = (skillName: string) => {
    if (entries.some((e) => e.exercise === skillName)) return;
    
    const newEntry: MaxEntry = {
      id: `skill-${Date.now()}`,
      category: "skill",
      exercise: skillName,
      value: "achieved",
      unit: "skill",
      confirmed: true, // Skills are auto-confirmed
    };
    setEntries((prev) => [...prev, newEntry]);
  };

  const addCustom = () => {
    if (!customName.trim()) return;
    const unit = activeCategory === "strength" ? "lbs" : 
                 activeCategory === "cardio" ? "mm:ss" : "mm:ss";
    addExercise(customName.trim(), unit);
    setCustomName("");
  };

  const updateValue = (id: string, value: string, unit: string) => {
    // Format and validate based on unit type
    let formattedValue = value;
    
    if (unit === "mm:ss" || unit === "hh:mm:ss") {
      formattedValue = formatTimeInput(value, unit);
    } else if (unit === "lbs" || unit === "reps" || unit === "rounds") {
      // Only allow numbers
      formattedValue = value.replace(/\D/g, "");
    } else if (unit === "ss.ms") {
      // Allow numbers and one decimal point
      formattedValue = value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
    }
    
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, value: formattedValue, confirmed: false } : e))
    );
  };

  const confirmEntry = (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry || !entry.value) return;
    
    // Validate before confirming
    let isValid = true;
    if (entry.unit === "mm:ss" || entry.unit === "hh:mm:ss") {
      isValid = validateTimeFormat(entry.value, entry.unit);
    } else if (entry.unit === "lbs" || entry.unit === "reps" || entry.unit === "rounds") {
      isValid = validateNumeric(entry.value);
    }
    
    if (isValid) {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, confirmed: true } : e))
      );
    }
  };

  const editEntry = (id: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, confirmed: false } : e))
    );
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleContinue = () => {
    // Only save confirmed entries with values (excluding skills which have "achieved")
    const validEntries = entries.filter((e) => e.confirmed && e.value);
    const currentMaxes = validEntries.map((e) => {
      let numericValue = 0;
      
      if (e.unit === "skill") {
        numericValue = 1; // Skill achieved
      } else if (e.unit === "mm:ss") {
        // Convert mm:ss to seconds
        const parts = e.value.split(":");
        numericValue = parseInt(parts[0]) * 60 + parseInt(parts[1]);
      } else if (e.unit === "hh:mm:ss") {
        // Convert hh:mm:ss to seconds
        const parts = e.value.split(":");
        numericValue = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
      } else {
        numericValue = parseFloat(e.value) || 0;
      }
      
      return {
        exercise: e.exercise,
        value: numericValue,
        unit: e.unit,
      };
    });
    onUpdate({ currentMaxes, maxesAcknowledged: true });
    onNext();
  };

  const confirmedCount = entries.filter((e) => e.confirmed && e.value).length;
  const hasUnconfirmed = entries.some((e) => !e.confirmed && e.value);

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg mx-auto w-full"
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <Trophy className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold mb-1">
            Track your PRs & Skills
          </h2>
          <p className="text-sm text-muted-foreground">
            Add your current bests (optional)
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 mb-3 bg-muted/50 rounded-lg p-1">
          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className={cn(
                "flex-1 py-2 px-2 rounded-md transition-all flex items-center justify-center gap-1",
                activeCategory === id
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Skills Tab - Chip Selection */}
        {activeCategory === "skill" && (
          <div className="bg-card rounded-xl border border-border p-3 mb-3">
            <p className="text-xs text-muted-foreground mb-2">Tap skills you&apos;ve achieved:</p>
            <div className="flex flex-wrap gap-1.5">
              {SKILL_EXERCISES.map(({ name, icon }) => {
                const isAdded = entries.some((e) => e.exercise === name);
                return (
                  <button
                    key={name}
                    onClick={() => isAdded ? removeEntry(entries.find(e => e.exercise === name)!.id) : addSkill(name)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                      isAdded
                        ? "bg-success/20 text-success border border-success/30"
                        : "bg-muted hover:bg-brand/10 hover:text-brand active:scale-95"
                    )}
                  >
                    <span>{icon}</span>
                    <span>{name}</span>
                    {isAdded && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Strength/Cardio/Benchmark Tabs - Quick Add */}
        {activeCategory !== "skill" && (
          <div className="bg-card rounded-xl border border-border p-3 mb-3">
            <p className="text-xs text-muted-foreground mb-2">Tap to add:</p>
            <div className="flex flex-wrap gap-1.5">
              {getExerciseList().map(({ name, unit }) => {
                const isAdded = entries.some((e) => e.exercise === name);
                return (
                  <button
                    key={name}
                    onClick={() => !isAdded && addExercise(name, unit)}
                    disabled={isAdded}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                      isAdded
                        ? "bg-brand/20 text-brand"
                        : "bg-muted hover:bg-brand/10 hover:text-brand active:scale-95"
                    )}
                  >
                    {isAdded ? <Check className="w-3 h-3 inline mr-1" /> : "+"} {name}
                  </button>
                );
              })}
            </div>
            
            {/* Custom Add */}
            <div className="flex gap-2 mt-2">
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustom()}
                placeholder="Add custom exercise..."
                className="flex-1 h-8 text-sm"
                style={{ fontSize: "16px" }}
              />
              <Button 
                onClick={addCustom} 
                size="sm" 
                variant="outline"
                disabled={!customName.trim()}
                className="h-8 px-3"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Added Entries - Enter & Confirm Values */}
        {entries.filter(e => e.category !== "skill").length > 0 && (
          <div className="bg-card rounded-xl border border-border p-3 mb-3">
            <p className="text-xs text-muted-foreground mb-2">
              Enter your current best:
            </p>
            <div className="space-y-2 max-h-36 overflow-y-auto overscroll-contain">
              <AnimatePresence mode="popLayout">
                {entries.filter(e => e.category !== "skill").map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2"
                  >
                    <span className="flex-1 text-sm font-medium truncate min-w-0">
                      {entry.exercise}
                    </span>
                    
                    {entry.confirmed ? (
                      // Confirmed state - show value and edit button
                      <>
                        <span className="text-sm font-bold text-brand">
                          {entry.value} {entry.unit === "lbs" ? "lbs" : entry.unit === "reps" ? "reps" : entry.unit === "rounds" ? "rds" : ""}
                        </span>
                        <button
                          onClick={() => editEntry(entry.id)}
                          className="p-1.5 hover:bg-muted rounded-lg"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="p-1.5 hover:bg-destructive/10 rounded-lg"
                          title="Remove"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </>
                    ) : (
                      // Edit state - show input and confirm button
                      <>
                        <div className="flex items-center gap-1">
                          <Input
                            value={entry.value}
                            onChange={(e) => updateValue(entry.id, e.target.value, entry.unit)}
                            placeholder={
                              entry.unit === "mm:ss" ? "0:00" :
                              entry.unit === "hh:mm:ss" ? "0:00:00" :
                              entry.unit === "ss.ms" ? "0.0" : "0"
                            }
                            className={cn(
                              "w-20 h-8 text-center text-sm",
                              entry.value && !validateInput(entry.value, entry.unit) && "border-destructive"
                            )}
                            style={{ fontSize: "16px" }}
                          />
                          <span className="text-[10px] text-muted-foreground w-8">
                            {entry.unit === "mm:ss" ? "m:s" : 
                             entry.unit === "hh:mm:ss" ? "h:m:s" :
                             entry.unit === "ss.ms" ? "sec" :
                             entry.unit}
                          </span>
                        </div>
                        <button
                          onClick={() => confirmEntry(entry.id)}
                          disabled={!entry.value || !validateInput(entry.value, entry.unit)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            entry.value && validateInput(entry.value, entry.unit)
                              ? "bg-success/20 hover:bg-success/30 text-success"
                              : "bg-muted text-muted-foreground"
                          )}
                          title="Confirm"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="p-1.5 hover:bg-destructive/10 rounded-lg"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Skills Summary */}
        {entries.filter(e => e.category === "skill").length > 0 && (
          <div className="bg-success/10 rounded-xl border border-success/20 p-3 mb-3">
            <p className="text-xs text-success font-medium mb-1">
              Skills achieved ({entries.filter(e => e.category === "skill").length}):
            </p>
            <div className="flex flex-wrap gap-1">
              {entries.filter(e => e.category === "skill").map((entry) => (
                <span key={entry.id} className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                  {entry.exercise}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Warning for unconfirmed entries */}
        {hasUnconfirmed && (
          <p className="text-xs text-amber-500 text-center mb-2">
            ⚠️ Some entries need to be confirmed
          </p>
        )}

        {/* Continue Button */}
        <Button
          onClick={handleContinue}
          disabled={hasUnconfirmed}
          className="w-full h-12 text-lg bg-energy-gradient hover:opacity-90 rounded-xl group disabled:opacity-50"
        >
          {confirmedCount > 0 
            ? `Continue with ${confirmedCount} PR${confirmedCount > 1 ? "s" : ""}`
            : "Skip for now"
          }
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
        
        <p className="text-xs text-center text-muted-foreground mt-2">
          You can always add more later in your profile
        </p>
      </motion.div>
    </div>
  );
}

// Helper function for input validation
function validateInput(value: string, unit: string): boolean {
  if (!value) return false;
  
  if (unit === "mm:ss") {
    return /^\d{1,2}:\d{2}$/.test(value);
  }
  if (unit === "hh:mm:ss") {
    return /^\d{1,2}:\d{2}:\d{2}$/.test(value);
  }
  if (unit === "ss.ms") {
    return /^\d+\.?\d*$/.test(value) && parseFloat(value) > 0;
  }
  if (unit === "lbs" || unit === "reps" || unit === "rounds") {
    return /^\d+$/.test(value) && parseInt(value) > 0;
  }
  return true;
}
