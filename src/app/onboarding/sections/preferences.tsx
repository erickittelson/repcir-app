"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Clock, Calendar, Check, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { OnboardingActions } from "./onboarding-actions";
import type { SectionProps } from "./types";

interface CityResult {
  id: number;
  label: string;
  city: string;
  state: string;
  country: string;
}

const DURATION_STYLES = [
  { 
    id: "quick", 
    label: "Quick Sessions", 
    description: "15-30 min focused workouts",
    emoji: "⚡",
    avgDuration: 20,
  },
  { 
    id: "standard", 
    label: "Standard", 
    description: "45-60 min balanced sessions",
    emoji: "💪",
    avgDuration: 50,
  },
  { 
    id: "extended", 
    label: "Extended", 
    description: "75-90+ min deep training",
    emoji: "🔥",
    avgDuration: 80,
  },
  { 
    id: "varies", 
    label: "It Varies", 
    description: "Mix of short & long sessions, two-a-days",
    emoji: "🔄",
    avgDuration: 60,
  },
];

const DAYS = [
  { id: "monday", label: "Mon" },
  { id: "tuesday", label: "Tue" },
  { id: "wednesday", label: "Wed" },
  { id: "thursday", label: "Thu" },
  { id: "friday", label: "Fri" },
  { id: "saturday", label: "Sat" },
  { id: "sunday", label: "Sun" },
];

export function PreferencesSection({ data, onUpdate, onNext, onBack }: SectionProps) {
  const [step, setStep] = useState<"duration" | "days" | "city">("duration");
  const [durationStyle, setDurationStyle] = useState(
    data.workoutDuration 
      ? data.workoutDuration <= 30 ? "quick" 
        : data.workoutDuration <= 60 ? "standard" 
        : data.workoutDuration <= 90 ? "extended" 
        : "varies"
      : ""
  );
  const [selectedDays, setSelectedDays] = useState<string[]>(data.workoutDays || []);
  const [city, setCity] = useState(data.city || "");
  const [cityState, setCityState] = useState(data.state || "");
  const [cityCountry, setCityCountry] = useState(data.country || "");
  const [cityDisplay, setCityDisplay] = useState(
    data.city ? [data.city, data.state, data.country].filter(Boolean).join(", ") : ""
  );
  const [citySearch, setCitySearch] = useState("");
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced city search via our API proxy
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!citySearch || citySearch.length < 3) {
      setCityResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(citySearch)}`);
        if (res.ok) {
          const data: CityResult[] = await res.json();
          setCityResults(data);
        }
      } catch {
        // silent
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [citySearch]);

  const handleDurationSelect = (id: string) => {
    setDurationStyle(id);
    const style = DURATION_STYLES.find(s => s.id === id);
    if (style) {
      onUpdate({ workoutDuration: style.avgDuration });
    }
  };

  const handleDurationContinue = () => {
    if (durationStyle) {
      setStep("days");
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleDaysContinue = () => {
    onUpdate({ workoutDays: selectedDays });
    setStep("city");
  };

  const handleCitySelect = (result: CityResult) => {
    setCity(result.city);
    setCityState(result.state);
    setCityCountry(result.country);
    const display = [result.city, result.state, result.country].filter(Boolean).join(", ");
    setCityDisplay(display);
    setCitySearch("");
    setCityResults([]);
  };

  const handleContinue = () => {
    if (city.trim()) {
      onUpdate({ city: city.trim(), state: cityState.trim(), country: cityCountry.trim() });
    }
    onNext();
  };

  const handleSkipCity = () => {
    onNext();
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-start py-6 px-6">
      <div className="max-w-md mx-auto w-full">
        {step === "duration" && (
          <motion.div
            key="duration"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Clock className="w-8 h-8 text-brand" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              How long are your workouts?
            </h2>
            <p className="text-muted-foreground mb-6">
              Pick what fits your typical training style
            </p>

            <div className="space-y-2 mb-6">
              {DURATION_STYLES.map(({ id, label, description, emoji }) => (
                <button
                  key={id}
                  onClick={() => handleDurationSelect(id)}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border-2 transition-all",
                    "flex items-center gap-3 text-left",
                    "hover:border-brand hover:bg-brand/5",
                    durationStyle === id
                      ? "border-brand bg-brand/10"
                      : "border-border bg-card"
                  )}
                >
                  <span className="text-2xl">{emoji}</span>
                  <div className="flex-1">
                    <span className="font-semibold block">{label}</span>
                    <span className="text-xs text-muted-foreground">{description}</span>
                  </div>
                  {durationStyle === id && (
                    <Check className="w-5 h-5 text-brand" />
                  )}
                </button>
              ))}
            </div>

            <OnboardingActions
              onNext={handleDurationContinue}
              onBack={onBack}
              nextDisabled={!durationStyle}
            />
          </motion.div>
        )}

        {step === "days" && (
          <motion.div
            key="days"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-brand" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Which days work best?
            </h2>
            <p className="text-muted-foreground mb-6">
              We&apos;ll schedule your workouts on these days
            </p>

            <div className="flex justify-center gap-2 mb-6">
              {DAYS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => toggleDay(id)}
                  className={cn(
                    "relative w-12 h-12 rounded-xl border-2 transition-all",
                    "flex items-center justify-center font-medium text-sm",
                    "hover:border-brand hover:bg-brand/5",
                    selectedDays.includes(id)
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border bg-card"
                  )}
                >
                  {label}
                  {selectedDays.includes(id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand flex items-center justify-center"
                    >
                      <Check className="w-2.5 h-2.5 text-white" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>

            <OnboardingActions
              onNext={handleDaysContinue}
              onBack={onBack}
              nextDisabled={selectedDays.length === 0}
            />
          </motion.div>
        )}

        {step === "city" && (
          <motion.div
            key="city"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-brand" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Where are you based?
            </h2>
            <p className="text-muted-foreground mb-6">
              This helps you connect with others in your area
            </p>

            {/* City input */}
            <div className="relative mb-4">
              <Input
                value={city ? cityDisplay : citySearch}
                onChange={(e) => {
                  setCity("");
                  setCityState("");
                  setCityCountry("");
                  setCityDisplay("");
                  setCitySearch(e.target.value);
                }}
                placeholder="Start typing your city..."
                className="h-12 text-center text-lg"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Geocoding search results */}
            {!city && cityResults.length > 0 && (
              <div className="space-y-1 mb-6">
                {cityResults.map((result) => {
                  const display = [result.city, result.state, result.country]
                    .filter(Boolean)
                    .join(", ") || result.label;
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleCitySelect(result)}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border transition-all text-left",
                        "flex items-center gap-3",
                        "hover:border-brand hover:bg-brand/5",
                        "border-border bg-card"
                      )}
                    >
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm">{display}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Hint when no search yet */}
            {!city && cityResults.length === 0 && !isSearching && !citySearch && (
              <p className="text-sm text-muted-foreground mb-6">
                Results will appear as you type
              </p>
            )}

            {/* No results */}
            {!city && citySearch.length >= 3 && cityResults.length === 0 && !isSearching && (
              <p className="text-sm text-muted-foreground mb-6">
                No results found. Try a different spelling.
              </p>
            )}

            {/* Selected city display */}
            {city && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-2 p-3 rounded-lg bg-brand/10 border border-brand/20 mb-6"
              >
                <MapPin className="w-4 h-4 text-brand" />
                <span className="font-medium">{cityDisplay}</span>
                <button
                  className="ml-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setCity("");
                    setCityState("");
                    setCityCountry("");
                    setCityDisplay("");
                    setCitySearch("");
                    setCityResults([]);
                  }}
                >
                  Change
                </button>
              </motion.div>
            )}

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={handleSkipCity}
                className="flex-1 h-12"
              >
                Skip for now
              </Button>
              <OnboardingActions
                onNext={handleContinue}
                onBack={onBack}
                nextDisabled={!city.trim() && !citySearch.trim()}
                className="flex-1"
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
