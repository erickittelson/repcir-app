"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronLeft, Dumbbell, Home } from "lucide-react";
import { cn } from "@/lib/utils";

// Home gym equipment options (matching onboarding)
export const HOME_EQUIPMENT = [
  { id: "bodyweight", label: "Bodyweight Only", emoji: "🏃" },
  { id: "dumbbells", label: "Dumbbells", emoji: "🏋️" },
  { id: "barbell", label: "Barbell & Plates", emoji: "🔩" },
  { id: "squat_rack", label: "Squat Rack/Stand", emoji: "🏗️" },
  { id: "bench", label: "Bench", emoji: "🛋️" },
  { id: "pull_up_bar", label: "Pull-up Bar", emoji: "🔝" },
  { id: "kettlebells", label: "Kettlebells", emoji: "🔔" },
  { id: "resistance_bands", label: "Resistance Bands", emoji: "🎗️" },
  { id: "cables", label: "Cable Machine", emoji: "⚙️" },
  { id: "cardio", label: "Cardio Equipment", emoji: "🚴" },
  { id: "trx", label: "TRX/Suspension", emoji: "🪢" },
  { id: "rings", label: "Gymnastic Rings", emoji: "⭕" },
  { id: "box", label: "Plyo Box", emoji: "📦" },
  { id: "medicine_ball", label: "Medicine Ball", emoji: "🏀" },
  { id: "jump_rope", label: "Jump Rope", emoji: "🪢" },
  { id: "foam_roller", label: "Foam Roller", emoji: "🧻" },
];

// Dumbbell weight options
export const DUMBBELL_OPTIONS = [
  { label: "Light (5-25 lbs)", max: 25, weights: [5, 10, 15, 20, 25] },
  { label: "Medium (5-50 lbs)", max: 50, weights: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] },
  { label: "Heavy (5-75 lbs)", max: 75, weights: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75] },
  { label: "Full Set (5-100+ lbs)", max: 100, weights: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100] },
  { label: "Adjustable (specify max)", max: 0, weights: [] },
];

// Plate configuration options
export const PLATE_OPTIONS = [
  { label: "Basic (up to 135 lbs)", totalWeight: 90, plates: [2.5, 5, 10, 25, 45] },
  { label: "Intermediate (up to 225 lbs)", totalWeight: 180, plates: [2.5, 5, 10, 25, 35, 45] },
  { label: "Advanced (up to 315 lbs)", totalWeight: 270, plates: [2.5, 5, 10, 25, 35, 45] },
  { label: "Full Home Gym (up to 405+ lbs)", totalWeight: 360, plates: [2.5, 5, 10, 25, 35, 45] },
];

export interface EquipmentDetails {
  dumbbells?: {
    available: boolean;
    type?: "fixed" | "adjustable" | "both";
    maxWeight?: number;
    weights?: number[];
  };
  barbell?: {
    available: boolean;
    type?: "standard" | "olympic";
    barWeight?: number;
    plates?: number[];
    totalPlateWeight?: number;
  };
}

type Step = "equipment" | "weights";

interface HomeGymSetupProps {
  initialEquipment?: string[];
  initialDetails?: EquipmentDetails;
  onComplete: (equipment: string[], details: EquipmentDetails) => void;
  onCancel: () => void;
  compact?: boolean; // If true, shows in a more compact form for the dialog
}

export function HomeGymSetup({
  initialEquipment = [],
  initialDetails = {},
  onComplete,
  onCancel,
  compact = false,
}: HomeGymSetupProps) {
  const [step, setStep] = useState<Step>("equipment");
  const [equipment, setEquipment] = useState<string[]>(initialEquipment);
  const [dumbbellSelection, setDumbbellSelection] = useState<number | null>(
    initialDetails.dumbbells?.type === "adjustable" ? 4 :
    initialDetails.dumbbells?.maxWeight ?
      DUMBBELL_OPTIONS.findIndex(o => o.max === initialDetails.dumbbells?.maxWeight) : null
  );
  const [plateSelection, setPlateSelection] = useState<number | null>(
    initialDetails.barbell?.totalPlateWeight ?
      PLATE_OPTIONS.findIndex(o => o.totalWeight === initialDetails.barbell?.totalPlateWeight) : null
  );
  const [adjustableMax, setAdjustableMax] = useState<string>(
    initialDetails.dumbbells?.type === "adjustable"
      ? String(initialDetails.dumbbells?.maxWeight || "")
      : ""
  );

  const toggleEquipment = (id: string) => {
    if (id === "bodyweight") {
      setEquipment(["bodyweight"]);
    } else {
      setEquipment((prev) => {
        const next = prev.includes(id)
          ? prev.filter((e) => e !== id)
          : [...prev.filter((e) => e !== "bodyweight"), id];
        return next;
      });
    }
  };

  const handleEquipmentContinue = () => {
    const hasDumbbells = equipment.includes("dumbbells");
    const hasBarbell = equipment.includes("barbell");

    if (hasDumbbells || hasBarbell) {
      setStep("weights");
    } else {
      finishSetup();
    }
  };

  const finishSetup = () => {
    const details: EquipmentDetails = {};

    if (equipment.includes("dumbbells") && dumbbellSelection !== null) {
      const option = DUMBBELL_OPTIONS[dumbbellSelection];
      details.dumbbells = {
        available: true,
        type: option.max === 0 ? "adjustable" : "fixed",
        maxWeight: option.max === 0 ? parseInt(adjustableMax) || 50 : option.max,
        weights: option.max === 0 ? [] : option.weights,
      };
    }

    if (equipment.includes("barbell") && plateSelection !== null) {
      const option = PLATE_OPTIONS[plateSelection];
      details.barbell = {
        available: true,
        type: "olympic",
        barWeight: 45,
        plates: option.plates,
        totalPlateWeight: option.totalWeight,
      };
    }

    onComplete(equipment, details);
  };

  return (
    <div className={cn("space-y-4", compact ? "" : "p-4")}>
      <AnimatePresence mode="wait">
        {/* Step 1: Equipment Selection */}
        {step === "equipment" && (
          <motion.div
            key="equipment"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                <Home className="w-5 h-5 text-brand" />
              </div>
              <div>
                <h3 className="font-semibold">Home Gym Equipment</h3>
                <p className="text-sm text-muted-foreground">
                  Select all equipment you have
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
              {HOME_EQUIPMENT.map(({ id, label, emoji }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleEquipment(id)}
                  className={cn(
                    "relative p-3 rounded-xl border-2 transition-all",
                    "flex flex-col items-center gap-1",
                    "hover:border-brand hover:bg-brand/5 active:scale-95",
                    equipment.includes(id)
                      ? "border-brand bg-brand/10"
                      : "border-border bg-card"
                  )}
                >
                  <span className="text-xl">{emoji}</span>
                  <span className="text-[10px] font-medium leading-tight text-center">
                    {label}
                  </span>
                  {equipment.includes(id) && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-brand flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleEquipmentContinue}
                disabled={equipment.length === 0}
                className="flex-1"
              >
                {equipment.includes("dumbbells") || equipment.includes("barbell")
                  ? "Next: Weight Details"
                  : "Done"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Weight Details */}
        {step === "weights" && (
          <motion.div
            key="weights"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <button
              onClick={() => setStep("equipment")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to equipment
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-brand" />
              </div>
              <div>
                <h3 className="font-semibold">Weight Details</h3>
                <p className="text-sm text-muted-foreground">
                  This helps create workouts that match your equipment
                </p>
              </div>
            </div>

            <div className="space-y-6 text-left">
              {/* Dumbbell Selection */}
              {equipment.includes("dumbbells") && (
                <div>
                  <Label className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🏋️</span> Dumbbell Range
                  </Label>
                  <div className="space-y-2">
                    {DUMBBELL_OPTIONS.map((option, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setDumbbellSelection(index)}
                        className={cn(
                          "w-full p-3 rounded-lg border-2 transition-all text-left text-sm",
                          "hover:border-brand hover:bg-brand/5",
                          dumbbellSelection === index
                            ? "border-brand bg-brand/10"
                            : "border-border"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                    {dumbbellSelection === 4 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="pt-2"
                      >
                        <Input
                          type="number"
                          placeholder="Max weight (lbs)"
                          value={adjustableMax}
                          onChange={(e) => setAdjustableMax(e.target.value)}
                        />
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {/* Barbell/Plate Selection */}
              {equipment.includes("barbell") && (
                <div>
                  <Label className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🔩</span> Barbell & Plates
                  </Label>
                  <div className="space-y-2">
                    {PLATE_OPTIONS.map((option, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setPlateSelection(index)}
                        className={cn(
                          "w-full p-3 rounded-lg border-2 transition-all text-left text-sm",
                          "hover:border-brand hover:bg-brand/5",
                          plateSelection === index
                            ? "border-brand bg-brand/10"
                            : "border-border"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Assumes 45 lb Olympic barbell
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => setStep("equipment")} className="flex-1">
                Back
              </Button>
              <Button onClick={finishSetup} className="flex-1">
                Done
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Map home equipment IDs to catalog equipment names for saving
export const HOME_EQUIPMENT_TO_CATALOG: Record<string, string[]> = {
  bodyweight: [],
  dumbbells: ["Dumbbells"],
  barbell: ["Barbell", "Weight Plates"],
  squat_rack: ["Squat Rack"],
  bench: ["Flat Bench", "Adjustable Bench"],
  pull_up_bar: ["Pull-up Bar"],
  kettlebells: ["Kettlebells"],
  resistance_bands: ["Resistance Bands"],
  cables: ["Cable Machine"],
  cardio: ["Treadmill", "Stationary Bike", "Rowing Machine"],
  trx: ["TRX"],
  rings: ["Gymnastics Rings"],
  box: ["Plyo Box"],
  medicine_ball: ["Medicine Ball"],
  jump_rope: ["Jump Rope"],
  foam_roller: ["Foam Roller"],
};
