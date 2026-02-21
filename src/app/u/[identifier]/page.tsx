/**
 * Public Profile Page (outside (tabs) layout — no auth required)
 *
 * Accessible via /@handle (middleware rewrite) or /u/handle directly.
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicProfilePage } from "@/components/profile/public-profile-page";

interface Props {
  params: Promise<{ identifier: string }>;
}

// Fetch profile data for metadata
async function getProfile(identifier: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

    const res = await fetch(`${baseUrl}/api/profiles/${encodeURIComponent(identifier)}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { identifier } = await params;
  const data = await getProfile(identifier);

  if (!data?.profile) {
    return {
      title: "Profile Not Found | Repcir",
    };
  }

  const { profile } = data;
  const displayName = profile.displayName || "User";
  const handle = profile.handle ? `@${profile.handle}` : "";

  return {
    title: `${displayName} ${handle} | Repcir`,
    description: profile.bio || `${displayName}'s profile on Repcir`,
    openGraph: {
      title: `${displayName} ${handle}`,
      description: profile.bio || `Check out ${displayName}'s fitness profile`,
      images: profile.profilePicture ? [profile.profilePicture] : [],
    },
    twitter: {
      card: "summary",
      title: `${displayName} ${handle}`,
      description: profile.bio || `Check out ${displayName}'s fitness profile`,
      images: profile.profilePicture ? [profile.profilePicture] : [],
    },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { identifier } = await params;

  const data = await getProfile(identifier);

  if (!data?.profile) {
    notFound();
  }

  return <PublicProfilePage identifier={identifier} initialData={data} />;
}
