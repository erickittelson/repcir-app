"use client";

import { useState, useEffect, useCallback } from "react";
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
  Clock,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ConnectionStatus = "connected" | "pending_outgoing" | "pending_incoming" | "not_connected";

export interface RallyMember {
  id: string;
  memberId: string;
  userId: string;
  name: string;
  profilePicture?: string | null;
  handle?: string | null;
  connectionStatus?: ConnectionStatus;
  connectionId?: string | null;
}

interface RallyMemberSelectorProps {
  selectedMembers: RallyMember[];
  onSelectionChange: (members: RallyMember[]) => void;
  maxSelections?: number;
  excludeCurrentUser?: boolean;
  label?: string;
  description?: string;
  compact?: boolean;
  /** If true, only show already connected users */
  connectedOnly?: boolean;
  /** If true, allow searching all users and sending connection requests */
  allowConnectRequests?: boolean;
}

export function RallyMemberSelector({
  selectedMembers,
  onSelectionChange,
  maxSelections = 10,
  excludeCurrentUser = true,
  label = "Train Together",
  description = "Tag rally members to include them",
  compact = false,
  connectedOnly = false,
  allowConnectRequests = true,
}: RallyMemberSelectorProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [members, setMembers] = useState<RallyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  // Search users with debouncing
  const searchUsers = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(query && { q: query }),
        ...(connectedOnly && { connectedOnly: "true" }),
        limit: "30",
      });
      const response = await fetch(`/api/users/search?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.users || []);
      }
    } catch (error) {
      console.error("Failed to search users:", error);
    } finally {
      setLoading(false);
    }
  }, [connectedOnly]);

  // Fetch users when sheet opens or search changes
  useEffect(() => {
    if (sheetOpen) {
      const timer = setTimeout(() => {
        searchUsers(searchQuery);
      }, searchQuery ? 300 : 0); // Debounce only for typed queries
      return () => clearTimeout(timer);
    }
  }, [sheetOpen, searchQuery, searchUsers]);

  // Send connection request
  const handleConnect = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSendingRequest(userId);
    try {
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresseeId: userId }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update member's connection status in list
        setMembers((prev) =>
          prev.map((m) =>
            m.userId === userId
              ? {
                  ...m,
                  connectionStatus: data.connection.status === "accepted"
                    ? "connected"
                    : "pending_outgoing",
                  connectionId: data.connection.id,
                }
              : m
          )
        );
        toast.success(
          data.connection.status === "accepted"
            ? "Connected! You can now tag them."
            : "Connection request sent!"
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to send request");
      }
    } catch (error) {
      console.error("Failed to send connection request:", error);
      toast.error("Failed to send request");
    } finally {
      setSendingRequest(null);
    }
  };

  const toggleMember = (member: RallyMember) => {
    // Only allow toggling connected members
    if (member.connectionStatus && member.connectionStatus !== "connected") {
      return; // Can't select non-connected members
    }

    const isSelected = selectedMembers.some((m) => m.memberId === member.memberId || m.userId === member.userId);

    if (isSelected) {
      onSelectionChange(selectedMembers.filter((m) => m.memberId !== member.memberId && m.userId !== member.userId));
    } else if (selectedMembers.length < maxSelections) {
      onSelectionChange([...selectedMembers, member]);
    }
  };

  const removeMember = (memberId: string) => {
    onSelectionChange(selectedMembers.filter((m) => m.memberId !== memberId && m.userId !== memberId));
  };

  // Members are already filtered by the API search
  const filteredMembers = members;

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
          onConnect={allowConnectRequests ? handleConnect : undefined}
          sendingRequest={sendingRequest}
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
              key={member.memberId || member.userId}
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
                onClick={() => removeMember(member.memberId || member.userId)}
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
          <span className="text-sm">Tap to add or search people</span>
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
        onConnect={allowConnectRequests ? handleConnect : undefined}
        sendingRequest={sendingRequest}
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
  onConnect,
  sendingRequest,
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
  onConnect?: (userId: string, e: React.MouseEvent) => void;
  sendingRequest: string | null;
  maxSelections: number;
}) {
  // Helper to get connection status badge
  const getConnectionBadge = (status?: ConnectionStatus) => {
    switch (status) {
      case "pending_outgoing":
        return (
          <Badge variant="secondary" className="text-xs gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "pending_incoming":
        return (
          <Badge variant="outline" className="text-xs text-brand border-brand gap-1">
            <UserPlus className="h-3 w-3" />
            Wants to connect
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl px-4 pb-6">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand" />
            Tag People
          </SheetTitle>
          <SheetDescription>
            Search and tag people. Not connected yet? Send a request!
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
              <p>{searchQuery ? "No users found" : "Search to find people"}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {members.map((member) => {
                const isSelected = selectedMembers.some(
                  (m) => m.memberId === member.memberId || m.userId === member.userId
                );
                const isConnected = member.connectionStatus === "connected";
                const canSelect = isConnected;
                const atLimit = selectedMembers.length >= maxSelections && !isSelected;
                const isSending = sendingRequest === member.userId;

                return (
                  <div
                    key={member.memberId || member.userId}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-colors",
                      isSelected
                        ? "bg-brand/10 border-2 border-brand"
                        : "border-2 border-transparent",
                      canSelect && !atLimit && "hover:bg-muted cursor-pointer"
                    )}
                    onClick={() => canSelect && !atLimit && onToggleMember(member)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profilePicture || undefined} />
                      <AvatarFallback className="bg-brand/20 text-brand">
                        {member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{member.name}</p>
                        {getConnectionBadge(member.connectionStatus)}
                      </div>
                      {member.handle && (
                        <p className="text-sm text-muted-foreground truncate">
                          @{member.handle}
                        </p>
                      )}
                    </div>
                    {/* Action area */}
                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <div className="h-8 w-8 rounded-full bg-brand flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      ) : !isConnected && onConnect ? (
                        member.connectionStatus === "pending_outgoing" ? (
                          <Badge variant="secondary" className="text-xs">
                            Sent
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 text-xs"
                            onClick={(e) => onConnect(member.userId, e)}
                            disabled={isSending}
                          >
                            {isSending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                            Connect
                          </Button>
                        )
                      ) : atLimit ? (
                        <span className="text-xs text-muted-foreground">Limit reached</span>
                      ) : null}
                    </div>
                  </div>
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
