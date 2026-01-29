import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { equipmentCatalog } from "@/lib/db/schema";
import { eq, or, isNull } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get standard equipment and any custom equipment created by this user
    const equipment = await db.query.equipmentCatalog.findMany({
      where: or(
        eq(equipmentCatalog.isStandard, true),
        eq(equipmentCatalog.userId, session.user.id)
      ),
      orderBy: (catalog, { asc }) => [asc(catalog.category), asc(catalog.name)],
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Failed to fetch equipment catalog:", error);
    return NextResponse.json({ error: "Failed to fetch equipment catalog" }, { status: 500 });
  }
}
