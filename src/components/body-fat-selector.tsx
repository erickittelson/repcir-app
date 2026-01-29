"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface BodyFatOption {
  range: string;
  value: number;
  label: string;
}

const MALE_BODY_FAT_OPTIONS: BodyFatOption[] = [
  { range: "5-9%", value: 7, label: "Very Lean" },
  { range: "10-14%", value: 12, label: "Lean" },
  { range: "15-19%", value: 17, label: "Athletic" },
  { range: "20-24%", value: 22, label: "Average" },
  { range: "25-29%", value: 27, label: "Above Average" },
  { range: "30%+", value: 32, label: "Higher" },
];

const FEMALE_BODY_FAT_OPTIONS: BodyFatOption[] = [
  { range: "12-16%", value: 14, label: "Very Lean" },
  { range: "17-21%", value: 19, label: "Lean" },
  { range: "22-26%", value: 24, label: "Athletic" },
  { range: "27-31%", value: 29, label: "Average" },
  { range: "32-36%", value: 34, label: "Above Average" },
  { range: "37%+", value: 39, label: "Higher" },
];

// Simplified male body SVG
function MaleBodySvg({ bodyFatPercent, isSelected }: { bodyFatPercent: number; isSelected: boolean }) {
  const baseColor = isSelected ? "#a855f7" : "#64748b";
  const bfNorm = Math.min(1, Math.max(0, (bodyFatPercent - 7) / 25));
  const waistWidth = 18 + bfNorm * 16;
  const bellyBulge = bodyFatPercent > 18 ? (bodyFatPercent - 18) * 0.4 : 0;

  return (
    <svg viewBox="0 0 60 100" className="w-full h-full">
      <ellipse cx="30" cy="10" rx={7 + bfNorm * 1.5} ry="9" fill={baseColor} />
      <rect x={27 - bfNorm * 1} y="18" width={6 + bfNorm * 2} height="5" fill={baseColor} />
      <path
        d={`M 15 23 Q 30 21 45 23 L 47 28 Q 30 26 13 28 Z`}
        fill={baseColor}
      />
      <path
        d={`M 15 28 Q 14 35 15 40
            C 15 45, ${30 - waistWidth/2 - bellyBulge} 48, ${30 - waistWidth/2} 55
            Q ${30 - waistWidth/2 + 2} 58 24 62
            L 36 62
            Q ${30 + waistWidth/2 - 2} 58 ${30 + waistWidth/2} 55
            C ${30 + waistWidth/2 + bellyBulge} 48, 45 45, 45 40
            Q 46 35 45 28 Z`}
        fill={baseColor}
      />
      <path d={`M 15 28 L 10 32 Q 7 42 8 52 L 13 52 Q 15 42 15 32 Z`} fill={baseColor} />
      <path d={`M 45 28 L 50 32 Q 53 42 52 52 L 47 52 Q 45 42 45 32 Z`} fill={baseColor} />
      <path d={`M 8 52 Q 7 58 8 64 L 12 64 Q 13 58 13 52 Z`} fill={baseColor} />
      <path d={`M 52 52 Q 53 58 52 64 L 48 64 Q 47 58 47 52 Z`} fill={baseColor} />
      <ellipse cx="10" cy="67" rx="2.5" ry="3" fill={baseColor} />
      <ellipse cx="50" cy="67" rx="2.5" ry="3" fill={baseColor} />
      <path d={`M 24 62 Q ${21 + bfNorm * 2} 75 ${20 + bfNorm} 88 L ${27 + bfNorm} 88 Q 28 75 28 62 Z`} fill={baseColor} />
      <path d={`M 36 62 Q ${39 - bfNorm * 2} 75 ${40 - bfNorm} 88 L ${33 - bfNorm} 88 Q 32 75 32 62 Z`} fill={baseColor} />
      <path d={`M ${20 + bfNorm} 88 Q 19 94 20 100 L 26 100 Q 27 94 ${27 + bfNorm} 88 Z`} fill={baseColor} />
      <path d={`M ${33 - bfNorm} 88 Q 33 94 34 100 L 40 100 Q 41 94 ${40 - bfNorm} 88 Z`} fill={baseColor} />
    </svg>
  );
}

// Simplified female body SVG
function FemaleBodySvg({ bodyFatPercent, isSelected }: { bodyFatPercent: number; isSelected: boolean }) {
  const baseColor = isSelected ? "#ec4899" : "#64748b";
  const bfNorm = Math.min(1, Math.max(0, (bodyFatPercent - 14) / 25));
  const waistWidth = 16 + bfNorm * 14;
  const hipWidth = 30 + bfNorm * 8;
  const bustSize = 4 + bfNorm * 2.5;

  return (
    <svg viewBox="0 0 60 100" className="w-full h-full">
      <ellipse cx="30" cy="10" rx={6.5 + bfNorm * 1} ry="8" fill={baseColor} />
      <rect x={27.5 - bfNorm * 0.5} y="17" width={5 + bfNorm * 1} height="5" fill={baseColor} />
      <path d={`M 19 22 Q 30 20 41 22 L 42 26 Q 30 24 18 26 Z`} fill={baseColor} />
      <path
        d={`M 18 26 Q 17 32 18 38
            C 18 44, ${30 - waistWidth/2} 46, ${30 - waistWidth/2} 50
            Q ${30 - hipWidth/2 - 2} 54 ${30 - hipWidth/2} 58
            Q ${30 - hipWidth/2 - 1} 62 ${30 - 10 - bfNorm * 3} 66
            L ${30 + 10 + bfNorm * 3} 66
            Q ${30 + hipWidth/2 + 1} 62 ${30 + hipWidth/2} 58
            Q ${30 + hipWidth/2 + 2} 54 ${30 + waistWidth/2} 50
            C ${30 + waistWidth/2} 46, 42 44, 42 38
            Q 43 32 42 26 Z`}
        fill={baseColor}
      />
      <ellipse cx={23 - bfNorm} cy={34} rx={bustSize} ry={bustSize - 0.5} fill={baseColor} />
      <ellipse cx={37 + bfNorm} cy={34} rx={bustSize} ry={bustSize - 0.5} fill={baseColor} />
      <path d={`M 18 26 L 13 30 Q 10 38 11 48 L 15 48 Q 16 38 18 30 Z`} fill={baseColor} />
      <path d={`M 42 26 L 47 30 Q 50 38 49 48 L 45 48 Q 44 38 42 30 Z`} fill={baseColor} />
      <path d={`M 11 48 Q 10 54 10 60 L 14 60 Q 15 54 15 48 Z`} fill={baseColor} />
      <path d={`M 49 48 Q 50 54 50 60 L 46 60 Q 45 54 45 48 Z`} fill={baseColor} />
      <ellipse cx="12" cy="63" rx="2.5" ry="3" fill={baseColor} />
      <ellipse cx="48" cy="63" rx="2.5" ry="3" fill={baseColor} />
      <path d={`M ${30 - 10 - bfNorm * 3} 66 Q ${18 + bfNorm * 2} 78 ${19 + bfNorm} 90 L ${27 + bfNorm} 90 Q 28 78 ${30 - 5} 66 Z`} fill={baseColor} />
      <path d={`M ${30 + 10 + bfNorm * 3} 66 Q ${42 - bfNorm * 2} 78 ${41 - bfNorm} 90 L ${33 - bfNorm} 90 Q 32 78 ${30 + 5} 66 Z`} fill={baseColor} />
      <path d={`M ${19 + bfNorm} 90 Q 18 95 19 100 L 26 100 Q 27 95 ${27 + bfNorm} 90 Z`} fill={baseColor} />
      <path d={`M ${33 - bfNorm} 90 Q 34 95 35 100 L 41 100 Q 42 95 ${41 - bfNorm} 90 Z`} fill={baseColor} />
    </svg>
  );
}

interface BodyFatSelectorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  onSkip?: () => void;
  gender?: string;
  className?: string;
}

export function BodyFatSelector({ value, onChange, onSubmit, onSkip, gender, className }: BodyFatSelectorProps) {
  const detectedGender = gender?.toLowerCase() === "female" ? "female" : "male";
  const options = detectedGender === "female" ? FEMALE_BODY_FAT_OPTIONS : MALE_BODY_FAT_OPTIONS;
  const selectedValue = value ? parseInt(value) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("mx-auto w-full max-w-md", className)}
      style={{ padding: "0.5rem" }}
    >
      {/* Options grid - no outer box */}
      <div
        className="grid grid-cols-3"
        style={{ gap: "0.75rem", marginBottom: "1rem" }}
      >
        {options.map((option) => {
          const isSelected = selectedValue === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value.toString())}
              className={cn(
                "relative flex flex-col items-center rounded-xl transition-all",
                isSelected
                  ? "bg-brand/15 ring-2 ring-brand ring-offset-2 ring-offset-background"
                  : "hover:bg-muted/50"
              )}
              style={{ padding: "0.75rem 0.5rem" }}
            >
              <div style={{ width: "3.5rem", height: "5rem" }}>
                {detectedGender === "male" ? (
                  <MaleBodySvg bodyFatPercent={option.value} isSelected={isSelected} />
                ) : (
                  <FemaleBodySvg bodyFatPercent={option.value} isSelected={isSelected} />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-semibold",
                  isSelected ? "text-brand" : "text-foreground"
                )}
                style={{ marginTop: "0.5rem" }}
              >
                {option.range}
              </span>
              <span className="text-[10px] text-muted-foreground">{option.label}</span>
            </button>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex" style={{ gap: "0.75rem" }}>
        {onSkip && (
          <Button
            variant="ghost"
            onClick={onSkip}
            className="flex-1 rounded-xl"
            style={{ height: "2.75rem" }}
          >
            Skip
          </Button>
        )}
        {onSubmit && (
          <Button
            onClick={() => onSubmit(value)}
            disabled={!value}
            className="flex-1 bg-energy-gradient hover:opacity-90 text-white font-semibold rounded-xl shadow-md"
            style={{ height: "2.75rem" }}
          >
            <Check style={{ width: "1rem", height: "1rem", marginRight: "0.5rem" }} />
            {value ? `Continue (${value}%)` : "Select one"}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export default BodyFatSelector;
