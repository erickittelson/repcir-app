"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Battery,
  BatteryMedium,
  BatteryFull,
  Dumbbell,
  Home,
  Sun,
  User,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Footprints,
  Target,
  Heart,
  Feather,
  Activity,
  Flame,
  Zap,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ClarificationData, ClarificationOption } from "@/lib/ai/structured-chat";

// Map icon names to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  Clock,
  Battery,
  BatteryMedium,
  BatteryFull,
  Dumbbell,
  Home,
  Sun,
  User,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Footprints,
  Target,
  Heart,
  Feather,
  Activity,
  Flame,
  Zap,
};

interface ClarificationChipsProps {
  clarification: ClarificationData;
  onSelect: (value: string, context: string) => void;
  disabled?: boolean;
}

export function ClarificationChips({
  clarification,
  onSelect,
  disabled = false,
}: ClarificationChipsProps) {
  const [customValue, setCustomValue] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleOptionClick = (option: ClarificationOption) => {
    if (disabled) return;
    setSelectedId(option.id);
    onSelect(option.value, clarification.context);
  };

  const handleCustomSubmit = () => {
    if (!customValue.trim() || disabled) return;
    onSelect(customValue.trim(), clarification.context);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCustomSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      {/* Question text is rendered by parent, not here */}

      {/* Options grid */}
      <div className="flex flex-wrap gap-2">
        {clarification.options.map((option, index) => {
          const IconComponent = option.icon ? ICON_MAP[option.icon] : null;
          const isSelected = selectedId === option.id;

          return (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.2,
                delay: 0.05 + index * 0.03,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -1 }}
              whileTap={{ scale: disabled ? 1 : 0.98 }}
              onClick={() => handleOptionClick(option)}
              disabled={disabled}
              className={cn(
                "group relative flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium",
                "bg-card border border-border/60",
                "text-foreground/80",
                "hover:bg-accent hover:border-brand/30 hover:text-foreground",
                "transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "touch-manipulation",
                "shadow-sm hover:shadow",
                "min-h-[48px]",
                isSelected && "border-brand bg-brand/10 text-brand"
              )}
            >
              {IconComponent && (
                <IconComponent
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isSelected ? "text-brand" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
              )}
              <div className="flex flex-col items-start text-left">
                <span>{option.label}</span>
                {option.description && (
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {option.description}
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Custom input option */}
      {clarification.allowCustom && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 pt-1"
        >
          <Input
            type="text"
            placeholder="Or type something else..."
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={cn(
              "flex-1 h-10 rounded-xl border-border/50 bg-muted/50 text-sm",
              "focus:bg-background focus:border-brand/50",
              "transition-all duration-200"
            )}
          />
          <Button
            size="sm"
            onClick={handleCustomSubmit}
            disabled={!customValue.trim() || disabled}
            className="h-10 px-4 rounded-xl"
          >
            Send
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
