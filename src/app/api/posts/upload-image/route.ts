import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { put } from "@vercel/blob";
import { validateImageFile, getSafeExtension } from "@/lib/file-validation";

// POST /api/posts/upload-image - Upload an image for an individual post
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    const validation = await validateImageFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || "Invalid image file" },
        { status: 400 }
      );
    }

    const ext = getSafeExtension(validation.detectedType || file.type);
    const filename = `posts/${session.user.id}/${Date.now()}.${ext}`;

    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Post image upload error:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
