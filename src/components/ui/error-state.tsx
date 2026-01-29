"use client";

import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  onHome?: () => void;
  className?: string;
  variant?: "default" | "minimal" | "card";
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load the content. Please try again.",
  onRetry,
  onHome,
  className,
  variant = "default",
}: ErrorStateProps) {
  const content = (
    <>
      <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
      <div className="space-y-2 text-center mt-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {description}
        </p>
      </div>
      {(onRetry || onHome) && (
        <div className="flex gap-3 justify-center mt-6">
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          {onHome && (
            <Button onClick={onHome} variant="ghost">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          )}
        </div>
      )}
    </>
  );

  if (variant === "minimal") {
    return (
      <div className={cn("flex flex-col items-center py-8", className)}>
        {content}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <Card className={cn("", className)}>
        <CardContent className="flex flex-col items-center py-8">
          {content}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[400px] p-8", className)}>
      {content}
    </div>
  );
}

// Empty state variant
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      {icon && <div className="text-muted-foreground mb-4">{icon}</div>}
      <h3 className="font-semibold text-lg">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
