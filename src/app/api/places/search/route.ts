import { NextRequest, NextResponse } from "next/server";

const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchText";

interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: string;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  const city = request.nextUrl.searchParams.get("city");
  const state = request.nextUrl.searchParams.get("state");

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json([], { status: 500 });
  }

  // Build search query with location context
  const locationParts = [city, state].filter(Boolean).join(", ");
  const textQuery = locationParts ? `${q} near ${locationParts}` : `${q} gym`;

  try {
    const response = await fetch(GOOGLE_PLACES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.location,places.types,places.primaryType",
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: 10,
      }),
    });

    if (!response.ok) {
      return NextResponse.json([]);
    }

    const data = await response.json();
    const results: PlaceResult[] = [];
    const seen = new Set<string>();

    for (const place of data.places || []) {
      const name = place.displayName?.text;
      if (!name) continue;

      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      let type = "gym";
      const types: string[] = place.types || [];
      const primaryType: string = place.primaryType || "";
      if (
        primaryType.includes("crossfit") ||
        name.toLowerCase().includes("crossfit") ||
        types.includes("crossfit_box")
      ) {
        type = "crossfit";
      } else if (types.includes("sports_complex") || types.includes("sports_club")) {
        type = "studio";
      }

      results.push({
        name,
        address: place.formattedAddress || "",
        lat: place.location?.latitude ?? 0,
        lng: place.location?.longitude ?? 0,
        type,
      });
    }

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
