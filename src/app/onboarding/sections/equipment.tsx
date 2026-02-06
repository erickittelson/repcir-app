"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Dumbbell, Home, Building2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SectionProps } from "./types";

// Location types
const LOCATION_TYPES = [
  { id: "home", label: "Home Gym", emoji: "🏠", description: "I work out at home" },
  { id: "commercial", label: "Commercial Gym", emoji: "🏢", description: "Planet Fitness, LA Fitness, etc." },
  { id: "crossfit", label: "CrossFit Box", emoji: "🏋️", description: "CrossFit affiliate gym" },
  { id: "school", label: "School/University", emoji: "🎓", description: "School or campus gym" },
  { id: "outdoor", label: "Outdoor/Park", emoji: "🌳", description: "Park, track, or outdoor area" },
];

// Home gym equipment options
const HOME_EQUIPMENT = [
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

// Common dumbbell weight sets (in lbs)
const DUMBBELL_OPTIONS = [
  { label: "Light (5-25 lbs)", max: 25, weights: [5, 10, 15, 20, 25] },
  { label: "Medium (5-50 lbs)", max: 50, weights: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] },
  { label: "Heavy (5-75 lbs)", max: 75, weights: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75] },
  { label: "Full Set (5-100+ lbs)", max: 100, weights: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100] },
  { label: "Adjustable (specify max)", max: 0, weights: [] },
];

// Common plate configurations
const PLATE_OPTIONS = [
  { label: "Basic (up to 135 lbs)", totalWeight: 90, plates: [2.5, 5, 10, 25, 45] },
  { label: "Intermediate (up to 225 lbs)", totalWeight: 180, plates: [2.5, 5, 10, 25, 35, 45] },
  { label: "Advanced (up to 315 lbs)", totalWeight: 270, plates: [2.5, 5, 10, 25, 35, 45] },
  { label: "Full Home Gym (up to 405+ lbs)", totalWeight: 360, plates: [2.5, 5, 10, 25, 35, 45] },
];

type Step = "location" | "equipment" | "weights";

interface EquipmentDetails {
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

export function EquipmentSection({ data, onUpdate, onNext }: SectionProps) {
  const [step, setStep] = useState<Step>("location");
  const [locations, setLocations] = useState<string[]>(data.gymLocations || []);
  const [equipment, setEquipment] = useState<string[]>(data.equipmentAccess || []);
  const [equipmentDetails, setEquipmentDetails] = useState<EquipmentDetails>(
    data.equipmentDetails || {}
  );
  const [dumbbellSelection, setDumbbellSelection] = useState<number | null>(null);
  const [plateSelection, setPlateSelection] = useState<number | null>(null);
  const [adjustableMax, setAdjustableMax] = useState<string>("");

  const hasHomeGym = locations.includes("home");
  const hasCommercialGym = locations.some(l => ["commercial", "crossfit", "school"].includes(l));

  const toggleLocation = (id: string) => {
    setLocations((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  const toggleEquipment = (id: string) => {
    if (id === "bodyweight") {
      setEquipment(["bodyweight"]);
      setEquipmentDetails({});
    } else {
      setEquipment((prev) => {
        const next = prev.includes(id)
          ? prev.filter((e) => e !== id)
          : [...prev.filter((e) => e !== "bodyweight"), id];
        return next;
      });
    }
  };

  const handleLocationContinue = () => {
    if (hasHomeGym) {
      setStep("equipment");
    } else if (hasCommercialGym) {
      // Commercial gym = full equipment assumed
      onUpdate({
        gymLocations: locations,
        equipmentAccess: ["full_gym"],
        equipmentDetails: {},
      });
      onNext();
    } else if (locations.includes("outdoor")) {
      onUpdate({
        gymLocations: locations,
        equipmentAccess: ["bodyweight", "resistance_bands"],
        equipmentDetails: {},
      });
      onNext();
    }
  };

  const handleEquipmentContinue = () => {
    const hasDumbbells = equipment.includes("dumbbells");
    const hasBarbell = equipment.includes("barbell");

    if (hasDumbbells || hasBarbell) {
      setStep("weights");
    } else {
      finishSection();
    }
  };

  const finishSection = () => {
    // Build final equipment details
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

    // Combine home equipment with commercial if they have both
    let finalEquipment = [...equipment];
    if (hasCommercialGym) {
      finalEquipment = [...new Set([...finalEquipment, "full_gym"])];
    }

    onUpdate({
      gymLocations: locations,
      equipmentAccess: finalEquipment,
      equipmentDetails: details,
    });
    onNext();
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {/* Step 1: Location Selection */}
        {step === "location" && (
          <motion.div
            key="location"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-lg mx-auto w-full text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-brand" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Where do you work out?
            </h2>
            <p className="text-muted-foreground mb-6">
              Select all that apply
            </p>

            <div className="space-y-3 mb-6">
              {LOCATION_TYPES.map(({ id, label, emoji, description }, index) => (
                <motion.button
                  key={id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => toggleLocation(id)}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 transition-all",
                    "flex items-center gap-4 text-left",
                    "hover:border-brand hover:bg-brand/5 active:scale-[0.98]",
                    locations.includes(id)
                      ? "border-brand bg-brand/10"
                      : "border-border bg-card"
                  )}
                >
                  <span className="text-2xl">{emoji}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{label}</div>
                    <div className="text-sm text-muted-foreground">{description}</div>
                  </div>
                  {locations.includes(id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-brand flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>

            <Button
              onClick={handleLocationContinue}
              disabled={locations.length === 0}
              className="w-full h-14 text-lg bg-energy-gradient hover:opacity-90 rounded-xl group"
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        )}

        {/* Step 2: Home Equipment Selection */}
        {step === "equipment" && (
          <motion.div
            key="equipment"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-lg mx-auto w-full text-center"
          >
            <button
              onClick={() => setStep("location")}
              className="absolute top-4 left-4 p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Home className="w-8 h-8 text-brand" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              What&apos;s in your home gym?
            </h2>
            <p className="text-muted-foreground mb-6">
              Select all equipment you have at home
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
              {HOME_EQUIPMENT.map(({ id, label, emoji }, index) => (
                <motion.button
                  key={id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => toggleEquipment(id)}
                  className={cn(
                    "relative p-3 rounded-xl border-2 transition-all touch-target",
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
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-brand flex items-center justify-center"
                    >
                      <Check className="w-2.5 h-2.5 text-white" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>

            <Button
              onClick={handleEquipmentContinue}
              disabled={equipment.length === 0}
              className="w-full h-14 text-lg bg-energy-gradient hover:opacity-90 rounded-xl group"
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        )}

        {/* Step 3: Weight Details */}
        {step === "weights" && (
          <motion.div
            key="weights"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-lg mx-auto w-full text-center"
          >
            <button
              onClick={() => setStep("equipment")}
              className="absolute top-4 left-4 p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-brand" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              What weights do you have?
            </h2>
            <p className="text-muted-foreground mb-6">
              This helps us create workouts that match your equipment
            </p>

            <div className="space-y-6 text-left">
              {/* Dumbbell Selection */}
              {equipment.includes("dumbbells") && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <span className="text-xl">🏋️</span> Dumbbell Range
                  </h3>
                  <div className="space-y-2">
                    {DUMBBELL_OPTIONS.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => setDumbbellSelection(index)}
                        className={cn(
                          "w-full p-3 rounded-lg border-2 transition-all text-left",
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
                        <input
                          type="number"
                          placeholder="Max weight (lbs)"
                          value={adjustableMax}
                          onChange={(e) => setAdjustableMax(e.target.value)}
                          className="w-full p-3 rounded-lg border-2 border-border bg-background focus:border-brand focus:outline-none"
                        />
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {/* Barbell/Plate Selection */}
              {equipment.includes("barbell") && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <span className="text-xl">🔩</span> Barbell & Plates
                  </h3>
                  <div className="space-y-2">
                    {PLATE_OPTIONS.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => setPlateSelection(index)}
                        className={cn(
                          "w-full p-3 rounded-lg border-2 transition-all text-left",
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

            <Button
              onClick={finishSection}
              className="w-full h-14 text-lg bg-energy-gradient hover:opacity-90 rounded-xl group mt-6"
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
