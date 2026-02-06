"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Users,
  Plus,
  Search,
  Crown,
  Shield,
  Compass,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateRallyExperience } from "@/components/rally";

interface CircleData {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  memberCount: number;
  visibility: string;
  focusArea: string | null;
  memberRole: string | null;
  joinedAt: Date | null;
  recentPostCount: number;
}

interface CirclesClientProps {
  circles: CircleData[];
  userId: string;
}

export function CirclesClient({ circles, userId }: CirclesClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateCircle, setShowCreateCircle] = useState(false);

  const filteredCircles = circles.filter((circle) =>
    circle.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "owner":
        return (
          <Badge className="bg-energy/20 text-energy border-energy/30 gap-1 text-[10px]">
            <Crown className="h-2.5 w-2.5" />
            Owner
          </Badge>
        );
      case "admin":
        return (
          <Badge className="bg-brand/20 text-brand border-brand/30 gap-1 text-[10px]">
            <Shield className="h-2.5 w-2.5" />
            Admin
          </Badge>
        );
      default:
        return null;
    }
  };

  const getFocusAreaLabel = (focus: string | null) => {
    const labels: Record<string, string> = {
      strength: "Strength",
      weight_loss: "Weight Loss",
      endurance: "Endurance",
      flexibility: "Flexibility",
      general: "General Fitness",
    };
    return focus ? labels[focus] || focus : null;
  };

  return (
    <div className="space-y-4 px-4 py-6 pb-20">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Rallies</h1>
          <Button size="sm" onClick={() => setShowCreateCircle(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your rallies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Discover Rallies CTA */}
      <Card className="bg-gradient-to-br from-brand/10 to-success/10 border-brand/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-brand/20 flex items-center justify-center">
              <Compass className="h-5 w-5 text-brand" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Find New Rallies</p>
              <p className="text-xs text-muted-foreground">
                Join communities that match your fitness goals
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/discover?tab=circles")}
            >
              Discover
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rallies List */}
      {filteredCircles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
          {circles.length === 0 ? (
            <>
              <p className="font-medium">No rallies yet</p>
              <p className="text-sm mt-1">
                Create your own rally or discover communities to join
              </p>
            </>
          ) : (
            <p>No rallies match your search</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCircles.map((circle) => (
            <Card
              key={circle.id}
              className={cn(
                "cursor-pointer hover:bg-muted/50 transition-colors",
                circle.recentPostCount > 0 && "border-brand/30"
              )}
              onClick={() => router.push(`/circle/${circle.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {/* Circle Avatar */}
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      {circle.imageUrl ? (
                        <AvatarImage src={circle.imageUrl} alt={circle.name} />
                      ) : (
                        <AvatarFallback className="bg-brand/20 text-brand">
                          <Users className="h-6 w-6" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {/* Activity indicator */}
                    {circle.recentPostCount > 0 && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-brand flex items-center justify-center">
                        <span className="text-[10px] text-white font-medium">
                          {circle.recentPostCount > 9
                            ? "9+"
                            : circle.recentPostCount}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Circle Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{circle.name}</h3>
                      {getRoleBadge(circle.memberRole)}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {circle.memberCount} member
                        {circle.memberCount !== 1 && "s"}
                      </span>
                      {circle.focusArea && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            {getFocusAreaLabel(circle.focusArea)}
                          </span>
                        </>
                      )}
                    </div>
                    {circle.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                        {circle.description}
                      </p>
                    )}
                  </div>

                  {/* Activity Hint */}
                  {circle.recentPostCount > 0 && (
                    <div className="flex items-center gap-1 text-brand">
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-xs font-medium">New</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Rally Experience */}
      <CreateRallyExperience
        open={showCreateCircle}
        onOpenChange={setShowCreateCircle}
        onComplete={() => {
          // The experience handles navigation internally
        }}
      />
    </div>
  );
}
