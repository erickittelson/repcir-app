import { NextRequest, NextResponse } from "next/server";

const GOOGLE_GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");

  if (!q || q.length < 3) {
    return NextResponse.json([]);
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json([], { status: 500 });
  }

  try {
    const params = new URLSearchParams({
      address: q,
      key: apiKey,
    });

    const response = await fetch(`${GOOGLE_GEOCODING_URL}?${params}`);
    if (!response.ok) {
      return NextResponse.json([], { status: 502 });
    }

    const data = await response.json();
    if (data.status !== "OK" || !data.results?.length) {
      return NextResponse.json([]);
    }

    const results = data.results.slice(0, 5).map(
      (result: {
        place_id: string;
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
        address_components: Array<{
          long_name: string;
          short_name: string;
          types: string[];
        }>;
      }) => {
        const components = result.address_components || [];
        const city =
          components.find((c) => c.types.includes("locality"))?.long_name ||
          components.find((c) => c.types.includes("sublocality"))?.long_name ||
          "";
        const state =
          components.find((c) => c.types.includes("administrative_area_level_1"))?.long_name || "";
        const country =
          components.find((c) => c.types.includes("country"))?.long_name || "";

        return {
          id: result.place_id,
          label: result.formatted_address,
          city,
          state,
          country,
        };
      }
    );

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([], { status: 502 });
  }
}
