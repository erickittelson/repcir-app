"use client";

import { useState, useCallback, useRef } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import type { LocationValue } from "./types";

interface SearchResult {
  id: string;
  label: string;
  location: LocationValue;
}

export function useGeocoding() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Load the geocoding library from Google Maps
  const geocodingLib = useMapsLibrary("geocoding");

  // Get or create geocoder instance
  const getGeocoder = useCallback(() => {
    if (!geocodingLib) return null;
    if (!geocoderRef.current) {
      geocoderRef.current = new geocodingLib.Geocoder();
    }
    return geocoderRef.current;
  }, [geocodingLib]);

  // Search for locations by query string (via our API route)
  const searchLocations = useCallback(
    async (query: string): Promise<SearchResult[]> => {
      if (!query.trim() || query.length < 3) {
        setSearchResults([]);
        return [];
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const res = await fetch(
          `/api/geocode/search?q=${encodeURIComponent(query)}`
        );

        if (!res.ok) {
          throw new Error("Search failed");
        }

        const data = await res.json();

        const results: SearchResult[] = data.map(
          (item: {
            id: string;
            label: string;
            city: string;
            state: string;
            country: string;
          }) => {
            // Extract lat/lng from the label isn't possible from our geocode route,
            // so we do a secondary geocode for the selected result.
            // For search results display, we parse from the geocode response.
            return {
              id: item.id,
              label: item.label,
              location: {
                lat: 0, // Will be resolved on selection
                lng: 0,
                address: item.label,
                city: item.city,
                state: item.state,
                country: item.country,
              },
            };
          }
        );

        // If we have the geocoding library, resolve coordinates for each result
        const geocoder = getGeocoder();
        if (geocoder && results.length > 0) {
          const resolved = await Promise.all(
            results.map(async (result) => {
              try {
                const response = await geocoder.geocode({
                  placeId: result.id,
                });
                if (response.results?.[0]) {
                  const loc = response.results[0].geometry.location;
                  return {
                    ...result,
                    location: {
                      ...result.location,
                      lat: loc.lat(),
                      lng: loc.lng(),
                    },
                  };
                }
              } catch {
                // Fall through
              }
              return result;
            })
          );
          setSearchResults(resolved);
          return resolved;
        }

        setSearchResults(results);
        return results;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Search failed";
        setSearchError(message);
        setSearchResults([]);
        return [];
      } finally {
        setIsSearching(false);
      }
    },
    [getGeocoder]
  );

  // Reverse geocode a lat/lng to get address details
  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<LocationValue | null> => {
      const geocoder = getGeocoder();
      if (!geocoder) {
        return { lat, lng };
      }

      try {
        const response = await geocoder.geocode({
          location: { lat, lng },
        });

        if (response.results?.[0]) {
          const result = response.results[0];
          const components = result.address_components || [];

          const city =
            components.find((c) => c.types.includes("locality"))?.long_name ||
            components.find((c) => c.types.includes("sublocality"))
              ?.long_name;
          const state = components.find((c) =>
            c.types.includes("administrative_area_level_1")
          )?.long_name;
          const country = components.find((c) =>
            c.types.includes("country")
          )?.long_name;

          return {
            lat,
            lng,
            address: result.formatted_address,
            city,
            state,
            country,
          };
        }

        return { lat, lng };
      } catch (error) {
        console.error("Reverse geocoding error:", error);
        return { lat, lng };
      }
    },
    [getGeocoder]
  );

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchError(null);
  }, []);

  return {
    isSearching,
    searchResults,
    searchError,
    searchLocations,
    reverseGeocode,
    clearSearch,
  };
}
