import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { connections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * PATCH /api/connections/[id]
 * Accept or reject a connection request
 * Body: { status: 'accepted' | 'rejected' }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ["accepted", "rejected"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'accepted' or 'rejected'" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Find the connection
    const existingConnection = await db
      .select()
      .from(connections)
      .where(eq(connections.id, id))
      .limit(1);

    if (existingConnection.length === 0) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    const connection = existingConnection[0];

    // Only the addressee can accept/reject a pending request
    if (connection.addresseeId !== userId) {
      return NextResponse.json(
        { error: "Only the recipient can accept or reject a connection request" },
        { status: 403 }
      );
    }

    // Can only update pending connections
    if (connection.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot update a connection that is already ${connection.status}` },
        { status: 400 }
      );
    }

    // Update the connection
    const [updatedConnection] = await db
      .update(connections)
      .set({
        status: status,
        updatedAt: new Date(),
      })
      .where(eq(connections.id, id))
      .returning();

    return NextResponse.json({
      connection: updatedConnection,
      message: status === "accepted" ? "Connection accepted" : "Connection rejected",
    });
  } catch (error) {
    console.error("Error updating connection:", error);
    return NextResponse.json(
      { error: "Failed to update connection" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/connections/[id]
 * Remove a connection or cancel a pending request
 * - Requester can cancel their pending request
 * - Either party can remove an accepted connection
 * - Addressee can delete a rejected request
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    // Find the connection
    const existingConnection = await db
      .select()
      .from(connections)
      .where(eq(connections.id, id))
      .limit(1);

    if (existingConnection.length === 0) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    const connection = existingConnection[0];

    // Check if user is part of this connection
    if (connection.requesterId !== userId && connection.addresseeId !== userId) {
      return NextResponse.json(
        { error: "You are not part of this connection" },
        { status: 403 }
      );
    }

    // Different permissions based on status
    if (connection.status === "pending") {
      // Only requester can cancel a pending request
      if (connection.requesterId !== userId) {
        return NextResponse.json(
          { error: "Only the requester can cancel a pending request" },
          { status: 403 }
        );
      }
    }

    // For accepted or rejected connections, either party can delete
    // (This allows unfriending or cleaning up old rejected requests)

    // Delete the connection
    await db.delete(connections).where(eq(connections.id, id));

    return NextResponse.json({
      message:
        connection.status === "pending"
          ? "Connection request cancelled"
          : "Connection removed",
    });
  } catch (error) {
    console.error("Error deleting connection:", error);
    return NextResponse.json(
      { error: "Failed to delete connection" },
      { status: 500 }
    );
  }
}
