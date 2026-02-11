"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Bike,
  Dumbbell,
  Heart,
  Wrench,
  Check,
} from "lucide-react";

export interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  icon?: string;
}

interface EquipmentSelectorProps {
  catalog: EquipmentItem[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

const CATEGORIES = [
  { value: "cardio", label: "Cardio", icon: Bike },
  { value: "strength", label: "Strength", icon: Dumbbell },
  { value: "flexibility", label: "Flexibility", icon: Heart },
  { value: "accessories", label: "Accessories", icon: Wrench },
];

export function EquipmentSelector({
  catalog,
  selected,
  onChange,
  className,
}: EquipmentSelectorProps) {
  const [search, setSearch] = useState("");

  const filteredCatalog = catalog.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const catalogByCategory = filteredCatalog.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, EquipmentItem[]>);

  const toggleItem = (itemId: string) => {
    if (selected.includes(itemId)) {
      onChange(selected.filter((id) => id !== itemId));
    } else {
      onChange([...selected, itemId]);
    }
  };

  const toggleCategory = (category: string) => {
    const categoryItems = catalogByCategory[category] || [];
    const categoryIds = categoryItems.map((item) => item.id);
    const allSelected = categoryIds.every((id) => selected.includes(id));

    if (allSelected) {
      onChange(selected.filter((id) => !categoryIds.includes(id)));
    } else {
      const newSelected = new Set([...selected, ...categoryIds]);
      onChange(Array.from(newSelected));
    }
  };

  const getCategoryCount = (category: string) => {
    const items = catalogByCategory[category] || [];
    return items.filter((item) => selected.includes(item.id)).length;
  };

  return (
    <div className={className}>
      <SearchInput
        placeholder="Search equipment..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        containerClassName="mb-4"
      />

      {/* Selected count bar - sticky at top */}
      <div className="flex items-center justify-between py-2 mb-2 border-b bg-background sticky top-0 z-10">
        <span className="text-sm text-muted-foreground">
          {selected.length} items selected
        </span>
        {selected.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onChange([])}>
            Clear All
          </Button>
        )}
      </div>

      {/* Equipment list - no nested scroll */}
      <Accordion type="multiple" defaultValue={CATEGORIES.map((c) => c.value)}>
        {CATEGORIES.map((category) => {
          const items = catalogByCategory[category.value] || [];
          if (items.length === 0) return null;

          const CategoryIcon = category.icon;
          const selectedCount = getCategoryCount(category.value);
          const allSelected = items.every((item) => selected.includes(item.id));

          return (
            <AccordionItem key={category.value} value={category.value}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2 flex-1">
                  <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{category.label}</span>
                  {selectedCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedCount}/{items.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 pt-1">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.value)}
                    className="flex items-center gap-2 w-full p-2 rounded hover:bg-muted text-sm text-muted-foreground"
                  >
                    <Check className="h-3 w-3" />
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                  {items.map((item) => {
                    const isSelected = selected.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5" : "hover:bg-muted"
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleItem(item.id)}
                        />
                        <span className="text-sm">{item.name}</span>
                      </label>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

// Re-export shared constants for backward compatibility
export { LOCATION_TEMPLATES, EQUIPMENT_CATEGORIES } from "@/lib/constants/equipment";
import { LOCATION_TEMPLATES } from "@/lib/constants/equipment";

export function TemplateSelector({
  locationType,
  catalog,
  onApply,
}: {
  locationType: string;
  catalog: EquipmentItem[];
  onApply: (equipmentIds: string[]) => void;
}) {
  const templateEquipment = LOCATION_TEMPLATES[locationType] || [];

  if (templateEquipment.length === 0) {
    return null;
  }

  const handleApplyTemplate = () => {
    const equipmentIds = catalog
      .filter((item) =>
        templateEquipment.some(
          (name) => name.toLowerCase() === item.name.toLowerCase()
        )
      )
      .map((item) => item.id);
    onApply(equipmentIds);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleApplyTemplate}>
      Apply Template ({templateEquipment.length} items)
    </Button>
  );
}
