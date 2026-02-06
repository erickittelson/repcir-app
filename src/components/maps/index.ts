/**
 * Map Components
 *
 * Reusable map components for location selection and display.
 * Uses Leaflet with OpenStreetMap tiles (free, no API key needed).
 *
 * Usage with dynamic import for code splitting:
 *
 * ```tsx
 * import dynamic from 'next/dynamic';
 *
 * const LocationPicker = dynamic(
 *   () => import('@/components/maps').then(mod => mod.LocationPicker),
 *   { ssr: false, loading: () => <div>Loading map...</div> }
 * );
 *
 * const LocationDisplay = dynamic(
 *   () => import('@/components/maps').then(mod => mod.LocationDisplay),
 *   { ssr: false, loading: () => <div>Loading map...</div> }
 * );
 * ```
 *
 * Note: Maps must be loaded with ssr: false because Leaflet requires the window object.
 */

export { LocationPicker } from "./location-picker";
export { LocationDisplay } from "./location-display";
export { useGeocoding } from "./use-geocoding";
export type {
  LocationValue,
  LocationPickerProps,
  LocationDisplayProps,
} from "./types";
