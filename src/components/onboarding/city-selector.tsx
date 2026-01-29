"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";

interface CitySelectorProps {
  currentCity?: string;
  onSubmit: (city: string) => void;
  onSkip: () => void;
  className?: string;
}

// Major cities for quick selection
const POPULAR_CITIES = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Phoenix",
  "San Francisco",
  "Seattle",
  "Denver",
  "Austin",
  "Boston",
  "Miami",
  "Atlanta",
  "Dallas",
  "San Diego",
  "Portland",
];

export function CitySelector({
  currentCity,
  onSubmit,
  onSkip,
  className,
}: CitySelectorProps) {
  const [city, setCity] = useState(currentCity ?? "");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    if (!searchQuery) return POPULAR_CITIES;
    const query = searchQuery.toLowerCase();
    return POPULAR_CITIES.filter((c) => c.toLowerCase().includes(query));
  }, [searchQuery]);

  const handleSubmit = useCallback(() => {
    if (city.trim()) {
      onSubmit(city.trim());
    }
  }, [city, onSubmit]);

  const handleCitySelect = useCallback((selectedCity: string) => {
    setCity(selectedCity);
    setSearchQuery("");
  }, []);

  const isComplete = city.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-4", className)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <MapPin className="w-4 h-4" />
        <span className="text-sm">Your city (optional)</span>
      </div>

      {/* Why we ask */}
      <p className="text-sm text-muted-foreground">
        This helps you find workout partners and connect with people in your area.
      </p>

      {/* Search/Input */}
      <SearchInput
        value={city || searchQuery}
        onChange={(e) => {
          setCity("");
          setSearchQuery(e.target.value);
        }}
        placeholder="Search or type your city..."
      />

      {/* Quick select cities */}
      {!city && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Popular cities:</p>
          <div className="flex flex-wrap gap-2">
            {filteredCities.slice(0, 8).map((c) => (
              <Button
                key={c}
                variant="outline"
                size="sm"
                onClick={() => handleCitySelect(c)}
                className="text-xs h-7"
              >
                {c}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Selected city display */}
      {city && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 p-3 rounded-lg bg-brand/10 border border-brand/20"
        >
          <MapPin className="w-4 h-4 text-brand" />
          <span className="font-medium">{city}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 text-xs"
            onClick={() => {
              setCity("");
              setSearchQuery("");
            }}
          >
            Change
          </Button>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="ghost"
          onClick={onSkip}
          className="flex-1"
        >
          Skip for now
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isComplete}
          className={cn(
            "flex-1 gap-2",
            isComplete && "bg-brand hover:bg-brand/90"
          )}
        >
          <Check className="w-4 h-4" />
          Confirm
        </Button>
      </div>
    </motion.div>
  );
}
