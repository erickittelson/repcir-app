"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface BirthdaySelectorProps {
  currentMonth?: number;
  currentYear?: number;
  onSubmit: (month: number, year: number) => void;
  onSkip?: () => void;
  className?: string;
}

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export function BirthdaySelector({
  currentMonth,
  currentYear,
  onSubmit,
  onSkip,
  className,
}: BirthdaySelectorProps) {
  const [month, setMonth] = useState<number | null>(currentMonth ?? null);
  const [year, setYear] = useState<number | null>(currentYear ?? null);

  // Generate years from 1920 to current year - 13 (minimum age for app usage)
  const currentYearNum = new Date().getFullYear();
  const years = useMemo(() => {
    const result: number[] = [];
    for (let y = currentYearNum - 13; y >= 1920; y--) {
      result.push(y);
    }
    return result;
  }, [currentYearNum]);

  // Calculate age from selection
  const calculatedAge = useMemo(() => {
    if (!month || !year) return null;
    const today = new Date();
    let age = today.getFullYear() - year;
    // Adjust if birthday hasn't occurred yet this year
    if (today.getMonth() + 1 < month) {
      age--;
    }
    return age;
  }, [month, year]);

  const handleSubmit = useCallback(() => {
    if (month && year) {
      onSubmit(month, year);
    }
  }, [month, year, onSubmit]);

  const isComplete = month !== null && year !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-4", className)}
    >
      {/* Icon header */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span className="text-sm">Birthday (month & year)</span>
      </div>

      {/* Selectors */}
      <div className="flex gap-3">
        {/* Month selector */}
        <Select
          value={month?.toString() ?? ""}
          onValueChange={(value) => setMonth(parseInt(value, 10))}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value.toString()}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Year selector */}
        <Select
          value={year?.toString() ?? ""}
          onValueChange={(value) => setYear(parseInt(value, 10))}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Age display */}
      {calculatedAge !== null && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground"
        >
          That makes you <span className="font-medium text-foreground">{calculatedAge} years old</span>
        </motion.p>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        {onSkip && (
          <Button
            variant="ghost"
            onClick={onSkip}
            className="flex-1"
          >
            Skip for now
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!isComplete}
          className={cn(
            "gap-2",
            onSkip ? "flex-1" : "w-full",
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
