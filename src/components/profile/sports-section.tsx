"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Sport icons/emojis
const SPORT_ICONS: Record<string, string> = {
  baseball: "⚾",
  basketball: "🏀",
  boxing: "🥊",
  crossfit: "🏋️",
  cycling: "🚴",
  football: "🏈",
  golf: "⛳",
  gymnastics: "🤸",
  hockey: "🏒",
  lacrosse: "🥍",
  martial_arts: "🥋",
  mma: "🥊",
  olympic_weightlifting: "🏋️",
  pickleball: "🏓",
  powerlifting: "💪",
  rowing: "🚣",
  rugby: "🏉",
  running: "🏃",
  soccer: "⚽",
  softball: "🥎",
  swimming: "🏊",
  tennis: "🎾",
  track_field: "🏃",
  triathlon: "🏊",
  volleyball: "🏐",
  wrestling: "🤼",
  yoga: "🧘",
};

const SPORT_LABELS: Record<string, string> = {
  baseball: "Baseball",
  basketball: "Basketball",
  boxing: "Boxing",
  crossfit: "CrossFit",
  cycling: "Cycling",
  football: "Football",
  golf: "Golf",
  gymnastics: "Gymnastics",
  hockey: "Hockey",
  lacrosse: "Lacrosse",
  martial_arts: "Martial Arts",
  mma: "MMA",
  olympic_weightlifting: "Olympic Weightlifting",
  pickleball: "Pickleball",
  powerlifting: "Powerlifting",
  rowing: "Rowing",
  rugby: "Rugby",
  running: "Running",
  soccer: "Soccer",
  softball: "Softball",
  swimming: "Swimming",
  tennis: "Tennis",
  track_field: "Track & Field",
  triathlon: "Triathlon",
  volleyball: "Volleyball",
  wrestling: "Wrestling",
  yoga: "Yoga",
};

const LEVEL_LABELS: Record<string, string> = {
  recreational: "Recreational",
  youth: "Youth",
  high_school: "High School",
  college: "College",
  amateur: "Amateur",
  semi_pro: "Semi-Pro",
  professional: "Professional",
};

interface Sport {
  id: string;
  sport: string;
  level?: string;
  yearsPlaying?: number;
  position?: string;
  currentlyActive: boolean;
}

interface SportsSectionProps {
  sports: Sport[];
  onAdd?: (sport: Omit<Sport, "id">) => Promise<void>;
  onRemove?: (id: string) => Promise<void>;
  onUpdate?: (id: string, data: Partial<Sport>) => Promise<void>;
  readOnly?: boolean;
}

export function SportsSection({
  sports,
  onAdd,
  onRemove,
  onUpdate,
  readOnly = false,
}: SportsSectionProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [yearsPlaying, setYearsPlaying] = useState<string>("");
  const [position, setPosition] = useState<string>("");
  const [currentlyActive, setCurrentlyActive] = useState(true);

  const resetForm = () => {
    setSelectedSport("");
    setLevel("");
    setYearsPlaying("");
    setPosition("");
    setCurrentlyActive(true);
  };

  const handleAdd = async () => {
    if (!selectedSport || !onAdd) return;

    setSaving(true);
    try {
      await onAdd({
        sport: selectedSport,
        level: level || undefined,
        yearsPlaying: yearsPlaying ? parseInt(yearsPlaying) : undefined,
        position: position || undefined,
        currentlyActive,
      });
      toast.success("Sport added");
      setShowAddDialog(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to add sport");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!onRemove) return;
    
    try {
      await onRemove(id);
      toast.success("Sport removed");
    } catch (error) {
      toast.error("Failed to remove sport");
    }
  };

  // Sort: active sports first, then alphabetically
  const sortedSports = [...sports].sort((a, b) => {
    if (a.currentlyActive !== b.currentlyActive) {
      return a.currentlyActive ? -1 : 1;
    }
    return (SPORT_LABELS[a.sport] || a.sport).localeCompare(
      SPORT_LABELS[b.sport] || b.sport
    );
  });

  return (
    <div className="space-y-3">
      {sortedSports.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sports added yet</p>
      ) : (
        <div className="space-y-2">
          {sortedSports.map((sport) => (
            <SportItem
              key={sport.id}
              sport={sport}
              onRemove={!readOnly ? () => handleRemove(sport.id) : undefined}
            />
          ))}
        </div>
      )}

      {!readOnly && onAdd && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Sport
        </Button>
      )}

      {/* Add Sport Dialog */}
      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Sport</DialogTitle>
            <DialogDescription>
              Add a sport you play to display on your profile
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Sport Selection */}
            <div className="space-y-2">
              <Label>Sport *</Label>
              <Select value={selectedSport} onValueChange={setSelectedSport}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a sport" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SPORT_LABELS)
                    .filter(([key]) => !sports.some((s) => s.sport === key))
                    .sort((a, b) => a[1].localeCompare(b[1]))
                    .map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-2">
                          <span>{SPORT_ICONS[value] || "🏅"}</span>
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Level */}
            <div className="space-y-2">
              <Label>Level (optional)</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Years Playing */}
            <div className="space-y-2">
              <Label>Years Playing (optional)</Label>
              <Input
                type="number"
                min="0"
                max="80"
                value={yearsPlaying}
                onChange={(e) => setYearsPlaying(e.target.value)}
                placeholder="e.g., 5"
              />
            </div>

            {/* Position */}
            <div className="space-y-2">
              <Label>Position (optional)</Label>
              <Input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g., Quarterback, Midfielder"
              />
            </div>

            {/* Currently Active */}
            <div className="flex items-center justify-between">
              <Label>Currently Active</Label>
              <Switch
                checked={currentlyActive}
                onCheckedChange={setCurrentlyActive}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowAddDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleAdd}
              disabled={!selectedSport || saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Sport
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SportItem({
  sport,
  onRemove,
}: {
  sport: Sport;
  onRemove?: () => void;
}) {
  const icon = SPORT_ICONS[sport.sport] || "🏅";
  const label = SPORT_LABELS[sport.sport] || sport.sport;
  const levelLabel = sport.level ? LEVEL_LABELS[sport.level] : null;

  return (
    <div className="flex items-center justify-between rounded-lg bg-muted p-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-xl">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{label}</p>
            {!sport.currentlyActive && (
              <Badge variant="outline" className="text-xs">
                Past
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {levelLabel && <span>{levelLabel}</span>}
            {sport.yearsPlaying && (
              <>
                {levelLabel && <span>•</span>}
                <span>{sport.yearsPlaying} years</span>
              </>
            )}
            {sport.position && (
              <>
                {(levelLabel || sport.yearsPlaying) && <span>•</span>}
                <span>{sport.position}</span>
              </>
            )}
          </div>
        </div>
      </div>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * Compact sport badge for display on profiles
 */
export function SportBadge({ sport }: { sport: string }) {
  const icon = SPORT_ICONS[sport] || "🏅";
  const label = SPORT_LABELS[sport] || sport;

  return (
    <Badge variant="secondary" className="gap-1">
      <span>{icon}</span>
      {label}
    </Badge>
  );
}
