"use client";

import { useState, useCallback } from "react";
import { US_STATES } from "@/lib/constants/us-states";
import { motion } from "framer-motion";
import {
  User,
  Calendar,
  Ruler,
  Scale,
  Dumbbell,
  Clock,
  MapPin,
  Lock,
  Globe,
  Check,
  ChevronUp,
  ChevronDown,
  Target,
  Activity,
  AlertTriangle,
  Trophy,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Common wrapper for all inline form fields
interface InlineFieldWrapperProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onSubmit: () => void;
  onSkip?: () => void;
  onClose?: () => void;
  submitLabel?: string;
  submitDisabled?: boolean;
  showSkip?: boolean;
  className?: string;
}

function InlineFieldWrapper({
  title,
  subtitle,
  icon,
  children,
  onSubmit,
  onSkip,
  onClose,
  submitLabel = "Continue",
  submitDisabled = false,
  showSkip = false,
  className,
}: InlineFieldWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("mx-auto max-w-md", className)}
      style={{ margin: "1rem auto" }}
    >
      <div
        className="bg-card rounded-2xl border border-border/50 shadow-lg relative"
        style={{ padding: "1.25rem" }}
      >
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
            style={{ padding: "0.25rem" }}
          >
            <X style={{ width: "1.25rem", height: "1.25rem" }} />
          </button>
        )}

        {/* Header */}
        <div
          className="flex items-center"
          style={{ gap: "0.75rem", marginBottom: "1rem", paddingRight: onClose ? "1.5rem" : "0" }}
        >
          <div
            className="rounded-xl bg-brand/10 flex items-center justify-center"
            style={{ width: "2.5rem", height: "2.5rem" }}
          >
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ marginBottom: "1rem" }}>{children}</div>

        {/* Actions */}
        <div className="flex" style={{ gap: "0.75rem" }}>
          {showSkip && onSkip && (
            <Button variant="ghost" onClick={onSkip} className="flex-1 h-12">
              Skip
            </Button>
          )}
          <Button
            onClick={onSubmit}
            disabled={submitDisabled}
            className={cn(
              "h-12 bg-energy-gradient hover:opacity-90 text-white font-semibold rounded-xl shadow-lg glow-brand transition-all",
              showSkip ? "flex-1" : "w-full"
            )}
          >
            <Check style={{ width: "1.25rem", height: "1.25rem", marginRight: "0.5rem" }} />
            {submitLabel}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// NAME INPUT
// ============================================================================

interface NameInputProps {
  onSubmit: (name: string) => void;
  initialValue?: string;
}

export function NameInput({ onSubmit, initialValue = "" }: NameInputProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <InlineFieldWrapper
      title="What should I call you?"
      subtitle="Your preferred name or nickname"
      icon={<User style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />}
      onSubmit={() => onSubmit(value.trim())}
      submitDisabled={!value.trim()}
      submitLabel="That's me!"
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter your name"
        autoFocus
        className="w-full rounded-xl bg-surface border border-border/50 text-lg font-medium text-foreground text-center focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50 transition-all duration-200"
        style={{ height: "3rem", padding: "0 1rem" }}
        onKeyDown={(e) => e.key === "Enter" && value.trim() && onSubmit(value.trim())}
      />
    </InlineFieldWrapper>
  );
}

// ============================================================================
// BIRTHDAY SELECTOR
// ============================================================================

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 80 }, (_, i) => currentYear - 16 - i);

interface BirthdaySelectorProps {
  onSubmit: (month: number, year: number) => void;
  initialMonth?: number;
  initialYear?: number;
}

export function BirthdaySelector({
  onSubmit,
  initialMonth,
  initialYear,
}: BirthdaySelectorProps) {
  const [month, setMonth] = useState<number | null>(initialMonth ?? null);
  const [year, setYear] = useState<number | null>(initialYear ?? null);

  const age = month && year
    ? Math.floor((Date.now() - new Date(year, month - 1).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <InlineFieldWrapper
      title="When's your birthday?"
      subtitle={age ? `${age} years old` : "Month and year only"}
      icon={<Calendar style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />}
      onSubmit={() => month && year && onSubmit(month, year)}
      submitDisabled={!month || !year}
    >
      <div className="flex" style={{ gap: "0.75rem" }}>
        {/* Month selector */}
        <select
          value={month ?? ""}
          onChange={(e) => setMonth(Number(e.target.value) || null)}
          className="flex-1 rounded-xl appearance-none cursor-pointer bg-surface border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50"
          style={{ height: "3rem", padding: "0 0.75rem" }}
        >
          <option value="">Month</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>

        {/* Year selector */}
        <select
          value={year ?? ""}
          onChange={(e) => setYear(Number(e.target.value) || null)}
          className="flex-1 rounded-xl appearance-none cursor-pointer bg-surface border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50"
          style={{ height: "3rem", padding: "0 0.75rem" }}
        >
          <option value="">Year</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </InlineFieldWrapper>
  );
}

// ============================================================================
// GENDER SELECTOR
// ============================================================================

interface GenderSelectorProps {
  onSubmit: (gender: "male" | "female" | "other") => void;
  initialValue?: string;
}

export function GenderSelector({ onSubmit, initialValue }: GenderSelectorProps) {
  const [selected, setSelected] = useState<"male" | "female" | "other" | null>(
    (initialValue as "male" | "female" | "other") ?? null
  );

  const options = [
    { value: "male" as const, label: "Male" },
    { value: "female" as const, label: "Female" },
    { value: "other" as const, label: "Other" },
  ];

  return (
    <InlineFieldWrapper
      title="How do you identify?"
      icon={<User style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />}
      onSubmit={() => selected && onSubmit(selected)}
      submitDisabled={!selected}
    >
      <div className="flex" style={{ gap: "0.5rem" }}>
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className={cn(
              "flex-1 rounded-xl font-medium transition-all",
              selected === opt.value
                ? "bg-brand text-white shadow-lg ring-2 ring-brand ring-offset-2 ring-offset-background"
                : "bg-surface border border-border/50 text-foreground hover:border-brand/50"
            )}
            style={{ height: "3rem" }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </InlineFieldWrapper>
  );
}

// ============================================================================
// HEIGHT INPUT
// ============================================================================

interface HeightInputProps {
  onSubmit: (feet: number, inches: number) => void;
  initialFeet?: number;
  initialInches?: number;
}

export function HeightInput({
  onSubmit,
  initialFeet,
  initialInches,
}: HeightInputProps) {
  const [feet, setFeet] = useState(initialFeet ?? 5);
  const [inches, setInches] = useState(initialInches ?? 6);

  return (
    <InlineFieldWrapper
      title="How tall are you?"
      subtitle={`${feet}'${inches}"`}
      icon={<Ruler style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />}
      onSubmit={() => onSubmit(feet, inches)}
    >
      <div className="flex items-center justify-center" style={{ gap: "1rem" }}>
        {/* Feet */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setFeet(Math.min(feet + 1, 8))}
            className="text-muted-foreground hover:text-foreground"
            style={{ padding: "0.5rem" }}
          >
            <ChevronUp style={{ width: "1.25rem", height: "1.25rem" }} />
          </button>
          <div className="text-4xl font-bold text-foreground tabular-nums">{feet}</div>
          <div className="text-sm text-muted-foreground">feet</div>
          <button
            onClick={() => setFeet(Math.max(feet - 1, 4))}
            className="text-muted-foreground hover:text-foreground"
            style={{ padding: "0.5rem" }}
          >
            <ChevronDown style={{ width: "1.25rem", height: "1.25rem" }} />
          </button>
        </div>

        <div className="text-3xl text-muted-foreground">'</div>

        {/* Inches */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setInches(Math.min(inches + 1, 11))}
            className="text-muted-foreground hover:text-foreground"
            style={{ padding: "0.5rem" }}
          >
            <ChevronUp style={{ width: "1.25rem", height: "1.25rem" }} />
          </button>
          <div className="text-4xl font-bold text-foreground tabular-nums">{inches}</div>
          <div className="text-sm text-muted-foreground">inches</div>
          <button
            onClick={() => setInches(Math.max(inches - 1, 0))}
            className="text-muted-foreground hover:text-foreground"
            style={{ padding: "0.5rem" }}
          >
            <ChevronDown style={{ width: "1.25rem", height: "1.25rem" }} />
          </button>
        </div>

        <div className="text-3xl text-muted-foreground">"</div>
      </div>
    </InlineFieldWrapper>
  );
}

// ============================================================================
// WEIGHT INPUT
// ============================================================================

interface WeightInputProps {
  onSubmit: (weight: number) => void;
  initialValue?: number;
  label?: string;
  isTarget?: boolean;
  showSkip?: boolean;
  onSkip?: () => void;
}

export function WeightInput({
  onSubmit,
  initialValue,
  label = "What's your current weight?",
  isTarget = false,
  showSkip = false,
  onSkip,
}: WeightInputProps) {
  const [weight, setWeight] = useState(initialValue ?? 150);

  const increment = (amount: number) => {
    setWeight(Math.max(50, Math.min(500, weight + amount)));
  };

  return (
    <InlineFieldWrapper
      title={label}
      subtitle={isTarget ? "Your goal weight" : undefined}
      icon={isTarget
        ? <Target style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />
        : <Scale style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />
      }
      onSubmit={() => onSubmit(weight)}
      showSkip={showSkip}
      onSkip={onSkip}
    >
      <div className="flex items-center justify-center" style={{ gap: "1rem" }}>
        <button
          onClick={() => increment(-5)}
          className="rounded-xl bg-surface border border-border/50 text-foreground hover:border-brand/50 transition-all"
          style={{ width: "3rem", height: "3rem" }}
        >
          -5
        </button>
        <button
          onClick={() => increment(-1)}
          className="rounded-lg bg-surface border border-border/50 text-foreground hover:border-brand/50 transition-all"
          style={{ width: "2.5rem", height: "2.5rem" }}
        >
          -1
        </button>

        <div className="text-center" style={{ minWidth: "100px" }}>
          <div className="text-4xl font-bold text-foreground tabular-nums">{weight}</div>
          <div className="text-sm text-muted-foreground">lbs</div>
        </div>

        <button
          onClick={() => increment(1)}
          className="rounded-lg bg-surface border border-border/50 text-foreground hover:border-brand/50 transition-all"
          style={{ width: "2.5rem", height: "2.5rem" }}
        >
          +1
        </button>
        <button
          onClick={() => increment(5)}
          className="rounded-xl bg-surface border border-border/50 text-foreground hover:border-brand/50 transition-all"
          style={{ width: "3rem", height: "3rem" }}
        >
          +5
        </button>
      </div>
    </InlineFieldWrapper>
  );
}

// ============================================================================
// FITNESS LEVEL SELECTOR
// ============================================================================

interface FitnessLevelSelectorProps {
  onSubmit: (level: "beginner" | "intermediate" | "advanced" | "elite") => void;
  initialValue?: string;
}

const FITNESS_LEVELS = [
  {
    value: "beginner" as const,
    label: "Beginner",
    description: "New to working out or getting back into it",
    color: "from-green-500 to-emerald-500",
  },
  {
    value: "intermediate" as const,
    label: "Intermediate",
    description: "Consistent for 6+ months, know the basics",
    color: "from-brand to-energy",
  },
  {
    value: "advanced" as const,
    label: "Advanced",
    description: "Years of experience, solid technique",
    color: "from-purple-500 to-violet-500",
  },
  {
    value: "elite" as const,
    label: "Elite",
    description: "Competitive athlete or professional",
    color: "from-orange-500 to-red-500",
  },
];

export function FitnessLevelSelector({
  onSubmit,
  initialValue,
}: FitnessLevelSelectorProps) {
  const [selected, setSelected] = useState<string | null>(initialValue ?? null);

  return (
    <InlineFieldWrapper
      title="What's your fitness level?"
      icon={<Dumbbell style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />}
      onSubmit={() => selected && onSubmit(selected as "beginner" | "intermediate" | "advanced" | "elite")}
      submitDisabled={!selected}
    >
      <div className="grid grid-cols-2" style={{ gap: "0.5rem" }}>
        {FITNESS_LEVELS.map((level) => (
          <button
            key={level.value}
            onClick={() => setSelected(level.value)}
            className={cn(
              "rounded-xl text-left transition-all",
              selected === level.value
                ? `bg-gradient-to-br ${level.color} text-white shadow-lg ring-2 ring-offset-2 ring-offset-background`
                : "bg-surface border border-border/50 hover:border-brand/50",
              selected === level.value && level.value === "beginner" && "ring-green-500",
              selected === level.value && level.value === "intermediate" && "ring-blue-500",
              selected === level.value && level.value === "advanced" && "ring-purple-500",
              selected === level.value && level.value === "elite" && "ring-orange-500"
            )}
            style={{ padding: "0.75rem" }}
          >
            <div className="font-semibold">{level.label}</div>
            <div className={cn(
              "text-xs",
              selected === level.value ? "text-white/80" : "text-muted-foreground"
            )}>
              {level.description}
            </div>
          </button>
        ))}
      </div>
    </InlineFieldWrapper>
  );
}

// ============================================================================
// TRAINING FREQUENCY SELECTOR
// ============================================================================

interface TrainingFrequencySelectorProps {
  onSubmit: (days: number) => void;
  initialValue?: number;
}

export function TrainingFrequencySelector({
  onSubmit,
  initialValue,
}: TrainingFrequencySelectorProps) {
  const [days, setDays] = useState(initialValue ?? 3);

  const labels: Record<number, string> = {
    0: "Not currently training",
    1: "1 day/week",
    2: "2 days/week",
    3: "3 days/week",
    4: "4 days/week",
    5: "5 days/week",
    6: "6 days/week",
    7: "Every day",
  };

  return (
    <InlineFieldWrapper
      title="How often do you train?"
      subtitle={labels[days]}
      icon={<Calendar style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />}
      onSubmit={() => onSubmit(days)}
    >
      <div className="flex justify-center" style={{ gap: "0.375rem" }}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={cn(
              "rounded-lg font-medium transition-all",
              days === d
                ? "bg-brand text-white shadow-lg ring-2 ring-brand ring-offset-2 ring-offset-background"
                : "bg-surface border border-border/50 text-foreground hover:border-brand/50"
            )}
            style={{ width: "2.5rem", height: "2.5rem" }}
          >
            {d}
          </button>
        ))}
      </div>
    </InlineFieldWrapper>
  );
}

// ============================================================================
// WORKOUT DURATION SELECTOR
// ============================================================================

interface WorkoutDurationSelectorProps {
  onSubmit: (minutes: number) => void;
  initialValue?: number;
}

const DURATIONS = [
  { value: 30, label: "30 min", description: "Quick & focused" },
  { value: 45, label: "45 min", description: "Most popular" },
  { value: 60, label: "60 min", description: "Full session" },
  { value: 90, label: "90+ min", description: "Extended" },
];

export function WorkoutDurationSelector({
  onSubmit,
  initialValue,
}: WorkoutDurationSelectorProps) {
  const [selected, setSelected] = useState(initialValue ?? null);

  return (
    <InlineFieldWrapper
      title="How long are your workouts?"
      icon={<Clock style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />}
      onSubmit={() => selected && onSubmit(selected)}
      submitDisabled={!selected}
    >
      <div className="grid grid-cols-2" style={{ gap: "0.5rem" }}>
        {DURATIONS.map((d) => (
          <button
            key={d.value}
            onClick={() => setSelected(d.value)}
            className={cn(
              "rounded-xl transition-all",
              selected === d.value
                ? "bg-brand text-white shadow-lg ring-2 ring-brand ring-offset-2 ring-offset-background"
                : "bg-surface border border-border/50 hover:border-brand/50"
            )}
            style={{ padding: "0.75rem" }}
          >
            <div className="text-lg font-bold">{d.label}</div>
            <div className={cn(
              "text-xs",
              selected === d.value ? "text-white/80" : "text-muted-foreground"
            )}>
              {d.description}
            </div>
          </button>
        ))}
      </div>
    </InlineFieldWrapper>
  );
}

// ============================================================================
// EQUIPMENT SELECTOR
// ============================================================================

interface EquipmentSelectorProps {
  onSubmit: (equipment: string[]) => void;
  initialValue?: string[];
}

export const EQUIPMENT_OPTIONS = [
  { value: "full_gym", label: "Full Gym" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "barbells", label: "Barbells" },
  { value: "kettlebells", label: "Kettlebells" },
  { value: "machines", label: "Machines" },
  { value: "cables", label: "Cables" },
  { value: "resistance_bands", label: "Bands" },
  { value: "bodyweight", label: "Bodyweight" },
  { value: "pull_up_bar", label: "Pull-up Bar" },
  { value: "bench", label: "Bench" },
];

// Helper to convert equipment values to labels
export function getEquipmentLabels(values: string[]): string[] {
  const labelMap = new Map(EQUIPMENT_OPTIONS.map(o => [o.value, o.label]));
  return values.map(v => labelMap.get(v) || v);
}

export function EquipmentSelector({
  onSubmit,
  initialValue,
}: EquipmentSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialValue ?? [])
  );

  const toggle = (value: string) => {
    const newSet = new Set(selected);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    setSelected(newSet);
  };

  return (
    <InlineFieldWrapper
      title="What equipment do you have?"
      subtitle={`${selected.size} selected`}
      icon={<Dumbbell style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />}
      onSubmit={() => onSubmit(Array.from(selected))}
      submitDisabled={selected.size === 0}
    >
      <div className="flex flex-wrap" style={{ gap: "0.5rem" }}>
        {EQUIPMENT_OPTIONS.map((eq) => (
          <button
            key={eq.value}
            onClick={() => toggle(eq.value)}
            className={cn(
              "rounded-lg text-sm font-medium transition-all",
              selected.has(eq.value)
                ? "bg-brand text-white ring-2 ring-brand ring-offset-1 ring-offset-background"
                : "bg-surface border border-border/50 text-foreground hover:border-brand/50"
            )}
            style={{ padding: "0.5rem 0.75rem" }}
          >
            {eq.label}
          </button>
        ))}
      </div>
    </InlineFieldWrapper>
  );
}

// ============================================================================
// WORKOUT DAYS SELECTOR
// ============================================================================

interface WorkoutDaysSelectorProps {
  onSubmit: (days: string[]) => void;
  initialValue?: string[];
}

const DAYS = [
  { value: "monday", label: "M" },
  { value: "tuesday", label: "T" },
  { value: "wednesday", label: "W" },
  { value: "thursday", label: "T" },
  { value: "friday", label: "F" },
  { value: "saturday", label: "S" },
  { value: "sunday", label: "S" },
];

export function WorkoutDaysSelector({
  onSubmit,
  initialValue,
}: WorkoutDaysSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialValue ?? [])
  );

  const toggle = (value: string) => {
    const newSet = new Set(selected);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    setSelected(newSet);
  };

  return (
    <InlineFieldWrapper
      title="Which days work best?"
      subtitle={`${selected.size} days selected`}
      icon={<Calendar style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />}
      onSubmit={() => onSubmit(Array.from(selected))}
      submitDisabled={selected.size === 0}
    >
      <div className="flex justify-center" style={{ gap: "0.5rem" }}>
        {DAYS.map((day, i) => (
          <button
            key={`${day.value}-${i}`}
            onClick={() => toggle(day.value)}
            className={cn(
              "rounded-full font-semibold transition-all",
              selected.has(day.value)
                ? "bg-brand text-white shadow-lg ring-2 ring-brand ring-offset-2 ring-offset-background"
                : "bg-surface border border-border/50 text-foreground hover:border-brand/50"
            )}
            style={{ width: "2.5rem", height: "2.5rem" }}
          >
            {day.label}
          </button>
        ))}
      </div>
    </InlineFieldWrapper>
  );
}

// ============================================================================
// CITY INPUT (with State)
// ============================================================================

// US_STATES imported from @/lib/constants/us-states

interface CityInputProps {
  onSubmit: (location: string) => void;
  onSkip: () => void;
  onClose?: () => void;
  initialValue?: string;
}

export function CityInput({ onSubmit, onSkip, onClose, initialValue = "" }: CityInputProps) {
  // Parse initial value if it contains city, state
  const parseInitial = (val: string) => {
    const parts = val.split(", ");
    if (parts.length >= 2) {
      return { city: parts[0], state: parts[1] };
    }
    return { city: val, state: "" };
  };

  const initial = parseInitial(initialValue);
  const [city, setCity] = useState(initial.city);
  const [state, setState] = useState(initial.state);

  const locationString = city.trim() && state ? `${city.trim()}, ${state}` : city.trim();

  return (
    <InlineFieldWrapper
      title="Where are you located?"
      subtitle="Helps find workout partners nearby"
      icon={<MapPin style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />}
      onSubmit={() => onSubmit(locationString)}
      onSkip={onSkip}
      onClose={onClose}
      showSkip
      submitDisabled={!city.trim()}
    >
      <div className="flex" style={{ gap: "0.75rem" }}>
        {/* City input */}
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          className="flex-[2] rounded-xl bg-surface border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50"
          style={{ height: "3rem", padding: "0 1rem" }}
          onKeyDown={(e) => e.key === "Enter" && city.trim() && onSubmit(locationString)}
        />

        {/* State selector */}
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="flex-1 rounded-xl appearance-none cursor-pointer bg-surface border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50"
          style={{ height: "3rem", padding: "0 0.75rem" }}
        >
          <option value="">State</option>
          {US_STATES.map((s) => (
            <option key={s.value} value={s.value}>{s.value}</option>
          ))}
        </select>
      </div>
    </InlineFieldWrapper>
  );
}

// ============================================================================
// PRIVACY SELECTOR
// ============================================================================

interface PrivacySelectorProps {
  onSubmit: (visibility: "public" | "private") => void;
  initialValue?: string;
}

export function PrivacySelector({ onSubmit, initialValue }: PrivacySelectorProps) {
  const [selected, setSelected] = useState<"public" | "private" | null>(
    (initialValue as "public" | "private") ?? null
  );

  return (
    <InlineFieldWrapper
      title="Profile visibility"
      icon={selected === "public"
        ? <Globe style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />
        : <Lock style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />
      }
      onSubmit={() => selected && onSubmit(selected)}
      submitDisabled={!selected}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <button
          onClick={() => setSelected("public")}
          className={cn(
            "w-full rounded-xl text-left transition-all",
            selected === "public"
              ? "bg-brand text-white shadow-lg ring-2 ring-brand ring-offset-2 ring-offset-background"
              : "bg-surface border border-border/50 hover:border-brand/50"
          )}
          style={{ padding: "1rem" }}
        >
          <div className="flex items-center" style={{ gap: "0.75rem" }}>
            <Globe style={{ width: "1.25rem", height: "1.25rem" }} />
            <div>
              <div className="font-semibold">Public</div>
              <div className={cn(
                "text-sm",
                selected === "public" ? "text-white/80" : "text-muted-foreground"
              )}>
                Others can find you for workout partnerships
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setSelected("private")}
          className={cn(
            "w-full rounded-xl text-left transition-all",
            selected === "private"
              ? "bg-brand text-white shadow-lg ring-2 ring-brand ring-offset-2 ring-offset-background"
              : "bg-surface border border-border/50 hover:border-brand/50"
          )}
          style={{ padding: "1rem" }}
        >
          <div className="flex items-center" style={{ gap: "0.75rem" }}>
            <Lock style={{ width: "1.25rem", height: "1.25rem" }} />
            <div>
              <div className="font-semibold">Private</div>
              <div className={cn(
                "text-sm",
                selected === "private" ? "text-white/80" : "text-muted-foreground"
              )}>
                Join circles only through direct invitations
              </div>
            </div>
          </div>
        </button>
      </div>
    </InlineFieldWrapper>
  );
}

// ============================================================================
// MOTIVATION INPUT
// ============================================================================

interface MotivationInputProps {
  onSubmit: (motivations: string[]) => void;
  initialValue?: string[];
}

const MOTIVATION_OPTIONS = [
  { value: "get_stronger", label: "Get Stronger", icon: "💪" },
  { value: "lose_weight", label: "Lose Weight", icon: "⚖️" },
  { value: "build_muscle", label: "Build Muscle", icon: "🏋️" },
  { value: "feel_healthier", label: "Feel Healthier", icon: "❤️" },
  { value: "more_energy", label: "More Energy", icon: "⚡" },
  { value: "mental_health", label: "Mental Health", icon: "🧠" },
];

export function MotivationInput({ onSubmit, initialValue }: MotivationInputProps) {
  // Convert labels back to values for initialization
  // Labels come in like ["Get Stronger", "My custom reason"]
  // We need values like ["get_stronger", "custom:My custom reason"]
  const labelsToValues = (labels: string[]): string[] => {
    return labels.map(label => {
      const option = MOTIVATION_OPTIONS.find(o => o.label === label);
      if (option) {
        return option.value;
      }
      // It's a custom value - store with prefix
      return `custom:${label}`;
    });
  };

  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialValue ? labelsToValues(initialValue) : [])
  );
  const [customValue, setCustomValue] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const toggle = (value: string) => {
    const newSet = new Set(selected);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    setSelected(newSet);
  };

  const addCustom = () => {
    if (customValue.trim()) {
      setSelected(new Set([...selected, `custom:${customValue.trim()}`]));
      setCustomValue("");
      setShowCustom(false);
    }
  };

  const getLabels = (): string[] => {
    return Array.from(selected).map(v => {
      if (v.startsWith("custom:")) {
        return v.replace("custom:", "");
      }
      const option = MOTIVATION_OPTIONS.find(o => o.value === v);
      return option?.label || v;
    });
  };

  return (
    <InlineFieldWrapper
      title="What motivates you?"
      subtitle="Select all that apply"
      icon={<Target style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />}
      onSubmit={() => onSubmit(getLabels())}
      submitDisabled={selected.size === 0}
      submitLabel={selected.size > 0 ? `Continue (${selected.size} selected)` : "Continue"}
    >
      <div
        className="grid grid-cols-2"
        style={{ gap: "0.5rem", marginBottom: "0.75rem" }}
      >
        {MOTIVATION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className={cn(
              "rounded-xl transition-all flex items-center",
              selected.has(opt.value)
                ? "bg-brand text-white shadow-lg ring-2 ring-brand ring-offset-2 ring-offset-background"
                : "bg-surface border border-border/50 hover:border-brand/50"
            )}
            style={{ padding: "0.75rem", gap: "0.5rem" }}
          >
            <span className="text-xl">{opt.icon}</span>
            <span className="font-medium text-sm">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Custom motivations */}
      {Array.from(selected)
        .filter(v => v.startsWith("custom:"))
        .map(v => (
          <div
            key={v}
            className="inline-flex items-center gap-1 px-2 py-1 mb-2 mr-2 bg-brand/10 border border-brand/30 rounded-lg text-sm"
          >
            <span>{v.replace("custom:", "")}</span>
            <button
              onClick={() => {
                const newSet = new Set(selected);
                newSet.delete(v);
                setSelected(newSet);
              }}
              className="ml-1 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        ))}

      {!showCustom ? (
        <button
          onClick={() => setShowCustom(true)}
          className="w-full text-sm text-muted-foreground hover:text-foreground"
        >
          + Add something else
        </button>
      ) : (
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="What's driving you?"
            autoFocus
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
          />
          <Button size="sm" onClick={addCustom} disabled={!customValue.trim()}>
            Add
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowCustom(false)}>
            Cancel
          </Button>
        </div>
      )}
    </InlineFieldWrapper>
  );
}

// ============================================================================
// ACTIVITY LEVEL SELECTOR
// ============================================================================

interface ActivityLevelData {
  jobType: "sedentary" | "light" | "moderate" | "active" | "very_active";
  dailySteps?: number;
  description?: string;
}

interface ActivityLevelSelectorProps {
  onSubmit: (activity: ActivityLevelData) => void;
  initialValue?: ActivityLevelData;
}

const ACTIVITY_LEVELS = [
  {
    value: "sedentary" as const,
    label: "Sedentary",
    description: "Desk job, minimal movement",
    steps: "< 3,000 steps/day",
    icon: "🪑",
  },
  {
    value: "light" as const,
    label: "Lightly Active",
    description: "Some walking, occasional standing",
    steps: "3,000-5,000 steps/day",
    icon: "🚶",
  },
  {
    value: "moderate" as const,
    label: "Moderately Active",
    description: "Regular walking, some physical work",
    steps: "5,000-8,000 steps/day",
    icon: "🏃",
  },
  {
    value: "active" as const,
    label: "Active",
    description: "On your feet most of the day",
    steps: "8,000-12,000 steps/day",
    icon: "⚡",
  },
  {
    value: "very_active" as const,
    label: "Very Active",
    description: "Physical job, always moving",
    steps: "12,000+ steps/day",
    icon: "🔥",
  },
];

export function ActivityLevelSelector({
  onSubmit,
  initialValue,
}: ActivityLevelSelectorProps) {
  const [selected, setSelected] = useState<ActivityLevelData["jobType"] | null>(
    initialValue?.jobType ?? null
  );
  const [steps, setSteps] = useState<string>(
    initialValue?.dailySteps?.toString() ?? ""
  );

  return (
    <InlineFieldWrapper
      title="Daily Activity Level"
      subtitle="Outside of your workouts"
      icon={<Activity style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />}
      onSubmit={() =>
        selected &&
        onSubmit({
          jobType: selected,
          dailySteps: steps ? parseInt(steps) : undefined,
        })
      }
      submitDisabled={!selected}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {ACTIVITY_LEVELS.map((level) => (
          <button
            key={level.value}
            onClick={() => setSelected(level.value)}
            className={cn(
              "w-full rounded-xl text-left transition-all flex items-center",
              selected === level.value
                ? "bg-brand text-white shadow-lg ring-2 ring-brand ring-offset-2 ring-offset-background"
                : "bg-surface border border-border/50 hover:border-brand/50"
            )}
            style={{ padding: "0.75rem", gap: "0.75rem" }}
          >
            <span className="text-2xl">{level.icon}</span>
            <div className="flex-1">
              <div className="font-semibold">{level.label}</div>
              <div
                className={cn(
                  "text-xs",
                  selected === level.value ? "text-white/80" : "text-muted-foreground"
                )}
              >
                {level.description}
              </div>
            </div>
            <div
              className={cn(
                "text-xs",
                selected === level.value ? "text-white/70" : "text-muted-foreground/70"
              )}
            >
              {level.steps}
            </div>
          </button>
        ))}
      </div>

      {/* Optional: specific step count */}
      <div
        className="flex items-center border-t border-border/30"
        style={{ gap: "0.5rem", paddingTop: "1rem", marginTop: "1rem" }}
      >
        <span className="text-xs text-muted-foreground whitespace-nowrap">Daily steps (optional):</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={steps}
          onChange={(e) => {
            // Only allow numeric input, with commas for display
            const newValue = e.target.value.replace(/[^0-9]/g, "");
            setSteps(newValue);
          }}
          placeholder="7500"
          className="flex-1 rounded-md border border-input bg-background text-sm text-center"
          style={{ height: "2rem", padding: "0.25rem 0.5rem" }}
        />
        <span className="text-xs text-muted-foreground">steps</span>
      </div>
    </InlineFieldWrapper>
  );
}

// ============================================================================
// LIMITATIONS INPUT
// ============================================================================

interface Limitation {
  bodyPart: string;
  condition: string;
  severity?: "mild" | "moderate" | "severe";
}

interface LimitationsInputProps {
  onSubmit: (limitations: Limitation[]) => void;
  onSkip: () => void;
  onClose?: () => void;
  initialValue?: Limitation[];
}

const COMMON_LIMITATIONS = [
  { bodyPart: "Lower Back", condition: "Pain/Injury" },
  { bodyPart: "Knee", condition: "Pain/Injury" },
  { bodyPart: "Shoulder", condition: "Pain/Injury" },
  { bodyPart: "Hip", condition: "Pain/Tightness" },
  { bodyPart: "Ankle", condition: "Pain/Injury" },
  { bodyPart: "Neck", condition: "Pain/Stiffness" },
  { bodyPart: "Wrist", condition: "Pain/Injury" },
  { bodyPart: "Elbow", condition: "Pain/Injury" },
  { bodyPart: "Foot", condition: "Plantar Fasciitis" },
  { bodyPart: "Sciatica", condition: "Nerve Pain" },
  { bodyPart: "Rotator Cuff", condition: "Injury" },
  { bodyPart: "Arthritis", condition: "Joint Pain" },
  { bodyPart: "Hernia", condition: "Limitation" },
  { bodyPart: "High Blood Pressure", condition: "Caution" },
  { bodyPart: "Asthma", condition: "Breathing" },
];

export function LimitationsInput({
  onSubmit,
  onSkip,
  onClose,
  initialValue,
}: LimitationsInputProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialValue?.map((l) => `${l.bodyPart}-${l.condition}`) ?? [])
  );
  const [customLimitation, setCustomLimitation] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const toggle = (key: string) => {
    const newSet = new Set(selected);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelected(newSet);
  };

  const addCustom = () => {
    if (customLimitation.trim()) {
      setSelected(new Set([...selected, `Custom-${customLimitation.trim()}`]));
      setCustomLimitation("");
      setShowCustom(false);
    }
  };

  const handleSubmit = () => {
    const limitations: Limitation[] = Array.from(selected).map((key) => {
      const [bodyPart, condition] = key.split("-");
      return { bodyPart, condition };
    });
    onSubmit(limitations);
  };

  return (
    <InlineFieldWrapper
      title="Any injuries or limitations?"
      subtitle="We'll work around these in your workouts"
      icon={<AlertTriangle style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />}
      onSubmit={handleSubmit}
      onSkip={onSkip}
      onClose={onClose}
      showSkip
      submitLabel={selected.size > 0 ? `Continue (${selected.size} selected)` : "No limitations"}
    >
      <div className="flex flex-wrap" style={{ gap: "0.5rem" }}>
        {COMMON_LIMITATIONS.map((lim) => {
          const key = `${lim.bodyPart}-${lim.condition}`;
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={cn(
                "rounded-lg text-sm font-medium transition-all",
                selected.has(key)
                  ? "bg-amber-500 text-white ring-2 ring-amber-500 ring-offset-1 ring-offset-background"
                  : "bg-surface border border-border/50 text-foreground hover:border-amber-500/50"
              )}
              style={{ padding: "0.5rem 0.75rem" }}
            >
              {lim.bodyPart}
            </button>
          );
        })}

        {/* Custom limitations */}
        {Array.from(selected)
          .filter((k) => k.startsWith("Custom-"))
          .map((k) => (
            <button
              key={k}
              onClick={() => toggle(k)}
              className="rounded-lg text-sm font-medium bg-amber-500 text-white ring-2 ring-amber-500 ring-offset-1 ring-offset-background"
              style={{ padding: "0.5rem 0.75rem" }}
            >
              {k.replace("Custom-", "")} ✕
            </button>
          ))}
      </div>

      {/* Add custom option */}
      {!showCustom ? (
        <button
          onClick={() => setShowCustom(true)}
          className="text-sm text-muted-foreground hover:text-foreground"
          style={{ marginTop: "1rem", display: "block" }}
        >
          + Add other limitation
        </button>
      ) : (
        <div className="flex" style={{ gap: "0.5rem", marginTop: "1rem" }}>
          <input
            type="text"
            value={customLimitation}
            onChange={(e) => setCustomLimitation(e.target.value)}
            placeholder="Describe your limitation..."
            autoFocus
            className="flex-1 rounded-md border border-input bg-background text-sm"
            style={{ height: "2.25rem", padding: "0 0.75rem" }}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
          />
          <Button size="sm" onClick={addCustom} disabled={!customLimitation.trim()}>
            Add
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowCustom(false)}>
            Cancel
          </Button>
        </div>
      )}
    </InlineFieldWrapper>
  );
}

// ============================================================================
// VALIDATED NUMERIC INPUT HELPERS
// ============================================================================

// Helper component for numeric inputs with validation
interface NumericInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  unit: "lbs" | "reps" | "seconds";
  autoFocus?: boolean;
}

function NumericInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  unit,
  autoFocus,
}: NumericInputProps) {
  const unitLabels = {
    lbs: "lbs",
    reps: "reps",
    seconds: "sec",
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric input
    const newValue = e.target.value.replace(/[^0-9]/g, "");
    onChange(newValue);
  };

  return (
    <div className="flex items-center" style={{ gap: "0.5rem" }}>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder || "0"}
        autoFocus={autoFocus}
        className="flex-1 rounded-md border border-input bg-background text-sm text-center"
        style={{ height: "2.25rem", padding: "0 0.5rem" }}
      />
      <span className="text-sm text-muted-foreground font-medium" style={{ minWidth: "2.5rem" }}>
        {unitLabels[unit]}
      </span>
    </div>
  );
}

// Time input for min:sec format
interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
}

function TimeInput({ value, onChange, onKeyDown, autoFocus }: TimeInputProps) {
  // Parse existing value into minutes and seconds
  const [minutes, setMinutes] = useState(() => {
    if (!value) return "";
    const parts = value.split(":");
    return parts[0] || "";
  });
  const [seconds, setSeconds] = useState(() => {
    if (!value) return "";
    const parts = value.split(":");
    return parts[1] || "";
  });

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMinutes = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
    setMinutes(newMinutes);
    const formattedSeconds = seconds.padStart(2, "0");
    onChange(newMinutes ? `${newMinutes}:${formattedSeconds}` : "");
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newSeconds = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
    // Clamp seconds to 0-59
    if (parseInt(newSeconds) > 59) newSeconds = "59";
    setSeconds(newSeconds);
    const formattedSeconds = newSeconds.padStart(2, "0");
    onChange(minutes ? `${minutes}:${formattedSeconds}` : "");
  };

  return (
    <div className="flex items-center" style={{ gap: "0.25rem" }}>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={minutes}
        onChange={handleMinutesChange}
        onKeyDown={onKeyDown}
        placeholder="0"
        autoFocus={autoFocus}
        className="rounded-md border border-input bg-background text-sm text-center"
        style={{ height: "2.25rem", width: "3.5rem", padding: "0 0.25rem" }}
      />
      <span className="text-sm text-muted-foreground font-medium">min</span>
      <span className="text-lg text-muted-foreground">:</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={seconds}
        onChange={handleSecondsChange}
        onKeyDown={onKeyDown}
        placeholder="00"
        className="rounded-md border border-input bg-background text-sm text-center"
        style={{ height: "2.25rem", width: "3rem", padding: "0 0.25rem" }}
      />
      <span className="text-sm text-muted-foreground font-medium">sec</span>
    </div>
  );
}

// ============================================================================
// CURRENT MAXES INPUT (Assessed lifting maxes for AI programming)
// ============================================================================

// Skill mastery levels for gymnastics/calisthenics skills
type SkillLevel = "working_on" | "mastered" | "consistent";

// Unit types for different exercise categories
type MaxUnit = "lbs" | "reps" | "seconds" | "min:sec" | "skill";

export interface CurrentMax {
  exercise: string;
  value: number | SkillLevel; // number for measurable, SkillLevel for skills
  unit: MaxUnit;
  isCustom?: boolean;
}

interface CurrentMaxesInputProps {
  onSubmit: (maxes: CurrentMax[]) => void;
  onSkip: () => void;
  onClose?: () => void;
  initialValue?: CurrentMax[];
}

// Preset exercises organized by category
const MAX_EXERCISE_CATEGORIES = [
  {
    category: "Strength",
    icon: "🏋️",
    exercises: [
      { exercise: "Bench Press", unit: "lbs" as MaxUnit, description: "1RM" },
      { exercise: "Back Squat", unit: "lbs" as MaxUnit, description: "1RM" },
      { exercise: "Deadlift", unit: "lbs" as MaxUnit, description: "1RM" },
      { exercise: "Overhead Press", unit: "lbs" as MaxUnit, description: "1RM" },
      { exercise: "Barbell Row", unit: "lbs" as MaxUnit, description: "1RM" },
    ],
  },
  {
    category: "Olympic",
    icon: "🥇",
    exercises: [
      { exercise: "Clean", unit: "lbs" as MaxUnit, description: "1RM" },
      { exercise: "Snatch", unit: "lbs" as MaxUnit, description: "1RM" },
      { exercise: "Clean & Jerk", unit: "lbs" as MaxUnit, description: "1RM" },
      { exercise: "Power Clean", unit: "lbs" as MaxUnit, description: "1RM" },
    ],
  },
  {
    category: "Bodyweight",
    icon: "💪",
    exercises: [
      { exercise: "Pull-ups", unit: "reps" as MaxUnit, description: "Max reps" },
      { exercise: "Push-ups", unit: "reps" as MaxUnit, description: "Max reps" },
      { exercise: "Dips", unit: "reps" as MaxUnit, description: "Max reps" },
      { exercise: "Chin-ups", unit: "reps" as MaxUnit, description: "Max reps" },
    ],
  },
  {
    category: "Gymnastics/Skills",
    icon: "🤸",
    exercises: [
      { exercise: "Muscle-up", unit: "skill" as MaxUnit, description: "Skill" },
      { exercise: "Handstand", unit: "skill" as MaxUnit, description: "Skill" },
      { exercise: "Back Tuck", unit: "skill" as MaxUnit, description: "Skill" },
      { exercise: "Front Lever", unit: "skill" as MaxUnit, description: "Skill" },
      { exercise: "Pistol Squat", unit: "skill" as MaxUnit, description: "Skill" },
      { exercise: "L-Sit", unit: "skill" as MaxUnit, description: "Skill" },
    ],
  },
  {
    category: "Holds/Isometrics",
    icon: "⏱️",
    exercises: [
      { exercise: "Plank Hold", unit: "seconds" as MaxUnit, description: "Max hold" },
      { exercise: "Dead Hang", unit: "seconds" as MaxUnit, description: "Max hold" },
      { exercise: "Wall Sit", unit: "seconds" as MaxUnit, description: "Max hold" },
      { exercise: "L-Sit Hold", unit: "seconds" as MaxUnit, description: "Max hold" },
    ],
  },
  {
    category: "Cardio",
    icon: "🏃",
    exercises: [
      { exercise: "Mile Run", unit: "min:sec" as MaxUnit, description: "Best time" },
      { exercise: "5K Run", unit: "min:sec" as MaxUnit, description: "Best time" },
      { exercise: "2K Row", unit: "min:sec" as MaxUnit, description: "Best time" },
      { exercise: "400m Sprint", unit: "seconds" as MaxUnit, description: "Best time" },
    ],
  },
];

const SKILL_LEVELS: { value: SkillLevel; label: string; color: string }[] = [
  { value: "working_on", label: "Working On", color: "bg-amber-500" },
  { value: "mastered", label: "Mastered", color: "bg-green-500" },
  { value: "consistent", label: "Consistent", color: "bg-brand" },
];

const UNIT_OPTIONS: { value: MaxUnit; label: string }[] = [
  { value: "lbs", label: "Weight (lbs)" },
  { value: "reps", label: "Reps" },
  { value: "seconds", label: "Seconds" },
  { value: "min:sec", label: "Time (min:sec)" },
  { value: "skill", label: "Skill Level" },
];

export function CurrentMaxesInput({
  onSubmit,
  onSkip,
  onClose,
  initialValue,
}: CurrentMaxesInputProps) {
  const [maxes, setMaxes] = useState<CurrentMax[]>(initialValue ?? []);
  const [activeCategory, setActiveCategory] = useState<string>("Strength");
  const [selectedExercise, setSelectedExercise] = useState<{
    exercise: string;
    unit: MaxUnit;
    description: string;
  } | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("mastered");

  // Custom exercise state
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUnit, setCustomUnit] = useState<MaxUnit>("lbs");

  const activeExercises =
    MAX_EXERCISE_CATEGORIES.find((c) => c.category === activeCategory)?.exercises ?? [];

  const handleSelectExercise = (ex: { exercise: string; unit: MaxUnit; description: string }) => {
    const existing = maxes.find((m) => m.exercise === ex.exercise);
    if (existing) {
      setMaxes(maxes.filter((m) => m.exercise !== ex.exercise));
      return;
    }
    setSelectedExercise(ex);
    setInputValue("");
    setSkillLevel("mastered");
    setShowCustom(false);
  };

  const handleAddMax = () => {
    if (!selectedExercise) return;

    if (selectedExercise.unit === "skill") {
      setMaxes([
        ...maxes,
        {
          exercise: selectedExercise.exercise,
          value: skillLevel,
          unit: "skill",
        },
      ]);
    } else if (inputValue.trim()) {
      setMaxes([
        ...maxes,
        {
          exercise: selectedExercise.exercise,
          value: selectedExercise.unit === "min:sec" ? inputValue.trim() as unknown as number : parseFloat(inputValue) || 0,
          unit: selectedExercise.unit,
        },
      ]);
    }
    setSelectedExercise(null);
    setInputValue("");
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;

    if (customUnit === "skill") {
      setMaxes([
        ...maxes,
        {
          exercise: customName.trim(),
          value: skillLevel,
          unit: "skill",
          isCustom: true,
        },
      ]);
    } else if (inputValue.trim()) {
      setMaxes([
        ...maxes,
        {
          exercise: customName.trim(),
          value: customUnit === "min:sec" ? inputValue.trim() as unknown as number : parseFloat(inputValue) || 0,
          unit: customUnit,
          isCustom: true,
        },
      ]);
    }
    setShowCustom(false);
    setCustomName("");
    setInputValue("");
    setCustomUnit("lbs");
  };

  // Format display value for maxes
  const formatMaxValue = (max: CurrentMax) => {
    if (max.unit === "skill") {
      const level = SKILL_LEVELS.find((l) => l.value === max.value);
      return level?.label || max.value;
    }
    if (max.unit === "min:sec") {
      return max.value;
    }
    return `${max.value} ${max.unit}`;
  };

  return (
    <InlineFieldWrapper
      title="Know your current maxes?"
      subtitle="Helps us prescribe the right weights for your workouts"
      icon={<Dumbbell style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />}
      onSubmit={() => onSubmit(maxes)}
      onSkip={onSkip}
      onClose={onClose}
      showSkip
      submitLabel={maxes.length > 0 ? `Continue (${maxes.length} recorded)` : "I don't know yet"}
    >
      {/* Added maxes */}
      {maxes.length > 0 && (
        <div
          className="flex flex-wrap border-b border-border/30"
          style={{ gap: "0.5rem", marginBottom: "0.75rem", paddingBottom: "0.75rem" }}
        >
          {maxes.map((max, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center rounded-lg text-sm",
                max.unit === "skill"
                  ? `${SKILL_LEVELS.find((l) => l.value === max.value)?.color || "bg-brand"} text-white`
                  : "bg-brand/10 border border-brand/30"
              )}
              style={{ gap: "0.25rem", padding: "0.25rem 0.5rem" }}
            >
              <span>
                {max.exercise}
                {max.unit !== "skill" && `: ${formatMaxValue(max)}`}
                {max.unit === "skill" && (
                  <span style={{ marginLeft: "0.25rem" }}>✓</span>
                )}
              </span>
              <button
                onClick={() => setMaxes(maxes.filter((_, idx) => idx !== i))}
                className={max.unit === "skill" ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"}
                style={{ marginLeft: "0.25rem" }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Category tabs */}
      <div
        className="flex flex-wrap border-b border-border/30"
        style={{ gap: "0.25rem", marginBottom: "0.75rem", paddingBottom: "0.5rem" }}
      >
        {MAX_EXERCISE_CATEGORIES.map((cat) => (
          <button
            key={cat.category}
            onClick={() => {
              setActiveCategory(cat.category);
              setSelectedExercise(null);
              setShowCustom(false);
            }}
            className={cn(
              "rounded-lg text-xs font-medium transition-all",
              activeCategory === cat.category
                ? "bg-brand/10 text-brand ring-2 ring-brand"
                : "bg-surface border border-border/50 text-muted-foreground hover:text-foreground hover:border-brand/50"
            )}
            style={{ padding: "0.375rem 0.5rem" }}
          >
            {cat.icon} {cat.category}
          </button>
        ))}
      </div>

      {/* Exercise options for active category */}
      <div className="grid grid-cols-2" style={{ gap: "0.5rem" }}>
        {activeExercises.map((exercise) => {
          const isSelected = selectedExercise?.exercise === exercise.exercise;
          const isAdded = maxes.some((m) => m.exercise === exercise.exercise);
          const addedMax = maxes.find((m) => m.exercise === exercise.exercise);

          return (
            <button
              key={exercise.exercise}
              onClick={() => handleSelectExercise(exercise)}
              className={cn(
                "w-full rounded-lg text-left transition-all flex items-center border",
                isSelected
                  ? "bg-brand text-white border-brand ring-2 ring-brand ring-offset-2 ring-offset-background"
                  : isAdded
                  ? "bg-brand/10 border-brand text-foreground"
                  : "bg-surface border-border/50 hover:border-brand/50"
              )}
              style={{ padding: "0.5rem 0.75rem", gap: "0.5rem" }}
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium block truncate">{exercise.exercise}</span>
                {isAdded && addedMax && (
                  <span className="text-xs opacity-75">
                    {formatMaxValue(addedMax)}
                  </span>
                )}
              </div>
              {isAdded && <Check style={{ width: "0.75rem", height: "0.75rem" }} />}
            </button>
          );
        })}
      </div>

      {/* Input area - shown below grid when exercise selected */}
      {selectedExercise && (
        <div
          className="bg-muted/30 rounded-lg"
          style={{ marginTop: "0.75rem", padding: "0.75rem" }}
        >
          <div
            className="text-sm font-medium text-foreground"
            style={{ marginBottom: "0.5rem" }}
          >
            {selectedExercise.exercise}
            <span className="text-muted-foreground font-normal" style={{ marginLeft: "0.5rem" }}>
              ({selectedExercise.description})
            </span>
          </div>

          {selectedExercise.unit === "skill" ? (
            /* Skill level selector */
            <div className="flex" style={{ gap: "0.5rem" }}>
              {SKILL_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setSkillLevel(level.value)}
                  className={cn(
                    "flex-1 rounded-lg text-sm font-medium transition-all",
                    skillLevel === level.value
                      ? `${level.color} text-white ring-2 ring-offset-2 ring-offset-background`
                      : "bg-surface border border-border/50 text-foreground hover:border-brand/50"
                  )}
                  style={{ padding: "0.5rem" }}
                >
                  {level.label}
                </button>
              ))}
            </div>
          ) : selectedExercise.unit === "min:sec" ? (
            /* Time input for min:sec */
            <TimeInput
              value={inputValue}
              onChange={setInputValue}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddMax();
                if (e.key === "Escape") setSelectedExercise(null);
              }}
              autoFocus
            />
          ) : (
            /* Numeric input with unit label */
            <NumericInput
              value={inputValue}
              onChange={setInputValue}
              unit={selectedExercise.unit as "lbs" | "reps" | "seconds"}
              placeholder={
                selectedExercise.unit === "seconds"
                  ? "120"
                  : selectedExercise.unit === "reps"
                  ? "15"
                  : "225"
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddMax();
                if (e.key === "Escape") setSelectedExercise(null);
              }}
              autoFocus
            />
          )}

          <div className="flex justify-end" style={{ gap: "0.5rem", marginTop: "0.5rem" }}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedExercise(null)}
              style={{ height: "2.25rem" }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddMax}
              disabled={selectedExercise.unit !== "skill" && !inputValue.trim()}
              style={{ height: "2.25rem" }}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Custom exercise option */}
      {!selectedExercise && !showCustom && (
        <button
          onClick={() => setShowCustom(true)}
          className="text-sm text-muted-foreground hover:text-foreground"
          style={{ marginTop: "1rem", display: "block" }}
        >
          + Add custom exercise
        </button>
      )}

      {/* Custom exercise form */}
      {showCustom && (
        <div
          className="bg-muted/30 rounded-lg"
          style={{ marginTop: "0.75rem", padding: "0.75rem" }}
        >
          <div
            className="text-sm font-medium text-foreground"
            style={{ marginBottom: "0.5rem" }}
          >
            Custom Exercise
          </div>

          {/* Name and unit type row */}
          <div className="flex" style={{ gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Exercise name..."
              autoFocus
              className="flex-1 rounded-md border border-input bg-background text-sm"
              style={{ height: "2.25rem", padding: "0 0.75rem" }}
            />
            <select
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value as MaxUnit)}
              className="rounded-md border border-input bg-background text-sm"
              style={{ height: "2.25rem", padding: "0 0.5rem" }}
            >
              {UNIT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Value input based on unit type */}
          {customUnit === "skill" ? (
            <div className="flex" style={{ gap: "0.5rem" }}>
              {SKILL_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setSkillLevel(level.value)}
                  className={cn(
                    "flex-1 rounded-lg text-sm font-medium transition-all",
                    skillLevel === level.value
                      ? `${level.color} text-white ring-2 ring-offset-2 ring-offset-background`
                      : "bg-surface border border-border/50 text-foreground hover:border-brand/50"
                  )}
                  style={{ padding: "0.5rem" }}
                >
                  {level.label}
                </button>
              ))}
            </div>
          ) : customUnit === "min:sec" ? (
            <TimeInput
              value={inputValue}
              onChange={setInputValue}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCustom();
              }}
            />
          ) : (
            <NumericInput
              value={inputValue}
              onChange={setInputValue}
              unit={customUnit as "lbs" | "reps" | "seconds"}
              placeholder={
                customUnit === "seconds"
                  ? "120"
                  : customUnit === "reps"
                  ? "15"
                  : "225"
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCustom();
              }}
            />
          )}

          <div className="flex justify-end" style={{ gap: "0.5rem", marginTop: "0.5rem" }}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowCustom(false);
                setCustomName("");
                setInputValue("");
              }}
              style={{ height: "2.25rem" }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddCustom}
              disabled={!customName.trim() || (customUnit !== "skill" && !inputValue.trim())}
              style={{ height: "2.25rem" }}
            >
              Add
            </Button>
          </div>
        </div>
      )}
    </InlineFieldWrapper>
  );
}

// ============================================================================
// SPECIFIC GOALS INPUT (with categories like CurrentMaxesInput)
// ============================================================================

// Skill mastery levels for goals (same as CurrentMaxesInput)
type GoalSkillLevel = "learning" | "consistent" | "mastered";
// Aesthetic intensity levels for body composition goals
type AestheticLevel = "tone" | "build" | "maximize";

interface SpecificGoal {
  type: "pr" | "skill" | "time" | "other" | "aesthetic";
  exercise?: string;
  targetValue?: number | GoalSkillLevel | AestheticLevel;
  targetUnit?: string;
  description?: string;
}

interface SpecificGoalsInputProps {
  onSubmit: (goals: SpecificGoal[]) => void;
  onSkip: () => void;
  onClose?: () => void;
  initialValue?: SpecificGoal[];
}

// Skill level options for gymnastics/movement skills
const GOAL_SKILL_LEVELS: { value: GoalSkillLevel; label: string; color: string; description: string }[] = [
  { value: "learning", label: "Learning", color: "bg-amber-500", description: "Working toward it" },
  { value: "consistent", label: "Consistent", color: "bg-brand", description: "Can do it reliably" },
  { value: "mastered", label: "Mastered", color: "bg-green-500", description: "Fully confident" },
];

// Aesthetic intensity levels for body composition goals
const AESTHETIC_LEVELS: { value: AestheticLevel; label: string; color: string; description: string }[] = [
  { value: "tone", label: "Tone", color: "bg-sky-500", description: "Define & lean out" },
  { value: "build", label: "Build", color: "bg-violet-500", description: "Add size & shape" },
  { value: "maximize", label: "Maximize", color: "bg-fuchsia-500", description: "Max growth" },
];

// Goal categories organized like CurrentMaxesInput
const GOAL_CATEGORIES = [
  {
    category: "Strength PRs",
    icon: "🏋️",
    goals: [
      { exercise: "Bench Press", unit: "lbs" as const, type: "pr" as const, description: "Target 1RM" },
      { exercise: "Back Squat", unit: "lbs" as const, type: "pr" as const, description: "Target 1RM" },
      { exercise: "Deadlift", unit: "lbs" as const, type: "pr" as const, description: "Target 1RM" },
      { exercise: "Overhead Press", unit: "lbs" as const, type: "pr" as const, description: "Target 1RM" },
      { exercise: "Barbell Row", unit: "lbs" as const, type: "pr" as const, description: "Target 1RM" },
    ],
  },
  {
    category: "Olympic",
    icon: "🥇",
    goals: [
      { exercise: "Clean", unit: "lbs" as const, type: "pr" as const, description: "Target 1RM" },
      { exercise: "Snatch", unit: "lbs" as const, type: "pr" as const, description: "Target 1RM" },
      { exercise: "Clean & Jerk", unit: "lbs" as const, type: "pr" as const, description: "Target 1RM" },
    ],
  },
  {
    category: "Bodyweight",
    icon: "💪",
    goals: [
      { exercise: "Pull-ups", unit: "reps" as const, type: "skill" as const, description: "Target reps" },
      { exercise: "Push-ups", unit: "reps" as const, type: "skill" as const, description: "Target reps" },
      { exercise: "Dips", unit: "reps" as const, type: "skill" as const, description: "Target reps" },
      { exercise: "Chin-ups", unit: "reps" as const, type: "skill" as const, description: "Target reps" },
      { exercise: "Muscle-ups", unit: "reps" as const, type: "skill" as const, description: "Target reps" },
      { exercise: "Pistol Squats", unit: "reps" as const, type: "skill" as const, description: "Per leg" },
    ],
  },
  {
    category: "Skills",
    icon: "🤸",
    goals: [
      { exercise: "Back Tuck", unit: "skill" as const, type: "skill" as const, description: "Backflip" },
      { exercise: "Front Tuck", unit: "skill" as const, type: "skill" as const, description: "Front flip" },
      { exercise: "Back Handspring", unit: "skill" as const, type: "skill" as const, description: "Gymnastics" },
      { exercise: "Front Handspring", unit: "skill" as const, type: "skill" as const, description: "Gymnastics" },
      { exercise: "Cartwheel", unit: "skill" as const, type: "skill" as const, description: "Basic tumbling" },
      { exercise: "Roundoff", unit: "skill" as const, type: "skill" as const, description: "Tumbling" },
      { exercise: "Handstand", unit: "skill" as const, type: "skill" as const, description: "Freestanding" },
      { exercise: "Handstand Walk", unit: "skill" as const, type: "skill" as const, description: "Moving" },
      { exercise: "Ring Muscle-up", unit: "skill" as const, type: "skill" as const, description: "On rings" },
      { exercise: "Double Unders", unit: "skill" as const, type: "skill" as const, description: "Jump rope" },
      { exercise: "Rope Climb", unit: "skill" as const, type: "skill" as const, description: "Legless" },
    ],
  },
  {
    category: "Aesthetics",
    icon: "✨",
    goals: [
      { exercise: "Arms", unit: "aesthetic" as const, type: "aesthetic" as const, description: "Biceps & triceps" },
      { exercise: "Chest", unit: "aesthetic" as const, type: "aesthetic" as const, description: "Pecs" },
      { exercise: "Back", unit: "aesthetic" as const, type: "aesthetic" as const, description: "Lats & traps" },
      { exercise: "Shoulders", unit: "aesthetic" as const, type: "aesthetic" as const, description: "Delts" },
      { exercise: "Legs", unit: "aesthetic" as const, type: "aesthetic" as const, description: "Quads & hams" },
      { exercise: "Glutes", unit: "aesthetic" as const, type: "aesthetic" as const, description: "Booty" },
      { exercise: "Abs", unit: "aesthetic" as const, type: "aesthetic" as const, description: "Core definition" },
      { exercise: "Overall Definition", unit: "aesthetic" as const, type: "aesthetic" as const, description: "Cut & lean" },
    ],
  },
  {
    category: "Weight",
    icon: "⚖️",
    goals: [
      { exercise: "Lose Weight", unit: "lbs" as const, type: "other" as const, description: "Target loss" },
      { exercise: "Gain Weight", unit: "lbs" as const, type: "other" as const, description: "Target gain" },
      { exercise: "Reach Target Weight", unit: "lbs" as const, type: "other" as const, description: "Goal weight" },
      { exercise: "Drop Body Fat %", unit: "other" as const, type: "other" as const, description: "Reduce BF%" },
      { exercise: "Build Lean Mass", unit: "lbs" as const, type: "other" as const, description: "Muscle gain" },
    ],
  },
  {
    category: "Competition",
    icon: "🏆",
    goals: [
      { exercise: "Complete a 5K", unit: "skill" as const, type: "skill" as const, description: "Run/walk 5K" },
      { exercise: "Complete a Marathon", unit: "skill" as const, type: "skill" as const, description: "26.2 miles" },
      { exercise: "Complete a Triathlon", unit: "skill" as const, type: "skill" as const, description: "Swim/bike/run" },
      { exercise: "Do a Powerlifting Meet", unit: "skill" as const, type: "skill" as const, description: "Compete" },
      { exercise: "Do a CrossFit Comp", unit: "skill" as const, type: "skill" as const, description: "Local/regional" },
      { exercise: "Qualify for CrossFit Games", unit: "skill" as const, type: "skill" as const, description: "Elite level" },
      { exercise: "Win Local Competition", unit: "skill" as const, type: "skill" as const, description: "Any sport" },
      { exercise: "Do a Bodybuilding Show", unit: "skill" as const, type: "skill" as const, description: "Stage ready" },
      { exercise: "Complete Spartan Race", unit: "skill" as const, type: "skill" as const, description: "OCR" },
      { exercise: "Do a Hyrox", unit: "skill" as const, type: "skill" as const, description: "Fitness race" },
    ],
  },
  {
    category: "Cardio/Time",
    icon: "🏃",
    goals: [
      { exercise: "Mile Run", unit: "min:sec" as const, type: "time" as const, description: "Target time" },
      { exercise: "5K Run", unit: "min:sec" as const, type: "time" as const, description: "Target time" },
      { exercise: "10K Run", unit: "min:sec" as const, type: "time" as const, description: "Target time" },
      { exercise: "2K Row", unit: "min:sec" as const, type: "time" as const, description: "Target time" },
      { exercise: "400m Sprint", unit: "seconds" as const, type: "time" as const, description: "Target time" },
      { exercise: "40-Yard Dash", unit: "seconds" as const, type: "time" as const, description: "Target time" },
    ],
  },
  {
    category: "Holds",
    icon: "⏱️",
    goals: [
      { exercise: "Plank Hold", unit: "seconds" as const, type: "time" as const, description: "Target time" },
      { exercise: "L-Sit Hold", unit: "seconds" as const, type: "time" as const, description: "Target time" },
      { exercise: "Dead Hang", unit: "seconds" as const, type: "time" as const, description: "Target time" },
      { exercise: "Handstand Hold", unit: "seconds" as const, type: "time" as const, description: "Target time" },
    ],
  },
];

type GoalUnit = "lbs" | "reps" | "seconds" | "min:sec" | "skill" | "aesthetic" | "other";

export function SpecificGoalsInput({
  onSubmit,
  onSkip,
  onClose,
  initialValue,
}: SpecificGoalsInputProps) {
  const [goals, setGoals] = useState<SpecificGoal[]>(initialValue ?? []);
  const [activeCategory, setActiveCategory] = useState<string>("Strength PRs");
  const [selectedGoal, setSelectedGoal] = useState<{
    exercise: string;
    unit: GoalUnit;
    type: "pr" | "skill" | "time" | "other" | "aesthetic";
    description: string;
  } | null>(null);
  const [targetValue, setTargetValue] = useState("");
  const [skillLevel, setSkillLevel] = useState<GoalSkillLevel>("learning");
  const [aestheticLevel, setAestheticLevel] = useState<AestheticLevel>("build");

  // Custom goal state
  const [showCustom, setShowCustom] = useState(false);
  const [customDescription, setCustomDescription] = useState("");
  const [customUnit, setCustomUnit] = useState<GoalUnit | "none">("none");
  const [customValue, setCustomValue] = useState("");

  const activeGoals =
    GOAL_CATEGORIES.find((c) => c.category === activeCategory)?.goals ?? [];

  const handleSelectGoal = (goal: typeof activeGoals[0]) => {
    const existing = goals.find((g) => g.exercise === goal.exercise);
    if (existing) {
      // Remove if already added
      setGoals(goals.filter((g) => g.exercise !== goal.exercise));
      return;
    }
    setSelectedGoal(goal);
    setTargetValue("");
    setSkillLevel("learning");
    setShowCustom(false);
  };

  const handleAddGoal = () => {
    if (!selectedGoal) return;

    // For skills, use the skill level
    if (selectedGoal.unit === "skill") {
      setGoals([
        ...goals,
        {
          type: "skill",
          exercise: selectedGoal.exercise,
          targetValue: skillLevel,
          targetUnit: "skill",
        },
      ]);
    } else if (selectedGoal.unit === "aesthetic") {
      // For aesthetics, use the aesthetic level
      setGoals([
        ...goals,
        {
          type: "aesthetic",
          exercise: selectedGoal.exercise,
          targetValue: aestheticLevel,
          targetUnit: "aesthetic",
        },
      ]);
    } else if (selectedGoal.unit === "other") {
      // Free text target (like "5%" for body fat)
      setGoals([
        ...goals,
        {
          type: "other",
          exercise: selectedGoal.exercise,
          description: targetValue.trim() || undefined,
        },
      ]);
    } else {
      if (!targetValue.trim()) return;
      setGoals([
        ...goals,
        {
          type: selectedGoal.type,
          exercise: selectedGoal.exercise,
          targetValue: selectedGoal.unit === "min:sec"
            ? (targetValue as unknown as number)
            : parseFloat(targetValue) || 0,
          targetUnit: selectedGoal.unit,
        },
      ]);
    }
    setSelectedGoal(null);
    setTargetValue("");
    setSkillLevel("learning");
    setAestheticLevel("build");
  };

  const handleAddCustom = () => {
    if (!customDescription.trim()) return;

    const newGoal: SpecificGoal = {
      type: "other",
      description: customDescription.trim(),
    };

    if (customUnit === "skill") {
      newGoal.targetValue = skillLevel;
      newGoal.targetUnit = "skill";
    } else if (customUnit !== "none" && customValue.trim()) {
      newGoal.targetValue = customUnit === "min:sec"
        ? (customValue as unknown as number)
        : parseFloat(customValue) || 0;
      newGoal.targetUnit = customUnit;
    }

    setGoals([...goals, newGoal]);
    setShowCustom(false);
    setCustomDescription("");
    setCustomUnit("none");
    setCustomValue("");
    setSkillLevel("learning");
    setAestheticLevel("build");
  };

  // Format display value for goals
  const formatGoalValue = (goal: SpecificGoal) => {
    if (goal.targetUnit === "skill") {
      const level = GOAL_SKILL_LEVELS.find((l) => l.value === goal.targetValue);
      return level ? `→ ${level.label}` : "";
    }
    if (goal.targetUnit === "aesthetic") {
      const level = AESTHETIC_LEVELS.find((l) => l.value === goal.targetValue);
      return level ? `→ ${level.label}` : "";
    }
    if (goal.description && !goal.targetValue) {
      return `→ ${goal.description}`;
    }
    if (!goal.targetValue) return "";
    if (goal.targetUnit === "min:sec") {
      return `→ ${goal.targetValue}`;
    }
    return `→ ${goal.targetValue} ${goal.targetUnit || ""}`.trim();
  };

  // Get level-based color for display (skill or aesthetic)
  const getLevelColor = (goal: SpecificGoal) => {
    if (typeof goal.targetValue !== "string") return null;
    if (goal.targetUnit === "skill") {
      return GOAL_SKILL_LEVELS.find((l) => l.value === goal.targetValue) || null;
    }
    if (goal.targetUnit === "aesthetic") {
      return AESTHETIC_LEVELS.find((l) => l.value === goal.targetValue) || null;
    }
    return null;
  };

  return (
    <InlineFieldWrapper
      title="Any specific fitness goals?"
      subtitle="PRs, skills, or performance targets you're working toward"
      icon={<Trophy style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />}
      onSubmit={() => onSubmit(goals)}
      onSkip={onSkip}
      onClose={onClose}
      showSkip
      submitLabel={goals.length > 0 ? `Continue (${goals.length} goals)` : "No specific goals"}
    >
      {/* Added goals */}
      {goals.length > 0 && (
        <div
          className="flex flex-wrap border-b border-border/30"
          style={{ gap: "0.5rem", marginBottom: "0.75rem", paddingBottom: "0.75rem" }}
        >
          {goals.map((goal, i) => {
            const levelInfo = getLevelColor(goal);
            const hasLevelColor = levelInfo !== null;

            return (
              <div
                key={i}
                className={cn(
                  "flex items-center rounded-lg text-sm",
                  hasLevelColor
                    ? `${levelInfo.color} text-white`
                    : "bg-brand/10 border border-brand/30"
                )}
                style={{ gap: "0.25rem", padding: "0.25rem 0.5rem" }}
              >
                <span>
                  {goal.exercise || goal.description}
                  {goal.targetValue && !hasLevelColor && ` ${formatGoalValue(goal)}`}
                  {hasLevelColor && (
                    <span style={{ marginLeft: "0.25rem" }} className="opacity-90">
                      • {levelInfo.label}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => setGoals(goals.filter((_, idx) => idx !== i))}
                  className={hasLevelColor ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"}
                  style={{ marginLeft: "0.25rem" }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Category tabs */}
      <div
        className="flex flex-wrap border-b border-border/30"
        style={{ gap: "0.25rem", marginBottom: "0.75rem", paddingBottom: "0.5rem" }}
      >
        {GOAL_CATEGORIES.map((cat) => (
          <button
            key={cat.category}
            onClick={() => {
              setActiveCategory(cat.category);
              setSelectedGoal(null);
              setShowCustom(false);
            }}
            className={cn(
              "rounded-lg text-xs font-medium transition-all",
              activeCategory === cat.category
                ? "bg-brand/10 text-brand ring-2 ring-brand"
                : "bg-surface border border-border/50 text-muted-foreground hover:text-foreground hover:border-brand/50"
            )}
            style={{ padding: "0.375rem 0.5rem" }}
          >
            {cat.icon} {cat.category}
          </button>
        ))}
      </div>

      {/* Goal options for active category */}
      <div className="grid grid-cols-2" style={{ gap: "0.5rem" }}>
        {activeGoals.map((goal) => {
          const isSelected = selectedGoal?.exercise === goal.exercise;
          const isAdded = goals.some((g) => g.exercise === goal.exercise);
          const addedGoal = goals.find((g) => g.exercise === goal.exercise);

          return (
            <button
              key={goal.exercise}
              onClick={() => handleSelectGoal(goal)}
              className={cn(
                "w-full rounded-lg text-left transition-all flex items-center border",
                isSelected
                  ? "bg-brand text-white border-brand ring-2 ring-brand ring-offset-2 ring-offset-background"
                  : isAdded
                  ? "bg-brand/10 border-brand text-foreground"
                  : "bg-surface border-border/50 hover:border-brand/50"
              )}
              style={{ padding: "0.5rem 0.75rem", gap: "0.5rem" }}
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium block truncate">{goal.exercise}</span>
                {isAdded && addedGoal && (
                  <span className="text-xs opacity-75">
                    {formatGoalValue(addedGoal)}
                  </span>
                )}
              </div>
              {isAdded && <Check style={{ width: "0.75rem", height: "0.75rem" }} />}
            </button>
          );
        })}
      </div>

      {/* Input area - shown below grid when goal selected */}
      {selectedGoal && (
        <div
          className="bg-muted/30 rounded-lg"
          style={{ marginTop: "0.75rem", padding: "0.75rem" }}
        >
          <div
            className="text-sm font-medium text-foreground"
            style={{ marginBottom: "0.5rem" }}
          >
            {selectedGoal.exercise}
            <span className="text-muted-foreground font-normal" style={{ marginLeft: "0.5rem" }}>
              ({selectedGoal.description})
            </span>
          </div>

          {/* Skill level selection for skill-based goals */}
          {selectedGoal.unit === "skill" ? (
            <div>
              <p className="text-xs text-muted-foreground" style={{ marginBottom: "0.5rem" }}>
                What&apos;s your target mastery level?
              </p>
              <div className="flex" style={{ gap: "0.5rem" }}>
                {GOAL_SKILL_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setSkillLevel(level.value)}
                    className={cn(
                      "flex-1 rounded-lg text-sm font-medium transition-all",
                      skillLevel === level.value
                        ? `${level.color} text-white ring-2 ring-offset-2 ring-offset-background`
                        : "bg-surface border border-border/50 text-foreground hover:border-brand/50"
                    )}
                    style={{ padding: "0.5rem" }}
                  >
                    <span className="block">{level.label}</span>
                    <span className="block text-xs opacity-75">{level.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : selectedGoal.unit === "aesthetic" ? (
            /* Aesthetic level selection for body composition goals */
            <div>
              <p className="text-xs text-muted-foreground" style={{ marginBottom: "0.5rem" }}>
                What&apos;s your goal for {selectedGoal.exercise}?
              </p>
              <div className="flex" style={{ gap: "0.5rem" }}>
                {AESTHETIC_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setAestheticLevel(level.value)}
                    className={cn(
                      "flex-1 rounded-lg text-sm font-medium transition-all",
                      aestheticLevel === level.value
                        ? `${level.color} text-white ring-2 ring-offset-2 ring-offset-background`
                        : "bg-surface border border-border/50 text-foreground hover:border-brand/50"
                    )}
                    style={{ padding: "0.5rem" }}
                  >
                    <span className="block">{level.label}</span>
                    <span className="block text-xs opacity-75">{level.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : selectedGoal.unit === "other" ? (
            /* Free text input for "other" type goals */
            <input
              type="text"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="e.g., 5%, under 200 lbs, etc."
              autoFocus
              className="w-full rounded-md border border-input bg-background text-sm"
              style={{ height: "2.25rem", padding: "0 0.75rem" }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddGoal();
                if (e.key === "Escape") setSelectedGoal(null);
              }}
            />
          ) : selectedGoal.unit === "min:sec" ? (
            <TimeInput
              value={targetValue}
              onChange={setTargetValue}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddGoal();
                if (e.key === "Escape") setSelectedGoal(null);
              }}
              autoFocus
            />
          ) : (
            <NumericInput
              value={targetValue}
              onChange={setTargetValue}
              unit={selectedGoal.unit as "lbs" | "reps" | "seconds"}
              placeholder={
                selectedGoal.unit === "seconds"
                  ? "60"
                  : selectedGoal.unit === "reps"
                  ? "20"
                  : "315"
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddGoal();
                if (e.key === "Escape") setSelectedGoal(null);
              }}
              autoFocus
            />
          )}

          <div className="flex justify-end" style={{ gap: "0.5rem", marginTop: "0.5rem" }}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedGoal(null)}
              style={{ height: "2.25rem" }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddGoal}
              disabled={selectedGoal.unit !== "skill" && selectedGoal.unit !== "aesthetic" && selectedGoal.unit !== "other" && !targetValue.trim()}
              style={{ height: "2.25rem" }}
            >
              Add Goal
            </Button>
          </div>
        </div>
      )}

      {/* Custom goal option */}
      {!selectedGoal && !showCustom && (
        <button
          onClick={() => setShowCustom(true)}
          className="text-sm text-muted-foreground hover:text-foreground"
          style={{ marginTop: "1rem", display: "block" }}
        >
          + Add custom goal
        </button>
      )}

      {/* Custom goal form */}
      {showCustom && (
        <div
          className="bg-muted/30 rounded-lg"
          style={{ marginTop: "0.75rem", padding: "0.75rem" }}
        >
          <div
            className="text-sm font-medium text-foreground"
            style={{ marginBottom: "0.5rem" }}
          >
            Custom Goal
          </div>

          {/* Description */}
          <input
            type="text"
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            placeholder="e.g., Learn to backflip, Run a marathon..."
            autoFocus
            className="w-full rounded-md border border-input bg-background text-sm"
            style={{ height: "2.25rem", padding: "0 0.75rem", marginBottom: "0.5rem" }}
          />

          {/* Optional target */}
          <div className="flex" style={{ gap: "0.5rem", marginBottom: "0.5rem" }}>
            <select
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value as GoalUnit | "none")}
              className="rounded-md border border-input bg-background text-sm"
              style={{ height: "2.25rem", padding: "0 0.5rem" }}
            >
              <option value="none">No target value</option>
              <option value="lbs">Weight (lbs)</option>
              <option value="reps">Reps</option>
              <option value="seconds">Seconds</option>
              <option value="min:sec">Time (min:sec)</option>
            </select>

            {customUnit !== "none" && customUnit === "min:sec" ? (
              <TimeInput
                value={customValue}
                onChange={setCustomValue}
              />
            ) : customUnit !== "none" ? (
              <NumericInput
                value={customValue}
                onChange={setCustomValue}
                unit={customUnit as "lbs" | "reps" | "seconds"}
                placeholder="Target"
              />
            ) : null}
          </div>

          <div className="flex justify-end" style={{ gap: "0.5rem" }}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowCustom(false);
                setCustomDescription("");
                setCustomUnit("none");
                setCustomValue("");
              }}
              style={{ height: "2.25rem" }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddCustom}
              disabled={!customDescription.trim()}
              style={{ height: "2.25rem" }}
            >
              Add Goal
            </Button>
          </div>
        </div>
      )}
    </InlineFieldWrapper>
  );
}
