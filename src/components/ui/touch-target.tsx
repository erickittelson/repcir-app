"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TouchTargetProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  as?: "div" | "span";
}

/**
 * TouchTarget component wraps small interactive elements to ensure
 * they meet the minimum 44x44px touch target size for mobile accessibility.
 * 
 * Usage:
 * ```tsx
 * <TouchTarget>
 *   <Button size="icon" variant="ghost">
 *     <XIcon className="h-4 w-4" />
 *   </Button>
 * </TouchTarget>
 * ```
 */
export const TouchTarget = forwardRef<HTMLDivElement, TouchTargetProps>(
  ({ children, as = "div", className, ...props }, ref) => {
    const Component = as;

    return (
      <Component
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center",
          "min-w-[44px] min-h-[44px]",
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

TouchTarget.displayName = "TouchTarget";

/**
 * IconButton component that already has proper touch target sizing built in.
 * Use this instead of Button size="icon" for icon-only buttons.
 */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline" | "secondary";
}

export function IconButton({
  children,
  variant = "ghost",
  className,
  ...props
}: IconButtonProps) {
  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md",
        "min-w-[44px] min-h-[44px] p-2",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
