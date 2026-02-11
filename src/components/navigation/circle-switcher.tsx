"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Check, Plus, Users, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateCircleExperience } from "@/components/circle";

interface Circle {
  id: string;
  name: string;
  role: string;
  memberId: string;
  imageUrl?: string;
  isSystemCircle?: boolean;
}

interface CircleSwitcherProps {
  activeCircle?: Circle;
  circles: Circle[];
  className?: string;
}

export function CircleSwitcher({
  activeCircle,
  circles,
  className,
}: CircleSwitcherProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateCircle, setShowCreateCircle] = useState(false);

  const personalCircle = circles.find((c) => c.isSystemCircle);
  const groupCircles = circles.filter((c) => !c.isSystemCircle);

  const handleSwitch = async (circleId: string) => {
    if (circleId === activeCircle?.id) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/circles/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ circleId }),
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to switch circle:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    if (role === "owner") return "Owner";
    if (role === "admin") return "Admin";
    return null;
  };

  // No circles at all — show create button
  if (!activeCircle) {
    return (
      <>
        <Button
          variant="outline"
          className={cn("gap-2", className)}
          onClick={() => setShowCreateCircle(true)}
        >
          <Plus className="h-4 w-4" />
          Create Circle
        </Button>
        <CreateCircleExperience
          open={showCreateCircle}
          onOpenChange={setShowCreateCircle}
          onComplete={() => {
            router.refresh();
          }}
        />
      </>
    );
  }

  const isPersonalActive = activeCircle.isSystemCircle;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto gap-2 px-2 py-1.5 font-normal",
            className
          )}
          disabled={isLoading}
        >
          {isPersonalActive ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/20">
              <Dumbbell className="h-4 w-4 text-brand" />
            </div>
          ) : (
            <Avatar className="h-7 w-7">
              <AvatarImage src={activeCircle.imageUrl} />
              <AvatarFallback className="bg-brand/20 text-xs text-brand">
                {getInitials(activeCircle.name)}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="max-w-[120px] truncate font-medium">
            {isPersonalActive ? "My Training" : activeCircle.name}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {/* My Training — always first */}
        {personalCircle && (
          <>
            <DropdownMenuItem
              onClick={() => handleSwitch(personalCircle.id)}
              className="gap-3 py-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20">
                <Dumbbell className="h-4 w-4 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium">My Training</span>
              </div>
              {personalCircle.id === activeCircle.id && (
                <Check className="h-4 w-4 text-brand" />
              )}
            </DropdownMenuItem>
            {groupCircles.length > 0 && <DropdownMenuSeparator />}
          </>
        )}

        {/* Group Circles */}
        {groupCircles.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Circles
            </DropdownMenuLabel>
            {groupCircles.map((circle) => {
              const isActive = circle.id === activeCircle.id;
              const roleBadge = getRoleBadge(circle.role);

              return (
                <DropdownMenuItem
                  key={circle.id}
                  onClick={() => handleSwitch(circle.id)}
                  className="gap-3 py-2"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={circle.imageUrl} />
                    <AvatarFallback className="bg-brand/20 text-xs text-brand">
                      {getInitials(circle.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{circle.name}</span>
                      {roleBadge && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {roleBadge}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isActive && <Check className="h-4 w-4 text-brand" />}
                </DropdownMenuItem>
              );
            })}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/you?section=circles")}
          className="gap-3"
        >
          <Users className="h-4 w-4" />
          Manage Circles
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setShowCreateCircle(true)}
          className="gap-3"
        >
          <Plus className="h-4 w-4" />
          Create New Circle
        </DropdownMenuItem>
      </DropdownMenuContent>
      <CreateCircleExperience
        open={showCreateCircle}
        onOpenChange={setShowCreateCircle}
        onComplete={() => {
          router.refresh();
        }}
      />
    </DropdownMenu>
  );
}
