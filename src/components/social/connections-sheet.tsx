"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  UserMinus,
  Check,
  X,
  Loader2,
  UserPlus,
  Inbox,
  Search,
  Clock,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface Connection {
  id: string;
  userId: string;
  name: string;
  handle?: string | null;
  profilePicture?: string | null;
  followedAt?: string;
}

export interface ConnectionRequest {
  id: string;
  userId: string;
  name: string;
  handle?: string | null;
  profilePicture?: string | null;
  requestedAt: string;
}

export interface SearchResult {
  id: string;
  userId: string;
  name: string;
  handle?: string | null;
  profilePicture?: string | null;
  city?: string | null;
  state?: string | null;
  bio?: string | null;
  connectionStatus: "connected" | "pending_outgoing" | "pending_incoming" | "not_connected";
}

interface ConnectionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: "connections" | "requests" | "find";
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
// Connection Item Component
// ============================================================================

function ConnectionItem({
  connection,
  onRemove,
  isRemoving,
}: {
  connection: Connection;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
    >
      <Avatar className="h-12 w-12 border-2 border-border">
        <AvatarImage src={connection.profilePicture || undefined} />
        <AvatarFallback className="bg-brand/20 text-brand font-semibold">
          {getInitials(connection.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{connection.name}</p>
        {connection.handle && (
          <p className="text-sm text-muted-foreground truncate">
            @{connection.handle}
          </p>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={isRemoving}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
      >
        {isRemoving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserMinus className="h-4 w-4" />
        )}
      </Button>
    </motion.div>
  );
}

// ============================================================================
// Request Item Component
// ============================================================================

function RequestItem({
  request,
  onAccept,
  onDecline,
  isProcessing,
}: {
  request: ConnectionRequest;
  onAccept: () => void;
  onDecline: () => void;
  isProcessing: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50"
    >
      <Avatar className="h-12 w-12 border-2 border-brand/30">
        <AvatarImage src={request.profilePicture || undefined} />
        <AvatarFallback className="bg-brand/20 text-brand font-semibold">
          {getInitials(request.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{request.name}</p>
        {request.handle && (
          <p className="text-sm text-muted-foreground truncate">
            @{request.handle}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          Wants to connect
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onDecline}
          disabled={isProcessing}
          className="h-8 w-8 p-0"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
        <Button
          size="sm"
          onClick={onAccept}
          disabled={isProcessing}
          className="h-8 bg-brand hover:bg-brand/90 text-brand-foreground"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              Accept
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Search Result Item Component
// ============================================================================

function SearchResultItem({
  user,
  onConnect,
  isProcessing,
}: {
  user: SearchResult;
  onConnect: () => void;
  isProcessing: boolean;
}) {
  const statusLabels = {
    connected: "Connected",
    pending_outgoing: "Requested",
    pending_incoming: "Accept",
    not_connected: "Connect",
  };

  const isActionable = user.connectionStatus === "not_connected" || user.connectionStatus === "pending_incoming";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
    >
      <Avatar className="h-12 w-12 border-2 border-border">
        <AvatarImage src={user.profilePicture || undefined} />
        <AvatarFallback className="bg-brand/20 text-brand font-semibold">
          {getInitials(user.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{user.name}</p>
          {user.handle && (
            <span className="text-xs text-brand">@{user.handle}</span>
          )}
        </div>
        {(user.city || user.state) && (
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            {[user.city, user.state].filter(Boolean).join(", ")}
          </p>
        )}
        {user.bio && (
          <p className="text-xs text-muted-foreground/80 truncate mt-0.5">
            {user.bio.length > 60 ? `${user.bio.substring(0, 60)}...` : user.bio}
          </p>
        )}
      </div>

      {user.connectionStatus === "connected" ? (
        <span className="text-xs text-success flex items-center gap-1">
          <Check className="h-3 w-3" />
          Connected
        </span>
      ) : user.connectionStatus === "pending_outgoing" ? (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      ) : (
        <Button
          size="sm"
          onClick={onConnect}
          disabled={isProcessing}
          className={cn(
            "h-8",
            user.connectionStatus === "pending_incoming"
              ? "bg-brand hover:bg-brand/90 text-brand-foreground"
              : "bg-brand/10 text-brand hover:bg-brand/20"
          )}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : user.connectionStatus === "pending_incoming" ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Accept
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-1" />
              Connect
            </>
          )}
        </Button>
      )}
    </motion.div>
  );
}

// ============================================================================
// Empty States
// ============================================================================

function EmptyConnections() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="font-medium text-lg">No connections yet</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
        Connect with others to see their workouts and share your fitness journey
      </p>
    </motion.div>
  );
}

function EmptyRequests() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Inbox className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="font-medium text-lg">No pending requests</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
        When someone sends you a connection request, it will appear here
      </p>
    </motion.div>
  );
}

function EmptySearch({ hasQuery }: { hasQuery: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="font-medium text-lg">
        {hasQuery ? "No users found" : "Find People"}
      </p>
      <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
        {hasQuery
          ? "Try a different name, @handle, or location"
          : "Search by name, @handle, city, or bio to find and connect with others"}
      </p>
      {!hasQuery && (
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <span className="px-2 py-1 bg-muted/50 rounded text-xs text-muted-foreground">@username</span>
          <span className="px-2 py-1 bg-muted/50 rounded text-xs text-muted-foreground">New York</span>
          <span className="px-2 py-1 bg-muted/50 rounded text-xs text-muted-foreground">powerlifting</span>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Main ConnectionsSheet Component
// ============================================================================

export function ConnectionsSheet({
  open,
  onOpenChange,
  initialTab = "connections",
}: ConnectionsSheetProps) {
  const [activeTab, setActiveTab] = useState<"connections" | "requests" | "find">(initialTab);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<Connection | null>(null);

  // Fetch connections and requests
  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      try {
        const [connectionsRes, requestsRes] = await Promise.all([
          fetch("/api/connections", { signal: controller.signal }),
          fetch("/api/connections/requests", { signal: controller.signal }),
        ]);

        if (connectionsRes.ok) {
          const data = await connectionsRes.json();
          setConnections(data.connections || []);
        }

        if (requestsRes.ok) {
          const data = await requestsRes.json();
          setRequests(data.requests || []);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Failed to fetch connections:", error);
          toast.error("Failed to load connections");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => controller.abort();
  }, [open]);

  // Reset tab when opening
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open, initialTab]);

  // Search for users
  useEffect(() => {
    if (activeTab !== "find") return;

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const url = searchQuery
          ? `/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=20`
          : `/api/users/search?limit=20`;
        const res = await fetch(url, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.users || []);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Failed to search users:", error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchQuery, activeTab]);

  // Handle sending a connection request
  const handleSendRequest = async (user: SearchResult) => {
    setProcessingId(user.userId);
    try {
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresseeId: user.userId }),
      });

      if (response.ok) {
        // Update search results to show pending status
        setSearchResults((prev) =>
          prev.map((u) =>
            u.userId === user.userId
              ? { ...u, connectionStatus: "pending_outgoing" as const }
              : u
          )
        );
        toast.success(`Connection request sent to ${user.name}`);
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to send request");
      }
    } catch (error) {
      console.error("Failed to send connection request:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send request");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle removing a connection
  const handleRemoveConnection = async () => {
    if (!removeConfirm) return;

    setProcessingId(removeConfirm.id);
    try {
      const response = await fetch(`/api/users/${removeConfirm.userId}/follow`, {
        method: "DELETE",
      });

      if (response.ok) {
        setConnections((prev) =>
          prev.filter((c) => c.id !== removeConfirm.id)
        );
        toast.success(`Removed ${removeConfirm.name} from connections`);
      } else {
        throw new Error("Failed to remove connection");
      }
    } catch (error) {
      console.error("Failed to remove connection:", error);
      toast.error("Failed to remove connection");
    } finally {
      setProcessingId(null);
      setRemoveConfirm(null);
    }
  };

  // Handle accepting a request
  const handleAcceptRequest = async (request: ConnectionRequest) => {
    setProcessingId(request.id);
    try {
      const response = await fetch(`/api/connections/requests/${request.id}/accept`, {
        method: "POST",
      });

      if (response.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== request.id));
        // Add to connections
        setConnections((prev) => [
          {
            id: request.id,
            userId: request.userId,
            name: request.name,
            handle: request.handle,
            profilePicture: request.profilePicture,
          },
          ...prev,
        ]);
        toast.success(`Connected with ${request.name}`);
      } else {
        throw new Error("Failed to accept request");
      }
    } catch (error) {
      console.error("Failed to accept request:", error);
      toast.error("Failed to accept request");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle declining a request
  const handleDeclineRequest = async (request: ConnectionRequest) => {
    setProcessingId(request.id);
    try {
      const response = await fetch(`/api/connections/requests/${request.id}/decline`, {
        method: "POST",
      });

      if (response.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== request.id));
        toast.success("Request declined");
      } else {
        throw new Error("Failed to decline request");
      }
    } catch (error) {
      console.error("Failed to decline request:", error);
      toast.error("Failed to decline request");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = requests.length;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[85vh] rounded-t-3xl px-0 pb-6"
        >
          <SheetHeader className="px-4 pb-2">
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand" />
              Connections
            </SheetTitle>
            <SheetDescription>
              Manage your connections and requests
            </SheetDescription>
          </SheetHeader>

          {/* Custom tab buttons with clear selected state */}
          <div className="flex gap-2 mx-4 mb-4">
            <button
              onClick={() => setActiveTab("connections")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all",
                activeTab === "connections"
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <Users className="h-4 w-4" />
              Connections
              {connections.length > 0 && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  activeTab === "connections" ? "bg-brand-foreground/20" : "bg-muted"
                )}>
                  {connections.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all relative",
                activeTab === "requests"
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <Inbox className="h-4 w-4" />
              Requests
              {pendingCount > 0 && (
                <Badge
                  variant="default"
                  className={cn(
                    "h-5 min-w-5 px-1.5",
                    activeTab === "requests"
                      ? "bg-brand-foreground/20 text-brand-foreground"
                      : "bg-destructive text-destructive-foreground"
                  )}
                >
                  {pendingCount}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab("find")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all",
                activeTab === "find"
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <Search className="h-4 w-4" />
              Find
            </button>
          </div>

          <div className="flex flex-col flex-1 overflow-hidden">

            {/* Connections Tab */}
            {activeTab === "connections" && (
              <ScrollArea className="flex-1 px-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-brand" />
                  </div>
                ) : connections.length === 0 ? (
                  <EmptyConnections />
                ) : (
                  <AnimatePresence mode="popLayout">
                    <div className="space-y-1">
                      {connections.map((connection) => (
                        <ConnectionItem
                          key={connection.id}
                          connection={connection}
                          onRemove={() => setRemoveConfirm(connection)}
                          isRemoving={processingId === connection.id}
                        />
                      ))}
                    </div>
                  </AnimatePresence>
                )}
              </ScrollArea>
            )}

            {/* Requests Tab */}
            {activeTab === "requests" && (
              <ScrollArea className="flex-1 px-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-brand" />
                  </div>
                ) : requests.length === 0 ? (
                  <EmptyRequests />
                ) : (
                  <AnimatePresence mode="popLayout">
                    <div className="space-y-2">
                      {requests.map((request) => (
                        <RequestItem
                          key={request.id}
                          request={request}
                          onAccept={() => handleAcceptRequest(request)}
                          onDecline={() => handleDeclineRequest(request)}
                          isProcessing={processingId === request.id}
                        />
                      ))}
                    </div>
                  </AnimatePresence>
                )}
              </ScrollArea>
            )}

            {/* Find/Search Tab */}
            {activeTab === "find" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="px-4 pb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or @handle..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1 px-4">
                  {searchLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-brand" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <EmptySearch hasQuery={searchQuery.length > 0} />
                  ) : (
                    <AnimatePresence mode="popLayout">
                      <div className="space-y-1">
                        {searchResults.map((user) => (
                          <SearchResultItem
                            key={user.userId}
                            user={user}
                            onConnect={() => handleSendRequest(user)}
                            isProcessing={processingId === user.userId}
                          />
                        ))}
                      </div>
                    </AnimatePresence>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Remove Confirmation Dialog */}
      <AlertDialog
        open={!!removeConfirm}
        onOpenChange={(open) => !open && setRemoveConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium text-foreground">
                {removeConfirm?.name}
              </span>{" "}
              from your connections? They will no longer see your activity and
              you won&apos;t see theirs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConnection}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processingId === removeConfirm?.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ConnectionsSheet;
