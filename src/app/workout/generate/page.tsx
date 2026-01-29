"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Clock,
  Dumbbell,
  Target,
  Flame,
  MapPin,
  Users,
  Home,
  Building2,
  Zap,
  GraduationCap,
  TreePine,
  Plane,
  Plus,
  AlertCircle,
  Lightbulb,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FOCUS_AREAS = [
  { id: "upper", label: "Upper Body", icon: "💪" },
  { id: "lower", label: "Lower Body", icon: "🦵" },
  { id: "core", label: "Core", icon: "🎯" },
  { id: "full", label: "Full Body", icon: "🏋️" },
  { id: "cardio", label: "Cardio", icon: "❤️" },
  { id: "flexibility", label: "Flexibility", icon: "🧘" },
];

const INTENSITIES = [
  { id: "light", label: "Light", description: "Easy pace, recovery focus" },
  { id: "moderate", label: "Moderate", description: "Steady effort, sustainable" },
  { id: "intense", label: "Intense", description: "Challenging, push limits" },
];

const LOCATION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  commercial: Building2,
  crossfit: Zap,
  school: GraduationCap,
  outdoor: TreePine,
  travel: Plane,
  custom: Dumbbell,
};

interface Location {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  equipment: string[];
}

interface CircleMember {
  id: string;
  name: string;
  profilePicture?: string;
}

export default function GenerateWorkoutPage() {
  const router = useRouter();
  const [focusArea, setFocusArea] = useState<string>("");
  const [intensity, setIntensity] = useState<string>("moderate");
  const [duration, setDuration] = useState<number>(30);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Location state
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [loadingLocations, setLoadingLocations] = useState(true);
  
  // Circle members state
  const [circleMembers, setCircleMembers] = useState<CircleMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Equipment setup prompt state
  const [showEquipmentPrompt, setShowEquipmentPrompt] = useState(false);
  const [hasSeenPrompt, setHasSeenPrompt] = useState(false);

  // Fetch locations and circle members on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch locations
        const locationsRes = await fetch("/api/locations");
        if (locationsRes.ok) {
          const locationsData = await locationsRes.json();
          setLocations(locationsData);
          // Auto-select active location
          const activeLocation = locationsData.find((l: Location) => l.isActive);
          if (activeLocation) {
            setSelectedLocationId(activeLocation.id);
          }
          
          // Check if any location has equipment - show prompt if not
          const hasEquipment = locationsData.some((l: Location) => l.equipment && l.equipment.length > 0);
          const promptDismissed = localStorage.getItem("equipment_prompt_dismissed");
          
          if (!hasEquipment && !promptDismissed && !hasSeenPrompt) {
            setShowEquipmentPrompt(true);
            setHasSeenPrompt(true);
          }
        }
      } catch (error) {
        console.error("Failed to fetch locations:", error);
      } finally {
        setLoadingLocations(false);
      }

      try {
        // Fetch circle members
        const membersRes = await fetch("/api/members");
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setCircleMembers(membersData);
        }
      } catch (error) {
        console.error("Failed to fetch members:", error);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchData();
  }, [hasSeenPrompt]);

  const dismissEquipmentPrompt = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem("equipment_prompt_dismissed", "true");
    }
    setShowEquipmentPrompt(false);
  };

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focusArea,
          intensity,
          duration,
          customPrompt: customPrompt || undefined,
          locationId: selectedLocationId || undefined,
          memberIds: selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate workout");

      const { workout } = await response.json();

      toast.success("Workout generated!");
      router.push(`/workout/${workout.id}`);
    } catch (error) {
      toast.error("Failed to generate workout");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background px-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold">AI Workout Generator</h1>
      </header>

      <div className="p-4 space-y-6 pb-24">
        {/* Location Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand" />
              Where are you working out?
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLocations ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  No locations set up yet. Add a gym to get equipment-aware workouts.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/equipment")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Location
                </Button>
              </div>
            ) : (
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a location">
                    {selectedLocation && (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const Icon = LOCATION_ICONS[selectedLocation.type] || Dumbbell;
                          return <Icon className="h-4 w-4" />;
                        })()}
                        <span>{selectedLocation.name}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {selectedLocation.equipment.length} items
                        </Badge>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => {
                    const Icon = LOCATION_ICONS[location.type] || Dumbbell;
                    return (
                      <SelectItem key={location.id} value={location.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{location.name}</span>
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {location.equipment.length} items
                          </Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Circle Members Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-energy" />
              Who&apos;s working out?
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMembers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : circleMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                Just you! Add circle members to create group workouts.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-3">
                  Select additional circle members to include in this workout
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {circleMembers.map((member) => {
                    const isSelected = selectedMemberIds.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleMember(member.id)}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border transition-all text-left",
                          isSelected
                            ? "border-energy bg-energy/10"
                            : "border-border hover:bg-accent"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          className="pointer-events-none"
                        />
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.profilePicture} />
                          <AvatarFallback className="text-xs">
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">{member.name}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedMemberIds.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedMemberIds.length} member{selectedMemberIds.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Focus Area */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-brand" />
              Focus Area
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {FOCUS_AREAS.map((area) => (
                <button
                  key={area.id}
                  onClick={() => setFocusArea(area.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border p-3 transition-all",
                    focusArea === area.id
                      ? "border-brand bg-brand/10"
                      : "border-border hover:bg-accent"
                  )}
                >
                  <span className="text-2xl">{area.icon}</span>
                  <span className="text-xs font-medium">{area.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Duration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-energy" />
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Minutes</span>
              <span className="text-lg font-bold">{duration}</span>
            </div>
            <Slider
              value={[duration]}
              onValueChange={([v]) => setDuration(v)}
              min={15}
              max={90}
              step={5}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>15 min</span>
              <span>90 min</span>
            </div>
          </CardContent>
        </Card>

        {/* Intensity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-4 w-4 text-energy" />
              Intensity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {INTENSITIES.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setIntensity(level.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border p-3 transition-all text-left",
                    intensity === level.id
                      ? "border-brand bg-brand/10"
                      : "border-border hover:bg-accent"
                  )}
                >
                  <div>
                    <p className="font-medium">{level.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {level.description}
                    </p>
                  </div>
                  {intensity === level.id && (
                    <Badge className="bg-brand">Selected</Badge>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Custom Instructions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-success" />
              Custom Instructions (optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="e.g., Focus on compound movements, include supersets, avoid jumping exercises..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Generate Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !focusArea}
            className="w-full bg-brand-gradient h-12 text-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Workout
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Equipment Setup Prompt Dialog */}
      <Dialog open={showEquipmentPrompt} onOpenChange={setShowEquipmentPrompt}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-energy" />
              Better Workouts Available
            </DialogTitle>
            <DialogDescription>
              Set up your equipment to get personalized workout recommendations
              that match what you have available.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Why add equipment?</p>
                <p className="text-muted-foreground mt-1">
                  The AI will only suggest exercises you can actually do with the
                  equipment you have, making workouts more effective and practical.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => dismissEquipmentPrompt(false)}
              >
                Skip for now
              </Button>
              <Link href="/you?section=equipment" className="flex-1">
                <Button className="w-full">
                  <Dumbbell className="mr-2 h-4 w-4" />
                  Add Equipment
                </Button>
              </Link>
            </div>
            <button
              onClick={() => dismissEquipmentPrompt(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              Don&apos;t show this again
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
