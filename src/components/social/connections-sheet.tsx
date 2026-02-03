"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  UserMinus,
  Check,
  X,
  Loader2,
  UserPlus,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";

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

interface ConnectionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: "connections" | "requests";
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

// ============================================================================
// Main ConnectionsSheet Component
// ============================================================================

export function ConnectionsSheet({
  open,
  onOpenChange,
  initialTab = "connections",
}: ConnectionsSheetProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<Connection | null>(null);

  // Fetch connections and requests
  const fetchData = useCallback(async () => {
    if (!open) return;

    setLoading(true);
    try {
      const [connectionsRes, requestsRes] = await Promise.all([
        fetch("/api/connections"),
        fetch("/api/connections/requests"),
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
      console.error("Failed to fetch connections:", error);
      toast.error("Failed to load connections");
    } finally {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset tab when opening
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

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

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "connections" | "requests")}
            className="flex flex-col h-[calc(100%-80px)]"
          >
            <TabsList className="mx-4 mb-4 grid w-[calc(100%-32px)] grid-cols-2">
              <TabsTrigger value="connections" className="gap-2">
                <Users className="h-4 w-4" />
                My Connections
                {connections.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({connections.length})
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2 relative">
                <UserPlus className="h-4 w-4" />
                Requests
                {pendingCount > 0 && (
                  <Badge
                    variant="default"
                    className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 bg-brand text-brand-foreground"
                  >
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="connections" className="flex-1 mt-0">
              <ScrollArea className="h-full px-4">
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
            </TabsContent>

            <TabsContent value="requests" className="flex-1 mt-0">
              <ScrollArea className="h-full px-4">
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
            </TabsContent>
          </Tabs>
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
