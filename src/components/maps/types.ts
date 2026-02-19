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
