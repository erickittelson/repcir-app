"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SectionProps } from "./types";

const EQUIPMENT = [
  { id: "bodyweight", label: "Bodyweight", emoji: "🏃" },
  { id: "dumbbells", label: "Dumbbells", emoji: "🏋️" },
  { id: "barbell", label: "Barbell", emoji: "🔩" },
  { id: "plates", label: "Weight Plates", emoji: "⚫" },
  { id: "squat_rack", label: "Squat Rack", emoji: "🏗️" },
  { id: "bench", label: "Bench", emoji: "🛋️" },
  { id: "pull_up_bar", label: "Pull-up Bar", emoji: "🔝" },
  { id: "kettlebells", label: "Kettlebells", emoji: "🔔" },
  { id: "cables", label: "Cable Machine", emoji: "⚙️" },
  { id: "machines", label: "Weight Machines", emoji: "🎰" },
  { id: "resistance_bands", label: "Bands", emoji: "🎗️" },
  { id: "trx", label: "TRX/Suspension", emoji: "🪢" },
  { id: "cardio", label: "Cardio Machines", emoji: "🚴" },
  { id: "rower", label: "Rowing Machine", emoji: "🚣" },
  { id: "box", label: "Plyo Box", emoji: "📦" },
  { id: "medicine_ball", label: "Medicine Ball", emoji: "🏀" },
  { id: "jump_rope", label: "Jump Rope", emoji: "🪢" },
  { id: "rings", label: "Gymnastic Rings", emoji: "⭕" },
  { id: "foam_roller", label: "Foam Roller", emoji: "🧻" },
  { id: "full_gym", label: "Full Gym", emoji: "🏢" },
];

export function EquipmentSection({ data, onUpdate, onNext }: SectionProps) {
  const [selected, setSelected] = useState<string[]>(data.equipmentAccess || []);

  const toggleEquipment = (id: string) => {
    if (id === "full_gym") {
      // If selecting full gym, select everything
      setSelected(EQUIPMENT.map((e) => e.id));
    } else if (id === "bodyweight") {
      // If selecting bodyweight only, deselect everything else
      setSelected(["bodyweight"]);
    } else {
      setSelected((prev) => {
        const next = prev.includes(id)
          ? prev.filter((e) => e !== id)
          : [...prev.filter((e) => e !== "full_gym"), id];
        return next;
      });
    }
  };

  const handleContinue = () => {
    onUpdate({ equipmentAccess: selected });
    onNext();
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg mx-auto w-full text-center"
      >
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
          <Dumbbell className="w-8 h-8 text-brand" />
        </div>

        <h2 className="text-2xl md:text-3xl font-bold mb-2">
          What equipment do you have?
        </h2>
        <p className="text-muted-foreground mb-6">
          Select all that you have access to
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
          {EQUIPMENT.map(({ id, label, emoji }, index) => (
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
                selected.includes(id)
                  ? "border-brand bg-brand/10"
                  : "border-border bg-card"
              )}
            >
              <span className="text-xl">{emoji}</span>
              <span className="text-[10px] font-medium leading-tight text-center">{label}</span>
              {selected.includes(id) && (
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
          onClick={handleContinue}
          disabled={selected.length === 0}
          className="w-full h-14 text-lg bg-energy-gradient hover:opacity-90 rounded-xl group"
        >
          Continue
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </motion.div>
    </div>
  );
}
