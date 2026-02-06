/**
 * Shared types for map components
 */

export interface LocationValue {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface LocationPickerProps {
  value?: LocationValue;
  onChange: (location: LocationValue | undefined) => void;
  height?: number;
  showSearch?: boolean;
  placeholder?: string;
  className?: string;
  defaultCenter?: { lat: number; lng: number };
  defaultZoom?: number;
}

export interface LocationDisplayProps {
  lat: number;
  lng: number;
  label?: string;
  height?: number;
  className?: string;
  zoom?: number;
}

export interface NominatimSearchResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

export interface NominatimReverseResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  boundingbox: string[];
}
