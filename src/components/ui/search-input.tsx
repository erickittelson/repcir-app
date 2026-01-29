"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface SearchInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  containerClassName?: string;
}

/**
 * SearchInput - A properly styled search input with icon
 *
 * This component solves the systemic spacing issue where search icons
 * overlap or clip the input text. It uses:
 * - Icon positioned at left-4 (16px)
 * - Icon width of 16px (w-4)
 * - Input padding-left of 48px (pl-12)
 * - This creates a 16px gap between icon and text
 */
const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, containerClassName, placeholder = "Search...", ...props }, ref) => {
    return (
      <div className={cn("relative", containerClassName)}>
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10"
          aria-hidden="true"
        />
        <Input
          ref={ref}
          type="search"
          placeholder={placeholder}
          className={cn("pl-12", className)}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";

export { SearchInput };
