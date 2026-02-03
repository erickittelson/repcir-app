"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Check,
  Link2,
  Loader2,
  Users,
  X,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

export interface RallyMember {
  id: string;
  memberId: string;
  userId: string;
  name: string;
  profilePicture?: string | null;
  handle?: string | null;
}

interface RallyMemberHubProps {
  rallyId: string;
  rallyName: string;
  rallyImage?: string;
  onComplete: () => void;
  onSkip: () => void;
}

// ============================================================================
// Utility functions
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ============================================================================
// RallyCircle Component (Compact center visual)
// ============================================================================

interface RallyCircleProps {
  rallyName: string;
  rallyImage?: string;
  memberCount: number;
}

function RallyCircle({ rallyName, rallyImage, memberCount }: RallyCircleProps) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "relative h-[120px] w-[120px] rounded-full",
          "bg-gradient-to-br from-surface to-surface-elevated",
          "border-2 border-border",
          "flex flex-col items-center justify-center",
          "shadow-xl"
        )}
      >
        {/* Rally image or icon */}
        {rallyImage ? (
          <Avatar className="h-12 w-12 mb-1">
            <AvatarImage src={rallyImage} />
            <AvatarFallback className="bg-brand/20 text-brand">
              <Users className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-12 w-12 rounded-full bg-brand/20 flex items-center justify-center mb-1">
            <Users className="h-6 w-6 text-brand" />
          </div>
        )}

        {/* Rally name */}
        <span className="text-xs font-semibold text-center px-3 truncate max-w-[100px]">
          {rallyName}
        </span>

        {/* Member count badge */}
        {memberCount > 0 && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-brand text-brand-foreground text-xs font-medium px-2 py-0.5 rounded-full">
            {memberCount} added
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// AddedMembersRow Component
// ============================================================================

interface AddedMembersRowProps {
  members: RallyMember[];
  onRemoveMember: (memberId: string) => void;
  onViewAll: () => void;
}

function AddedMembersRow({
  members,
  onRemoveMember,
  onViewAll,
}: AddedMembersRowProps) {
  if (members.length === 0) return null;

  return (
    <div className="px-4 py-3">
      <button
        onClick={onViewAll}
        className="w-full flex items-center justify-between p-3 bg-surface-elevated rounded-xl border border-border hover:border-brand/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Stacked avatars */}
          <div className="flex -space-x-3">
            {members.slice(0, 5).map((member, index) => (
              <Avatar
                key={member.memberId}
                className="h-10 w-10 border-2 border-surface-elevated"
                style={{ zIndex: 5 - index }}
              >
                <AvatarImage src={member.profilePicture || undefined} />
                <AvatarFallback className="text-xs bg-brand/20 text-brand font-medium">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
            ))}
            {members.length > 5 && (
              <div
                className="h-10 w-10 rounded-full bg-muted border-2 border-surface-elevated flex items-center justify-center"
                style={{ zIndex: 0 }}
              >
                <span className="text-xs font-medium text-muted-foreground">
                  +{members.length - 5}
                </span>
              </div>
            )}
          </div>

          {/* Label */}
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">
              {members.length} member{members.length !== 1 ? "s" : ""} added
            </span>
            <span className="text-xs text-muted-foreground">
              Tap to view and manage
            </span>
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </button>
    </div>
  );
}

// ============================================================================
// MemberListSheet Component (Modal for managing added members)
// ============================================================================

interface MemberListSheetProps {
  isOpen: boolean;
  onClose: () => void;
  members: RallyMember[];
  onRemoveMember: (memberId: string) => void;
}

function MemberListSheet({
  isOpen,
  onClose,
  members,
  onRemoveMember,
}: MemberListSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
          <h3 className="text-lg font-semibold">
            Added Members ({members.length})
          </h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Member list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {members.map((member) => (
            <div
              key={member.memberId}
              className="flex items-center justify-between p-3 bg-surface-elevated rounded-xl"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={member.profilePicture || undefined} />
                  <AvatarFallback className="bg-brand/20 text-brand font-medium">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium">{member.name}</span>
                  {member.handle && (
                    <span className="text-sm text-muted-foreground">
                      @{member.handle}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onRemoveMember(member.memberId)}
                className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                aria-label={`Remove ${member.name}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// UserListItem Component
// ============================================================================

interface UserListItemProps {
  member: RallyMember;
  isAdded: boolean;
  isAdding: boolean;
  onAdd: () => void;
}

function UserListItem({
  member,
  isAdded,
  isAdding,
  onAdd,
}: UserListItemProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-xl">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-12 w-12 flex-shrink-0">
          <AvatarImage src={member.profilePicture || undefined} />
          <AvatarFallback className="bg-brand/20 text-brand font-medium">
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span className="font-medium truncate">{member.name}</span>
          {member.handle && (
            <span className="text-sm text-muted-foreground truncate">
              @{member.handle}
            </span>
          )}
        </div>
      </div>

      {/* Add button - min 44px touch target */}
      <button
        onClick={onAdd}
        disabled={isAdded || isAdding}
        className={cn(
          "h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 ml-2 transition-all",
          isAdded
            ? "bg-success/20 text-success"
            : "bg-brand text-brand-foreground hover:bg-brand/90 active:scale-95",
          (isAdded || isAdding) && "cursor-not-allowed"
        )}
        aria-label={isAdded ? `${member.name} added` : `Add ${member.name}`}
      >
        {isAdding ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isAdded ? (
          <Check className="h-5 w-5" />
        ) : (
          <Plus className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}

// ============================================================================
// HorizontalUserCard Component (for recommendations row)
// ============================================================================

interface HorizontalUserCardProps {
  member: RallyMember;
  isAdded: boolean;
  isAdding: boolean;
  onAdd: () => void;
}

function HorizontalUserCard({
  member,
  isAdded,
  isAdding,
  onAdd,
}: HorizontalUserCardProps) {
  return (
    <div className="flex flex-col items-center p-3 bg-surface-elevated rounded-xl min-w-[100px] max-w-[100px]">
      <div className="relative mb-2">
        <Avatar className="h-14 w-14">
          <AvatarImage src={member.profilePicture || undefined} />
          <AvatarFallback className="bg-brand/20 text-brand font-medium">
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>

        {/* Quick add button overlay */}
        <button
          onClick={onAdd}
          disabled={isAdded || isAdding}
          className={cn(
            "absolute -bottom-1 -right-1 h-7 w-7 rounded-full flex items-center justify-center shadow-md transition-all",
            isAdded
              ? "bg-success text-success-foreground"
              : "bg-brand text-brand-foreground hover:bg-brand/90 active:scale-95",
            (isAdded || isAdding) && "cursor-not-allowed"
          )}
          aria-label={isAdded ? `${member.name} added` : `Add ${member.name}`}
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isAdded ? (
            <Check className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </button>
      </div>

      <span className="text-xs font-medium text-center truncate w-full">
        {member.name.split(" ")[0]}
      </span>
      {member.handle && (
        <span className="text-[10px] text-muted-foreground truncate w-full text-center">
          @{member.handle}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Main RallyMemberHub Component
// ============================================================================

export function RallyMemberHub({
  rallyId,
  rallyName,
  rallyImage,
  onComplete,
  onSkip,
}: RallyMemberHubProps) {
  // State
  const [recommendedMembers, setRecommendedMembers] = useState<RallyMember[]>(
    []
  );
  const [searchResults, setSearchResults] = useState<RallyMember[]>([]);
  const [addedMembers, setAddedMembers] = useState<RallyMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showMemberSheet, setShowMemberSheet] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch connected users as recommendations on mount
  useEffect(() => {
    fetchRecommended();
  }, []);

  const fetchRecommended = async () => {
    setLoading(true);
    try {
      // Only fetch connected users for recommendations
      const response = await fetch("/api/users/search?connectedOnly=true&limit=20");
      if (response.ok) {
        const data = await response.json();
        setRecommendedMembers(data.users || []);
      }
    } catch (error) {
      console.error("Failed to fetch recommended users:", error);
      toast.error("Failed to load connections");
    } finally {
      setLoading(false);
    }
  };

  // Search users with debouncing
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    try {
      // Strip @ symbol for search, only search connected users
      const cleanQuery = query.replace(/^@/, "");
      const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(cleanQuery)}&connectedOnly=true&limit=20`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error("Failed to search users:", error);
    } finally {
      setSearching(false);
    }
  }, []);

  // Handle search input with debouncing
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      // Set searching state immediately for UI feedback
      setSearching(true);

      // Debounce the actual search
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(query);
      }, 300);
    },
    [searchUsers]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Add member to rally
  const handleAddMember = async (member: RallyMember) => {
    if (addedMembers.some((m) => m.memberId === member.memberId)) {
      toast.info(`${member.name.split(" ")[0]} is already added`);
      return;
    }

    setAddingMemberId(member.memberId);

    try {
      // Simulate API call - in production, this would actually add the member
      await new Promise((resolve) => setTimeout(resolve, 300));

      setAddedMembers((prev) => [...prev, member]);
      toast.success(`${member.name.split(" ")[0]} added to rally!`);
    } catch (error) {
      console.error("Failed to add member:", error);
      toast.error("Failed to add member");
    } finally {
      setAddingMemberId(null);
    }
  };

  // Remove member from rally
  const handleRemoveMember = (memberId: string) => {
    const member = addedMembers.find((m) => m.memberId === memberId);
    setAddedMembers((prev) => prev.filter((m) => m.memberId !== memberId));
    if (member) {
      toast.success(`${member.name.split(" ")[0]} removed`);
    }
  };

  // Copy invite link
  const handleCopyInviteLink = async () => {
    try {
      // Create an invite via API
      const response = await fetch("/api/circles/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "member", expiresInDays: 7 }),
      });

      if (response.ok) {
        const data = await response.json();
        await navigator.clipboard.writeText(data.invitation.url);
        setCopySuccess(true);
        toast.success("Invite link copied!");
        setTimeout(() => setCopySuccess(false), 2000);
      } else {
        // Fallback: copy a generic invite URL
        const fallbackUrl = `${window.location.origin}/rally/${rallyId}/join`;
        await navigator.clipboard.writeText(fallbackUrl);
        setCopySuccess(true);
        toast.success("Invite link copied!");
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch (error) {
      console.error("Failed to copy invite link:", error);
      toast.error("Failed to copy invite link");
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  // Check if member is already added
  const isMemberAdded = (memberId: string) =>
    addedMembers.some((m) => m.memberId === memberId);

  // Get display members
  const displayMembers = searchQuery.trim() ? searchResults : recommendedMembers;

  // Show search mode UI
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Sticky header with search */}
      <div className="flex-shrink-0 sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3">
          <div className="relative">
            {searching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-brand animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            )}
            <Input
              ref={searchInputRef}
              placeholder="Search your connections..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-10 h-12 text-base rounded-xl bg-surface-elevated border-border"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Rally circle and added members section */}
        {!isSearching && (
          <div className="py-6">
            {/* Rally circle */}
            <div className="flex justify-center mb-4">
              <RallyCircle
                rallyName={rallyName}
                rallyImage={rallyImage}
                memberCount={addedMembers.length}
              />
            </div>

            {/* Added members row */}
            <AddedMembersRow
              members={addedMembers}
              onRemoveMember={handleRemoveMember}
              onViewAll={() => setShowMemberSheet(true)}
            />
          </div>
        )}

        {/* Search results or recommendations */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        ) : isSearching ? (
          /* Search results as vertical list */
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-muted-foreground">
                {searchResults.length > 0
                  ? `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""}`
                  : "No results found"}
              </span>
            </div>
            <div className="space-y-2">
              {searchResults.map((member) => (
                <UserListItem
                  key={member.memberId}
                  member={member}
                  isAdded={isMemberAdded(member.memberId)}
                  isAdding={addingMemberId === member.memberId}
                  onAdd={() => handleAddMember(member)}
                />
              ))}
            </div>
            {searchResults.length === 0 && searchQuery.trim() && !searching && (
              <div className="text-center py-8">
                <UserPlus className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No connections found matching &quot;{searchQuery}&quot;
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Recommendations section */
          <div className="pb-4">
            {/* Section header */}
            <div className="flex items-center justify-between px-4 mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-brand" />
                <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Your Connections
                </span>
              </div>
              {displayMembers.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {displayMembers.length} available
                </span>
              )}
            </div>

            {displayMembers.length > 0 ? (
              <>
                {/* Horizontal scrollable row for quick access */}
                <div className="px-4 mb-4">
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {displayMembers.slice(0, 10).map((member) => (
                      <HorizontalUserCard
                        key={member.memberId}
                        member={member}
                        isAdded={isMemberAdded(member.memberId)}
                        isAdding={addingMemberId === member.memberId}
                        onAdd={() => handleAddMember(member)}
                      />
                    ))}
                  </div>
                </div>

                {/* Full vertical list */}
                {displayMembers.length > 10 && (
                  <div className="px-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        All connections
                      </span>
                    </div>
                    <div className="space-y-2">
                      {displayMembers.slice(10).map((member) => (
                        <UserListItem
                          key={member.memberId}
                          member={member}
                          isAdded={isMemberAdded(member.memberId)}
                          isAdding={addingMemberId === member.memberId}
                          onAdd={() => handleAddMember(member)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 px-4">
                <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground mb-2">
                  No connections yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Share an invite link to grow your rally!
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions - sticky at bottom */}
      <div className="flex-shrink-0 p-4 space-y-3 border-t border-border bg-background/95 backdrop-blur-sm safe-area-inset-bottom">
        {/* Invite via link button */}
        <Button
          variant="outline"
          className="w-full gap-2 h-12 text-base rounded-xl"
          onClick={handleCopyInviteLink}
        >
          {copySuccess ? (
            <>
              <Check className="h-5 w-5 text-success" />
              Copied!
            </>
          ) : (
            <>
              <Link2 className="h-5 w-5" />
              Invite via Link
            </>
          )}
        </Button>

        {/* Action buttons row */}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1 h-12 text-base rounded-xl"
            onClick={onSkip}
          >
            Skip for now
          </Button>
          <Button
            className="flex-1 h-12 text-base rounded-xl bg-brand-gradient"
            onClick={onComplete}
            disabled={addedMembers.length === 0}
          >
            Done
            {addedMembers.length > 0 && ` (${addedMembers.length})`}
          </Button>
        </div>
      </div>

      {/* Member management sheet */}
      <MemberListSheet
        isOpen={showMemberSheet}
        onClose={() => setShowMemberSheet(false)}
        members={addedMembers}
        onRemoveMember={handleRemoveMember}
      />
    </div>
  );
}

export default RallyMemberHub;
