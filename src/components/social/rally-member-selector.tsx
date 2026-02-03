"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  Check,
  X,
  UserPlus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface RallyMember {
  id: string;
  memberId: string;
  userId: string;
  name: string;
  profilePicture?: string | null;
  handle?: string | null;
}

interface RallyMemberSelectorProps {
  selectedMembers: RallyMember[];
  onSelectionChange: (members: RallyMember[]) => void;
  maxSelections?: number;
  excludeCurrentUser?: boolean;
  label?: string;
  description?: string;
  compact?: boolean;
}

export function RallyMemberSelector({
  selectedMembers,
  onSelectionChange,
  maxSelections = 10,
  excludeCurrentUser = true,
  label = "Train Together",
  description = "Tag rally members to include them",
  compact = false,
}: RallyMemberSelectorProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [members, setMembers] = useState<RallyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch rally members when sheet opens
  useEffect(() => {
    if (sheetOpen && members.length === 0) {
      fetchMembers();
    }
  }, [sheetOpen]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/circles/members");
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (member: RallyMember) => {
    const isSelected = selectedMembers.some((m) => m.memberId === member.memberId);

    if (isSelected) {
      onSelectionChange(selectedMembers.filter((m) => m.memberId !== member.memberId));
    } else if (selectedMembers.length < maxSelections) {
      onSelectionChange([...selectedMembers, member]);
    }
  };

  const removeMember = (memberId: string) => {
    onSelectionChange(selectedMembers.filter((m) => m.memberId !== memberId));
  };

  const filteredMembers = members.filter((member) => {
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      (member.handle?.toLowerCase().includes(query) ?? false)
    );
  });

  // Compact inline view - just show selected avatars + add button
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {selectedMembers.length > 0 && (
          <div className="flex -space-x-2">
            {selectedMembers.slice(0, 4).map((member) => (
              <Avatar
                key={member.memberId}
                className="h-8 w-8 border-2 border-background"
              >
                <AvatarImage src={member.profilePicture || undefined} />
                <AvatarFallback className="text-xs bg-brand/20 text-brand">
                  {member.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ))}
            {selectedMembers.length > 4 && (
              <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
                +{selectedMembers.length - 4}
              </div>
            )}
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSheetOpen(true)}
          className="gap-1.5"
        >
          <UserPlus className="h-4 w-4" />
          {selectedMembers.length === 0 ? "Add People" : "Edit"}
        </Button>

        <MemberSelectorSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          members={filteredMembers}
          selectedMembers={selectedMembers}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleMember={toggleMember}
          maxSelections={maxSelections}
        />
      </div>
    );
  }

  // Full view with label and selected chips
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSheetOpen(true)}
          className="gap-1.5"
        >
          <UserPlus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Selected Members */}
      {selectedMembers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedMembers.map((member) => (
            <Badge
              key={member.memberId}
              variant="secondary"
              className="gap-1.5 pr-1 py-1"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={member.profilePicture || undefined} />
                <AvatarFallback className="text-[10px]">
                  {member.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{member.name.split(" ")[0]}</span>
              <button
                type="button"
                onClick={() => removeMember(member.memberId)}
                className="ml-1 h-4 w-4 rounded-full hover:bg-muted flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="w-full h-12 rounded-xl border-2 border-dashed border-border hover:border-brand/50 flex items-center justify-center gap-2 text-muted-foreground hover:text-brand transition-colors"
        >
          <Users className="h-5 w-5" />
          <span className="text-sm">Tap to add rally members</span>
        </button>
      )}

      <MemberSelectorSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        members={filteredMembers}
        selectedMembers={selectedMembers}
        loading={loading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleMember={toggleMember}
        maxSelections={maxSelections}
      />
    </div>
  );
}

// Sheet component for member selection
function MemberSelectorSheet({
  open,
  onOpenChange,
  members,
  selectedMembers,
  loading,
  searchQuery,
  onSearchChange,
  onToggleMember,
  maxSelections,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: RallyMember[];
  selectedMembers: RallyMember[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleMember: (member: RallyMember) => void;
  maxSelections: number;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl px-4 pb-6">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand" />
            Add Rally Members
          </SheetTitle>
          <SheetDescription>
            Select members to include in this activity
          </SheetDescription>
        </SheetHeader>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or @handle..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Selected count */}
        {selectedMembers.length > 0 && (
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm text-muted-foreground">
              {selectedMembers.length} selected
            </span>
            <span className="text-xs text-muted-foreground">
              Max {maxSelections}
            </span>
          </div>
        )}

        {/* Member List */}
        <ScrollArea className="h-[calc(100%-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No rally members found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {members.map((member) => {
                const isSelected = selectedMembers.some(
                  (m) => m.memberId === member.memberId
                );
                const atLimit =
                  selectedMembers.length >= maxSelections && !isSelected;

                return (
                  <button
                    key={member.memberId}
                    type="button"
                    onClick={() => !atLimit && onToggleMember(member)}
                    disabled={atLimit}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-colors",
                      isSelected
                        ? "bg-brand/10 border-2 border-brand"
                        : "hover:bg-muted border-2 border-transparent",
                      atLimit && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profilePicture || undefined} />
                      <AvatarFallback className="bg-brand/20 text-brand">
                        {member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{member.name}</p>
                      {member.handle && (
                        <p className="text-sm text-muted-foreground">
                          @{member.handle}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="h-6 w-6 rounded-full bg-brand flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Done Button */}
        <div className="pt-4 border-t mt-4">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Done
            {selectedMembers.length > 0 && ` (${selectedMembers.length})`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
