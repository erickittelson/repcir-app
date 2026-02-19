"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Dumbbell, Home, Building2, ChevronLeft, Loader2, Search, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { US_STATES } from "@/lib/constants/us-states";
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

interface CityResult {
  id: string;
  label: string;
  city: string;
  state: string;
  country: string;
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

  // Gym search sub-step state (state → city → search)
  const [gymSearchStep, setGymSearchStep] = useState<"state" | "city" | "search">("state");
  const [selectedState, setSelectedState] = useState<string>(data.state || "");
  const [selectedCity, setSelectedCity] = useState<string>(data.city || "");
  const [stateFilter, setStateFilter] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [isCitySearching, setIsCitySearching] = useState(false);
  const cityDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const hasHomeGym = locations.includes("home");
  const hasCommercialGym = locations.some(l => COMMERCIAL_TYPES.includes(l));
  const commercialLocations = locations.filter(l => COMMERCIAL_TYPES.includes(l));

  // Debounced city search
  useEffect(() => {
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
    if (!citySearch || citySearch.length < 2) {
      setCityResults([]);
      return;
    }
    cityDebounceRef.current = setTimeout(async () => {
      setIsCitySearching(true);
      try {
        const stateName = US_STATES.find(s => s.value === selectedState)?.label || "";
        const q = `${citySearch}, ${stateName}`;
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          setCityResults(await res.json());
        }
      } catch { /* silent */ }
      finally { setIsCitySearching(false); }
    }, 400);
    return () => { if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current); };
  }, [citySearch, selectedState]);

  // Debounced gym search — uses selected city/state for location context
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({ q: searchQuery });
        if (selectedCity) params.set("city", selectedCity);
        if (selectedState) params.set("state", selectedState);
        const res = await fetch(`/api/places/search?${params}`);
        if (res.ok) {
          setSearchResults(await res.json());
          setShowResults(true);
        }
      } catch { /* silent */ }
      finally { setIsSearching(false); }
    }, 400);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery, selectedCity, selectedState]);

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
      const firstCommercialType = commercialLocations[0];
      setCurrentSearchType(firstCommercialType);
      setSearchQuery("");
      setSearchResults([]);
      // Skip to search if state+city already selected
      if (selectedState && selectedCity) {
        setGymSearchStep("search");
      } else if (selectedState) {
        setGymSearchStep("city");
      } else {
        setGymSearchStep("state");
      }
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
    // Auto-save typed name if user hasn't explicitly selected/confirmed
    let updatedGymDetails = gymDetails;
    const alreadyHasGym = gymDetails.some(g => g.locationType === currentSearchType);
    if (!alreadyHasGym && searchQuery.trim().length >= 2) {
      const detail: GymDetail = {
        locationType: currentSearchType,
        name: searchQuery.trim(),
      };
      updatedGymDetails = [...gymDetails.filter(g => g.locationType !== currentSearchType), detail];
      setGymDetails(updatedGymDetails);
    }

    // Check if there are more commercial types to search
    const currentIndex = commercialLocations.indexOf(currentSearchType);
    if (currentIndex < commercialLocations.length - 1) {
      const nextType = commercialLocations[currentIndex + 1];
      setCurrentSearchType(nextType);
      setSearchQuery("");
      setSearchResults([]);
      setShowResults(true);
      setGymSearchStep("search");
      return;
    }

    // Save city/state for preferences pre-fill
    const cityStateUpdate: Record<string, unknown> = {};
    if (selectedCity) cityStateUpdate.city = selectedCity;
    if (selectedState) cityStateUpdate.state = selectedState;

    // Done with gym search, move to next step
    if (hasHomeGym) {
      onUpdate({ ...cityStateUpdate });
      setStep("equipment");
    } else {
      onUpdate({
        ...cityStateUpdate,
        gymLocations: locations,
        commercialGymDetails: updatedGymDetails,
        equipmentAccess: ["full_gym"],
        equipmentDetails: {},
      });
      onNext();
    }
  };

  const handleGymSearchBack = () => {
    if (gymSearchStep === "search") {
      setGymSearchStep("city");
    } else if (gymSearchStep === "city") {
      setGymSearchStep("state");
    } else {
      // gymSearchStep === "state" — go back to location selection
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

        {/* Step 2: Gym Search — 3 sub-steps: state → city → search */}
        {step === "gym-search" && (
          <motion.div
            key={`gym-search-${gymSearchStep}`}
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

            {/* Sub-step 2a: State Selection */}
            {gymSearchStep === "state" && (
              <>
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-brand" />
                </div>

                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  What state is your gym in?
                </h2>
                <p className="text-muted-foreground mb-4">
                  This helps us find gyms near you
                </p>

                {/* Filter input */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    placeholder="Filter states..."
                    className="w-full pl-10 p-3 rounded-xl border-2 border-border bg-background text-sm focus:border-brand focus:outline-none"
                  />
                </div>

                {/* States grid */}
                <div className="grid grid-cols-2 gap-1.5 max-h-[320px] overflow-y-auto overscroll-contain pr-1 mb-4">
                  {US_STATES
                    .filter(s =>
                      !stateFilter ||
                      s.label.toLowerCase().includes(stateFilter.toLowerCase()) ||
                      s.value.toLowerCase().includes(stateFilter.toLowerCase())
                    )
                    .map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => {
                          setSelectedState(value);
                          setStateFilter("");
                        }}
                        className={cn(
                          "h-10 px-3 rounded-lg border-2 transition-all text-left",
                          "flex items-center",
                          "hover:border-brand hover:bg-brand/5",
                          selectedState === value
                            ? "border-brand bg-brand/10"
                            : "border-border bg-card"
                        )}
                      >
                        <span className="text-xs font-medium truncate">{label}</span>
                      </button>
                    ))
                  }
                </div>

                <OnboardingActions
                  onNext={() => { if (selectedState) setGymSearchStep("city"); }}
                  onBack={() => setStep("location")}
                  nextDisabled={!selectedState}
                />
              </>
            )}

            {/* Sub-step 2b: City Autocomplete */}
            {gymSearchStep === "city" && (
              <>
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-brand" />
                </div>

                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  What city?
                </h2>
                <p className="text-muted-foreground mb-4">
                  {US_STATES.find(s => s.value === selectedState)?.label}
                </p>

                {/* Selected city badge */}
                {selectedCity && (
                  <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-sm font-medium">
                    <MapPin className="w-3.5 h-3.5 text-brand" />
                    {selectedCity}, {selectedState}
                    <button
                      onClick={() => {
                        setSelectedCity("");
                        setCitySearch("");
                        setCityResults([]);
                      }}
                      className="ml-1 hover:text-destructive"
                    >
                      &times;
                    </button>
                  </div>
                )}

                {/* City search input */}
                {!selectedCity && (
                  <div className="space-y-3 text-left mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                        placeholder="Start typing your city..."
                        className="w-full pl-10 pr-10 p-3 rounded-xl border-2 border-border bg-background text-sm focus:border-brand focus:outline-none"
                        autoFocus
                      />
                      {isCitySearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>

                    {/* City results */}
                    {cityResults.length > 0 && (
                      <div className="rounded-xl border bg-card shadow-md max-h-52 overflow-y-auto">
                        {cityResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => {
                              setSelectedCity(result.city || citySearch.trim());
                              setCitySearch("");
                              setCityResults([]);
                            }}
                            className="w-full flex items-start gap-3 px-4 py-3 text-sm hover:bg-accent text-left border-b last:border-b-0"
                          >
                            <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <span className="font-medium block truncate">
                                {result.city || result.label.split(",")[0]}
                              </span>
                              <span className="text-xs text-muted-foreground block truncate">
                                {result.state}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Manual city entry when no results */}
                    {citySearch.length >= 2 && !isCitySearching && cityResults.length === 0 && (
                      <button
                        onClick={() => {
                          setSelectedCity(citySearch.trim());
                          setCitySearch("");
                          setCityResults([]);
                        }}
                        className={cn(
                          "w-full p-3 rounded-xl border-2 border-dashed transition-all text-sm text-left",
                          "hover:border-brand hover:bg-brand/5",
                          "border-border text-muted-foreground"
                        )}
                      >
                        Use &ldquo;{citySearch.trim()}&rdquo; as city
                      </button>
                    )}
                  </div>
                )}

                <OnboardingActions
                  onNext={() => {
                    if (selectedCity) {
                      setGymSearchStep("search");
                      setSearchQuery("");
                      setSearchResults([]);
                      setShowResults(true);
                    }
                  }}
                  onBack={() => setGymSearchStep("state")}
                  nextDisabled={!selectedCity}
                />
              </>
            )}

            {/* Sub-step 2c: Gym Name Search */}
            {gymSearchStep === "search" && (
              <>
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
                  <Search className="w-8 h-8 text-brand" />
                </div>

                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  Find your {gymTypeLabel.toLowerCase()}
                </h2>
                <p className="text-muted-foreground mb-1">
                  Searching near {selectedCity}, {selectedState}
                </p>
                <button
                  onClick={() => setGymSearchStep("city")}
                  className="text-xs text-brand hover:underline mb-4 inline-block"
                >
                  Change location
                </button>

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
                      placeholder="Search gyms, CrossFit boxes..."
                      className="w-full pl-10 pr-10 p-3 rounded-xl border-2 border-border bg-background text-sm focus:border-brand focus:outline-none"
                      autoFocus
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

                  {/* No results — prominent manual entry */}
                  {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
                    <div className="text-center space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Not in our database — no problem!
                      </p>
                      <button
                        onClick={handleManualGymName}
                        className={cn(
                          "w-full p-3 rounded-xl border-2 transition-all text-sm font-medium",
                          "hover:border-brand hover:bg-brand/5",
                          "border-brand/50 bg-brand/5 text-foreground"
                        )}
                      >
                        Use &ldquo;{searchQuery.trim()}&rdquo; as my gym
                      </button>
                    </div>
                  )}

                  {/* Has results — subtle manual entry option */}
                  {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
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

                  {/* Selected gym with map */}
                  {currentGymDetail && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-2"
                    >
                      <div className="p-4 rounded-xl border-2 border-brand bg-brand/5">
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
                      </div>

                      {/* Mini map */}
                      {currentGymDetail.lat && currentGymDetail.lng && (
                        <div className="rounded-xl overflow-hidden border border-border aspect-square">
                          <iframe
                            title="Gym location"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${currentGymDetail.lat},${currentGymDetail.lng}&zoom=15`}
                          />
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                <OnboardingActions
                  onNext={handleGymSearchContinue}
                  onBack={() => setGymSearchStep("city")}
                  nextLabel={!currentGymDetail ? "Skip" : undefined}
                />
              </>
            )}
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
