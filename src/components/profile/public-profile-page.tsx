"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  UserPlus,
  Users,
  MapPin,
  Trophy,
  Dumbbell,
  Heart,
  Lock,
  Instagram,
  Youtube,
  Twitter,
  Linkedin,
  ExternalLink,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProfileData {
  userId: string;
  displayName: string;
  handle?: string;
  profilePicture?: string;
  bio?: string;
  age?: number | null;
  fitnessLevel?: string | null;
  city?: string | null;
  socialLinks?: {
    instagram?: string;
    youtube?: string;
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
  };
  isPrivate: boolean;
}

interface PublicProfilePageProps {
  identifier: string;
  initialData: {
    profile: ProfileData;
    sports?: { sport: string; level?: string | null }[];
    skills?: { name: string; currentStatus: string }[];
    prs?: { exercise: string; value: number; unit: string }[];
    badges?: { name: string; icon: string; tier: string }[];
    canMessage: boolean;
    canInvite: boolean;
    canFollow: boolean;
    isOwnProfile: boolean;
    isLoggedIn: boolean;
  };
}

const TIER_COLORS: Record<string, string> = {
  bronze: "from-amber-700 to-amber-500",
  silver: "from-gray-400 to-gray-200",
  gold: "from-yellow-500 to-amber-300",
  platinum: "from-cyan-400 to-blue-300",
};

export function PublicProfilePage({ identifier, initialData }: PublicProfilePageProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [hasRequestedConnection, setHasRequestedConnection] = useState(false);

  const { 
    profile, 
    sports = [], 
    skills = [], 
    prs = [], 
    badges = [],
    canMessage,
    canInvite,
    canFollow,
    isOwnProfile,
    isLoggedIn,
  } = initialData;

  const handleFollow = async () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    setFollowLoading(true);
    try {
      const res = await fetch(`/api/users/${profile.userId}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
      });
      
      if (res.ok) {
        setIsFollowing(!isFollowing);
        toast.success(isFollowing ? "Unfollowed" : "Following!");
      }
    } catch {
      toast.error("Failed to follow user");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    router.push(`/messages/${profile.userId}`);
  };

  const handleInvite = async () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    if (hasRequestedConnection) {
      toast.info("Connection request already sent");
      return;
    }

    setInviteLoading(true);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresseeId: profile.userId }),
      });

      if (res.ok) {
        setHasRequestedConnection(true);
        toast.success("Connection request sent!");
      } else {
        const data = await res.json();
        if (data.error?.includes("already")) {
          setHasRequestedConnection(true);
          toast.info("Connection request already exists");
        } else {
          toast.error(data.error || "Failed to send request");
        }
      }
    } catch {
      toast.error("Failed to send connection request");
    } finally {
      setInviteLoading(false);
    }
  };

  // Private profile view
  if (profile.isPrivate) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Avatar className="h-24 w-24 mx-auto mb-4 ring-4 ring-border">
              <AvatarImage src={profile.profilePicture} />
              <AvatarFallback className="text-2xl">
                {profile.displayName?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>

            <h2 className="text-2xl font-bold">{profile.displayName}</h2>
            {profile.handle && (
              <p className="text-muted-foreground">@{profile.handle}</p>
            )}

            <div className="mt-8 p-6 bg-muted/50 rounded-xl">
              <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">This profile is private</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Only circle members can view this profile.
              </p>
              
              {!isLoggedIn && (
                <Link href="/login">
                  <Button className="w-full">
                    Sign in to connect
                  </Button>
                </Link>
              )}
              
              {isLoggedIn && canFollow && (
                <Button onClick={handleFollow} disabled={followLoading}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              )}
            </div>
          </motion.div>
      </div>
    );
  }

  // Public profile view
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Page title with edit button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {profile.handle ? `@${profile.handle}` : profile.displayName}
        </h1>

        {isOwnProfile && (
          <Link href="/you">
            <Button variant="outline" size="sm">
              Edit Profile
            </Button>
          </Link>
        )}
      </div>
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <Avatar className="h-28 w-28 mx-auto mb-4 ring-4 ring-brand/20">
            <AvatarImage src={profile.profilePicture} />
            <AvatarFallback className="text-3xl bg-brand/10 text-brand">
              {profile.displayName?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>

          <h2 className="text-2xl font-bold">{profile.displayName}</h2>
          {profile.handle && (
            <p className="text-brand font-medium">@{profile.handle}</p>
          )}
          
          {/* Quick stats */}
          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
            {profile.age && <span>{profile.age} years old</span>}
            {profile.fitnessLevel && (
              <Badge variant="secondary" className="capitalize">
                {profile.fitnessLevel}
              </Badge>
            )}
            {profile.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {profile.city}
              </span>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="mt-4 text-muted-foreground max-w-md mx-auto">
              {profile.bio}
            </p>
          )}

          {/* Social Links */}
          {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              {profile.socialLinks.instagram && (
                <a
                  href={`https://instagram.com/${profile.socialLinks.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {profile.socialLinks.youtube && (
                <a
                  href={profile.socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Youtube className="h-5 w-5" />
                </a>
              )}
              {profile.socialLinks.twitter && (
                <a
                  href={`https://twitter.com/${profile.socialLinks.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Twitter className="h-5 w-5" />
                </a>
              )}
              {profile.socialLinks.linkedin && (
                <a
                  href={profile.socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
              )}
            </div>
          )}
        </motion.div>

        {/* Action Buttons */}
        {!isOwnProfile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex gap-2 mb-6"
          >
            {isLoggedIn ? (
              <>
                {canMessage && (
                  <Button 
                    onClick={handleMessage} 
                    className="flex-1"
                    variant="default"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                )}
                {canFollow && (
                  <Button 
                    onClick={handleFollow} 
                    variant={isFollowing ? "secondary" : "outline"}
                    className="flex-1"
                    disabled={followLoading}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                )}
                {canInvite && (
                  <Button
                    onClick={handleInvite}
                    variant={hasRequestedConnection ? "secondary" : "outline"}
                    className="flex-1"
                    disabled={inviteLoading || hasRequestedConnection}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {inviteLoading ? "Sending..." : hasRequestedConnection ? "Requested" : "Connect"}
                  </Button>
                )}
              </>
            ) : (
              <Link href="/signup" className="w-full">
                <Button className="w-full bg-energy-gradient">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Sign up to connect
                </Button>
              </Link>
            )}
          </motion.div>
        )}

        {/* Content Sections */}
        <div className="space-y-4">
          {/* Badges */}
          {badges.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Achievements
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {badges.map((badge, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
                          "bg-gradient-to-r text-white",
                          TIER_COLORS[badge.tier] || TIER_COLORS.bronze
                        )}
                      >
                        <span>{badge.icon}</span>
                        <span className="font-medium">{badge.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Personal Records */}
          {prs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Dumbbell className="h-4 w-4 text-brand" />
                    Personal Records
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {prs.map((pr, i) => (
                      <div
                        key={i}
                        className="p-3 bg-muted/50 rounded-lg"
                      >
                        <p className="text-sm text-muted-foreground">{pr.exercise}</p>
                        <p className="text-lg font-bold">
                          {pr.value} <span className="text-sm font-normal text-muted-foreground">{pr.unit}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Sports */}
          {sports.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Heart className="h-4 w-4 text-red-500" />
                    Sports & Activities
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {sports.map((sport, i) => (
                      <Badge key={i} variant="secondary">
                        {sport.sport}
                        {sport.level && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({sport.level})
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, i) => (
                      <Badge 
                        key={i} 
                        variant={skill.currentStatus === "mastered" ? "default" : "secondary"}
                        className={cn(
                          skill.currentStatus === "mastered" && "bg-purple-500"
                        )}
                      >
                        {skill.name}
                        {skill.currentStatus === "mastered" && " ✓"}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Empty state */}
          {badges.length === 0 && prs.length === 0 && sports.length === 0 && skills.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-center py-12 text-muted-foreground"
            >
              <p>This user hasn&apos;t added any public information yet.</p>
            </motion.div>
          )}
        </div>
    </div>
  );
}
