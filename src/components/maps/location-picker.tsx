"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
} from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
  MapMouseEvent,
} from "@vis.gl/react-google-maps";
import { MapPin, Search, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGeocoding } from "./use-geocoding";
import type { LocationPickerProps, LocationValue } from "./types";

// Default center (US center)
const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };
const DEFAULT_ZOOM = 4;
const SELECTED_ZOOM = 15;

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

function LocationPickerInner({
  value,
  onChange,
  height = 300,
  showSearch = true,
  placeholder = "Search for a location...",
  className,
  defaultCenter = DEFAULT_CENTER,
  defaultZoom = DEFAULT_ZOOM,
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const map = useMap("location-picker");

  const {
    isSearching,
    searchResults,
    searchError,
    searchLocations,
    reverseGeocode,
    clearSearch,
  } = useGeocoding();

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        searchLocations(searchQuery);
        setShowResults(true);
      }, 500);
    } else {
      searchTimeoutRef.current = setTimeout(() => {
        clearSearch();
        setShowResults(false);
      }, 0);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchLocations, clearSearch]);

  // Handle map click
  const handleMapClick = useCallback(
    async (e: MapMouseEvent) => {
      const latLng = e.detail.latLng;
      if (!latLng) return;

      const lat = latLng.lat;
      const lng = latLng.lng;

      // First update with basic location
      onChange({ lat, lng });

      // Then reverse geocode to get address details
      const location = await reverseGeocode(lat, lng);
      if (location) {
        onChange(location);
      }

      // Pan map to clicked location
      if (map) {
        map.panTo({ lat, lng });
        map.setZoom(SELECTED_ZOOM);
      }
    },
    [onChange, reverseGeocode, map]
  );

  // Handle search result selection
  const handleResultSelect = useCallback(
    (location: LocationValue) => {
      onChange(location);
      setSearchQuery("");
      setShowResults(false);
      clearSearch();

      // Pan map to selected location
      if (map && location.lat && location.lng) {
        map.panTo({ lat: location.lat, lng: location.lng });
        map.setZoom(SELECTED_ZOOM);
      }
    },
    [onChange, clearSearch, map]
  );

  // Handle clear
  const handleClear = useCallback(() => {
    onChange(undefined);
    setSearchQuery("");
    clearSearch();
    setShowResults(false);

    // Reset map view
    if (map) {
      map.panTo(defaultCenter);
      map.setZoom(defaultZoom);
    }
  }, [onChange, clearSearch, defaultCenter, defaultZoom, map]);

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setShowResults(false);
      inputRef.current?.blur();
    }
  };

  // Current map center
  const center = value
    ? { lat: value.lat, lng: value.lng }
    : defaultCenter;

  return (
    <div className={cn("relative", className)}>
      {/* Search input */}
      {showSearch && (
        <div className="relative mb-3 z-[1000]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="pl-9 pr-9"
            />
            {(searchQuery || isSearching) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  clearSearch();
                  setShowResults(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Search results dropdown */}
          <AnimatePresence>
            {showResults && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-[1001]"
              >
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => handleResultSelect(result.location)}
                    className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" />
                      <span className="text-sm line-clamp-2">
                        {result.label}
                      </span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search error */}
          {searchError && (
            <p className="mt-1 text-xs text-destructive">{searchError}</p>
          )}
        </div>
      )}

      {/* Map container */}
      <div
        className="relative rounded-lg overflow-hidden border border-border aspect-square"
        style={height ? { height } : undefined}
      >
        <Map
          id="location-picker"
          defaultCenter={center}
          defaultZoom={value ? SELECTED_ZOOM : defaultZoom}
          gestureHandling="cooperative"
          disableDefaultUI={true}
          mapId="location-picker"
          onClick={handleMapClick}
          style={{ width: "100%", height: "100%" }}
        >
          {value && (
            <AdvancedMarker position={{ lat: value.lat, lng: value.lng }}>
              <Pin
                background="oklch(0.73 0.155 85)"
                borderColor="white"
                glyphColor="white"
                scale={1.2}
              />
            </AdvancedMarker>
          )}
        </Map>

        {/* Click hint overlay */}
        {!value && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-card/90 backdrop-blur rounded-full border border-border shadow-lg pointer-events-none z-[500]">
            <p className="text-xs text-muted-foreground">
              Click on map or search to select location
            </p>
          </div>
        )}
      </div>

      {/* Selected location display */}
      {value && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 rounded-lg bg-brand/10 border border-brand/20"
        >
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {value.address ? (
                <p className="text-sm line-clamp-2">{value.address}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
                </p>
              )}
              {(value.city || value.state) && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[value.city, value.state].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 px-2 text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function LocationPicker(props: LocationPickerProps) {
  return (
    <APIProvider apiKey={API_KEY}>
      <LocationPickerInner {...props} />
    </APIProvider>
  );
}

export default LocationPicker;
