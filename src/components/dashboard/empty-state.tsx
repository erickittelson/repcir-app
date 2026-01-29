import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
  variant?: "default" | "card";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
  variant = "default",
}: EmptyStateProps) {
  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-4",
        variant === "card" && "rounded-lg border bg-card",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-brand-gradient flex items-center justify-center mb-4 glow-brand">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-4">{description}</p>
      {actionLabel && (actionHref || onAction) && (
        actionHref ? (
          <Button asChild className="bg-brand-gradient hover:opacity-90">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button onClick={onAction} className="bg-brand-gradient hover:opacity-90">{actionLabel}</Button>
        )
      )}
    </div>
  );

  return content;
}

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  variant?: "default" | "primary" | "energy" | "success";
}

export function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
  variant = "default",
}: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl border p-5 transition-all hover:scale-[1.02] hover:shadow-lg",
        variant === "primary" && "border-brand/30 bg-brand-gradient-subtle hover:border-brand/50",
        variant === "energy" && "border-energy/30 bg-energy/10 hover:border-energy/50",
        variant === "success" && "border-success/30 bg-success/10 hover:border-success/50",
        variant === "default" && "border-border hover:bg-muted/50"
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
            variant === "primary" && "bg-brand-gradient glow-brand",
            variant === "energy" && "bg-energy-gradient glow-energy",
            variant === "success" && "bg-success-gradient glow-success",
            variant === "default" && "bg-muted"
          )}
        >
          <Icon className={cn(
            "w-6 h-6",
            (variant === "primary" || variant === "energy" || variant === "success") ? "text-white" : "text-foreground"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
    </Link>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "brand" | "energy" | "success";
}

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  variant = "default",
}: StatCardProps) {
  return (
    <div className={cn(
      "rounded-xl border p-5 transition-all",
      variant === "brand" && "border-brand/30 bg-brand-gradient-subtle",
      variant === "energy" && "border-energy/30 bg-energy/10",
      variant === "success" && "border-success/30 bg-success/10",
      variant === "default" && "bg-card"
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        {Icon && (
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            variant === "brand" && "bg-brand/20",
            variant === "energy" && "bg-energy/20",
            variant === "success" && "bg-success/20",
            variant === "default" && "bg-muted"
          )}>
            <Icon className={cn(
              "w-4 h-4",
              variant === "brand" && "text-brand",
              variant === "energy" && "text-energy",
              variant === "success" && "text-success",
              variant === "default" && "text-muted-foreground"
            )} />
          </div>
        )}
      </div>
      <div className={cn(
        "text-3xl font-bold",
        variant === "brand" && "text-brand-gradient bg-clip-text",
        variant === "energy" && "text-energy",
        variant === "success" && "text-success"
      )}>{value}</div>
      {subtext && (
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      )}
    </div>
  );
}
