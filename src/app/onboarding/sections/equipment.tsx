"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Dumbbell, Home, Building2, ChevronLeft, Loader2, Search, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { OnboardingActions } from "./onboarding-actions";
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

const COMMERCIAL_TYPES = ["commercial", "crossfit", "school"];

interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: string;
}

interface GymDetail {
  locationType: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
}

type Step = "location" | "gym-search" | "equipment" | "weights";

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

export function EquipmentSection({ data, onUpdate, onNext, onBack }: SectionProps) {
  const [step, setStep] = useState<Step>("location");
  const [locations, setLocations] = useState<string[]>(data.gymLocations || []);
  const [equipment, setEquipment] = useState<string[]>(data.equipmentAccess || []);
  const [equipmentDetails, setEquipmentDetails] = useState<EquipmentDetails>(
    data.equipmentDetails || {}
  );
  const [dumbbellSelection, setDumbbellSelection] = useState<number | null>(null);
  const [plateSelection, setPlateSelection] = useState<number | null>(null);
  const [adjustableMax, setAdjustableMax] = useState<string>("");

  // Gym search state
  const [gymDetails, setGymDetails] = useState<GymDetail[]>(data.commercialGymDetails || []);
  const [currentSearchType, setCurrentSearchType] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const hasHomeGym = locations.includes("home");
  const hasCommercialGym = locations.some(l => COMMERCIAL_TYPES.includes(l));
  const commercialLocations = locations.filter(l => COMMERCIAL_TYPES.includes(l));

  // Debounced gym search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!searchQuery || searchQuery.length < 2 || !data.city) {
      setSearchResults([]);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({ q: searchQuery, city: data.city! });
        if (data.state) params.set("state", data.state);
        const res = await fetch(`/api/places/search?${params}`);
        if (res.ok) {
          setSearchResults(await res.json());
          setShowResults(true);
        }
      } catch { /* silent */ }
      finally { setIsSearching(false); }
    }, 400);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery, data.city, data.state]);

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
    if (hasCommercialGym) {
      // Go to gym search step for commercial/crossfit/school
      const firstCommercialType = commercialLocations[0];
      setCurrentSearchType(firstCommercialType);
      setSearchQuery("");
      setSearchResults([]);
      setStep("gym-search");
    } else if (hasHomeGym) {
      setStep("equipment");
    } else if (locations.includes("outdoor")) {
      onUpdate({
        gymLocations: locations,
        equipmentAccess: ["bodyweight", "resistance_bands"],
        equipmentDetails: {},
      });
      onNext();
    }
  };

  const handlePlaceSelect = (place: PlaceResult) => {
    const detail: GymDetail = {
      locationType: currentSearchType,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
    };
    setGymDetails(prev => {
      const filtered = prev.filter(g => g.locationType !== currentSearchType);
      return [...filtered, detail];
    });
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  const handleManualGymName = () => {
    if (!searchQuery.trim()) return;
    const detail: GymDetail = {
      locationType: currentSearchType,
      name: searchQuery.trim(),
    };
    setGymDetails(prev => {
      const filtered = prev.filter(g => g.locationType !== currentSearchType);
      return [...filtered, detail];
    });
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleGymSearchContinue = () => {
    // Check if there are more commercial types to search
    const currentIndex = commercialLocations.indexOf(currentSearchType);
    if (currentIndex < commercialLocations.length - 1) {
      const nextType = commercialLocations[currentIndex + 1];
      setCurrentSearchType(nextType);
      setSearchQuery("");
      setSearchResults([]);
      setShowResults(true);
      return;
    }

    // Done with gym search, move to next step
    if (hasHomeGym) {
      setStep("equipment");
    } else {
      // No home gym, finish with commercial gym data
      onUpdate({
        gymLocations: locations,
        commercialGymDetails: gymDetails,
        equipmentAccess: ["full_gym"],
        equipmentDetails: {},
      });
      onNext();
    }
  };

  const handleGymSearchBack = () => {
    const currentIndex = commercialLocations.indexOf(currentSearchType);
    if (currentIndex > 0) {
      const prevType = commercialLocations[currentIndex - 1];
      setCurrentSearchType(prevType);
      setSearchQuery("");
      setSearchResults([]);
      setShowResults(true);
    } else {
      setStep("location");
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
      commercialGymDetails: gymDetails.length > 0 ? gymDetails : undefined,
      equipmentAccess: finalEquipment,
      equipmentDetails: details,
    });
    onNext();
  };

  const currentGymDetail = gymDetails.find(g => g.locationType === currentSearchType);
  const gymTypeLabel = LOCATION_TYPES.find(t => t.id === currentSearchType)?.label || currentSearchType;
  const hasCity = !!data.city;

  return (
    <div className="min-h-full flex flex-col items-center justify-start py-6 px-6">
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

            <OnboardingActions
              onNext={handleLocationContinue}
              onBack={onBack}
              nextDisabled={locations.length === 0}
            />
          </motion.div>
        )}

        {/* Step 2: Gym Search (for commercial/crossfit/school) */}
        {step === "gym-search" && (
          <motion.div
            key={`gym-search-${currentSearchType}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-lg mx-auto w-full text-center"
          >
            <button
              onClick={handleGymSearchBack}
              className="absolute top-4 left-4 p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Search className="w-8 h-8 text-brand" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Find your {gymTypeLabel.toLowerCase()}
            </h2>
            <p className="text-muted-foreground mb-6">
              {hasCity
                ? `Search for gyms near ${data.city}${data.state ? `, ${data.state}` : ""}`
                : "Type the name of your gym"}
            </p>

            <div className="space-y-4 text-left mb-6">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={currentGymDetail && !searchQuery ? "" : searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowResults(true);
                  }}
                  placeholder={hasCity ? "Search gyms, CrossFit boxes..." : "Type your gym name..."}
                  className="w-full pl-10 pr-10 p-3 rounded-xl border-2 border-border bg-background text-sm focus:border-brand focus:outline-none"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search results dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="rounded-xl border bg-card shadow-md max-h-52 overflow-y-auto">
                  {searchResults.map((place, i) => (
                    <button
                      key={`${place.name}-${i}`}
                      onClick={() => handlePlaceSelect(place)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-sm hover:bg-accent text-left border-b last:border-b-0"
                    >
                      <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-medium block truncate">{place.name}</span>
                        {place.address && (
                          <span className="text-xs text-muted-foreground block truncate">{place.address}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* "Use this name" button when typing but no result selected */}
              {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && hasCity && (
                <p className="text-xs text-muted-foreground text-center">
                  No gyms found nearby. You can still use this name.
                </p>
              )}

              {searchQuery.trim().length >= 2 && (
                <button
                  onClick={handleManualGymName}
                  className={cn(
                    "w-full p-3 rounded-xl border-2 border-dashed transition-all text-sm text-left",
                    "hover:border-brand hover:bg-brand/5",
                    "border-border text-muted-foreground"
                  )}
                >
                  Use &ldquo;{searchQuery.trim()}&rdquo; as gym name
                </button>
              )}

              {!hasCity && (
                <p className="text-xs text-muted-foreground text-center">
                  Set your city in the Preferences step to search nearby gyms
                </p>
              )}

              {/* Selected gym */}
              {currentGymDetail && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl border-2 border-brand bg-brand/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                      <Check className="w-5 h-5 text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{currentGymDetail.name}</p>
                      {currentGymDetail.address && (
                        <p className="text-xs text-muted-foreground truncate">{currentGymDetail.address}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setGymDetails(prev => prev.filter(g => g.locationType !== currentSearchType));
                        setSearchQuery("");
                        setShowResults(true);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Change
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            <OnboardingActions
              onNext={handleGymSearchContinue}
              onBack={handleGymSearchBack}
              nextLabel={!currentGymDetail ? "Skip" : undefined}
            />
          </motion.div>
        )}

        {/* Step 3: Home Equipment Selection */}
        {step === "equipment" && (
          <motion.div
            key="equipment"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-lg mx-auto w-full text-center"
          >
            <button
              onClick={() => setStep(hasCommercialGym ? "gym-search" : "location")}
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

            <OnboardingActions
              onNext={handleEquipmentContinue}
              onBack={onBack}
              nextDisabled={equipment.length === 0}
            />
          </motion.div>
        )}

        {/* Step 4: Weight Details */}
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

            <div className="space-y-5 text-left">
              {/* Dumbbell Selection */}
              {equipment.includes("dumbbells") && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                    🏋️ Dumbbells
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {DUMBBELL_OPTIONS.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => setDumbbellSelection(index)}
                        className={cn(
                          "p-2.5 rounded-lg border-2 transition-all text-left text-sm",
                          "hover:border-brand hover:bg-brand/5",
                          dumbbellSelection === index
                            ? "border-brand bg-brand/10"
                            : "border-border"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
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
                        className="w-full p-2.5 rounded-lg border-2 border-border bg-background text-sm focus:border-brand focus:outline-none"
                      />
                    </motion.div>
                  )}
                </div>
              )}

              {/* Barbell/Plate Selection */}
              {equipment.includes("barbell") && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                    🔩 Barbell & Plates
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {PLATE_OPTIONS.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => setPlateSelection(index)}
                        className={cn(
                          "p-2.5 rounded-lg border-2 transition-all text-left text-sm",
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
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Assumes 45 lb Olympic barbell
                  </p>
                </div>
              )}
            </div>

            <OnboardingActions
              onNext={finishSection}
              onBack={onBack}
              className="mt-6"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
