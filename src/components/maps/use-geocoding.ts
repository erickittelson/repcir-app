"use client";

import { useState, useCallback, useRef } from "react";
import type {
  LocationValue,
  NominatimSearchResult,
  NominatimReverseResult,
} from "./types";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

// Rate limiting: Nominatim requires max 1 request per second
// We use a simple queue/debounce approach

interface SearchResult {
  id: number;
  label: string;
  location: LocationValue;
}

export function useGeocoding() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const lastRequestTime = useRef<number>(0);

  // Ensure we respect Nominatim's rate limit
  const waitForRateLimit = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime.current;
    const minDelay = 1100; // 1.1 seconds to be safe

    if (timeSinceLastRequest < minDelay) {
      await new Promise((resolve) =>
        setTimeout(resolve, minDelay - timeSinceLastRequest)
      );
    }
    lastRequestTime.current = Date.now();
  }, []);

  // Search for locations by query string
  const searchLocations = useCallback(
    async (query: string): Promise<SearchResult[]> => {
      if (!query.trim() || query.length < 3) {
        setSearchResults([]);
        return [];
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        await waitForRateLimit();

        const params = new URLSearchParams({
          q: query,
          format: "json",
          addressdetails: "1",
          limit: "5",
        });

        const response = await fetch(
          `${NOMINATIM_BASE_URL}/search?${params.toString()}`,
          {
            headers: {
              "User-Agent": "Repcir/1.0",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data: NominatimSearchResult[] = await response.json();

        const results: SearchResult[] = data.map((item) => ({
          id: item.place_id,
          label: item.display_name,
          location: {
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            address: item.display_name,
            city: item.address?.city || item.address?.town || item.address?.village,
            state: item.address?.state,
            country: item.address?.country,
          },
        }));

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
    [waitForRateLimit]
  );

  // Reverse geocode a lat/lng to get address details
  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<LocationValue | null> => {
      try {
        await waitForRateLimit();

        const params = new URLSearchParams({
          lat: lat.toString(),
          lon: lng.toString(),
          format: "json",
          addressdetails: "1",
        });

        const response = await fetch(
          `${NOMINATIM_BASE_URL}/reverse?${params.toString()}`,
          {
            headers: {
              "User-Agent": "Repcir/1.0",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Reverse geocoding failed");
        }

        const data: NominatimReverseResult = await response.json();

        return {
          lat,
          lng,
          address: data.display_name,
          city:
            data.address?.city ||
            data.address?.town ||
            data.address?.village,
          state: data.address?.state,
          country: data.address?.country,
        };
      } catch (error) {
        console.error("Reverse geocoding error:", error);
        // Return basic location without address details
        return { lat, lng };
      }
    },
    [waitForRateLimit]
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
