"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check,
  Copy,
  Crown,
  Link2,
  Loader2,
  MoreVertical,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

// ============================================================================
// TYPES
// ============================================================================

interface Member {
  id: string;
  memberId: string;
  userId: string | null;
  name: string;
  role: string | null;
  profilePicture: string | null;
  handle: string | null;
  joinedAt: Date | null;
}

interface JoinRequest {
  id: string;
  userId: string;
  message: string | null;
  status: string;
  createdAt: Date;
  user: {
    name: string;
    profilePicture: string | null;
    handle: string | null;
  };
}

interface Invitation {
  id: string;
  code: string;
  url: string;
  email: string | null;
  role: string;
  maxUses: number | null;
  uses: number;
  expiresAt: Date | null;
  createdAt: Date;
  isExpired: boolean;
  isMaxedOut: boolean;
}

interface MemberManagementProps {
  circleId: string;
  userRole: string; // owner, admin, member
  embedded?: boolean; // true if embedded in settings page
}

interface MemberManagementSheetProps extends MemberManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// MEMBER MANAGEMENT CONTENT (reusable inner component)
// ============================================================================

function MemberManagementContent({
  circleId,
  userRole,
}: {
  circleId: string;
  userRole: string;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    variant?: "default" | "destructive";
  }>({
    open: false,
    title: "",
    description: "",
    action: async () => {},
  });

  const isAdminOrOwner = userRole === "owner" || userRole === "admin";
  const isOwner = userRole === "owner";

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, requestsRes, invitesRes] = await Promise.all([
        fetch(`/api/circles/${circleId}/members`),
        isAdminOrOwner ? fetch(`/api/circles/${circleId}/join-requests`) : null,
        isAdminOrOwner ? fetch(`/api/circles/invite`) : null,
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }

      if (requestsRes?.ok) {
        const data = await requestsRes.json();
        setJoinRequests(data.requests || []);
      }

      if (invitesRes?.ok) {
        const data = await invitesRes.json();
        // Filter to only show invitations for this circle
        setInvitations(
          (data.invitations || []).filter(
            (inv: Invitation) =>
              !inv.isExpired && !inv.isMaxedOut
          )
        );
      }
    } catch (error) {
      console.error("Error fetching member data:", error);
      toast.error("Failed to load member data");
    } finally {
      setLoading(false);
    }
  }, [circleId, isAdminOrOwner]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Role change handler
  const handleRoleChange = async (memberId: string, newRole: string) => {
    setActionLoading(memberId);
    try {
      const res = await fetch(
        `/api/circles/${circleId}/members/${memberId}/role`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update role");
      }

      toast.success(`Role updated to ${newRole}`);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setActionLoading(null);
    }
  };

  // Remove member handler
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    setConfirmDialog({
      open: true,
      title: `Remove ${memberName}?`,
      description: `Are you sure you want to remove ${memberName} from this circle? They will need to rejoin or be invited again.`,
      variant: "destructive",
      action: async () => {
        setActionLoading(memberId);
        try {
          const res = await fetch(
            `/api/circles/${circleId}/members?memberId=${memberId}`,
            { method: "DELETE" }
          );

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Failed to remove member");
          }

          toast.success(`${memberName} has been removed`);
          fetchData();
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Failed to remove member"
          );
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  // Join request handlers
  const handleJoinRequest = async (
    requestId: string,
    action: "approve" | "reject",
    userName: string
  ) => {
    setActionLoading(requestId);
    try {
      const res = await fetch(`/api/circles/${circleId}/join-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Failed to ${action} request`);
      }

      toast.success(
        action === "approve"
          ? `${userName} has been approved`
          : `Request from ${userName} rejected`
      );
      fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Failed to ${action} request`
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Create invite link
  const handleCreateInvite = async () => {
    setActionLoading("create-invite");
    try {
      const res = await fetch("/api/circles/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "member",
          expiresInDays: 7,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create invite");
      }

      const data = await res.json();
      await navigator.clipboard.writeText(data.invitation.url);
      toast.success("Invite link created and copied!");
      fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create invite"
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Copy invite link
  const handleCopyInvite = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // Revoke invite
  const handleRevokeInvite = async (inviteId: string) => {
    setActionLoading(inviteId);
    try {
      const res = await fetch(`/api/circles/invite?id=${inviteId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to revoke invite");
      }

      toast.success("Invite link revoked");
      fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to revoke invite"
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Role badge component
  const RoleBadge = ({ role }: { role: string | null }) => {
    if (role === "owner") {
      return (
        <Badge className="bg-energy/20 text-energy border-energy/30 gap-1 text-xs">
          <Crown className="h-3 w-3" />
          Owner
        </Badge>
      );
    }
    if (role === "admin") {
      return (
        <Badge className="bg-brand/20 text-brand border-brand/30 gap-1 text-xs">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Join Requests */}
      {isAdminOrOwner && joinRequests.length > 0 && (
        <Card className="border-energy/30 bg-energy/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-energy" />
              Pending Requests ({joinRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {joinRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background border"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={request.user.profilePicture || undefined} />
                    <AvatarFallback>
                      {request.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {request.user.name}
                    </p>
                    {request.user.handle && (
                      <p className="text-xs text-muted-foreground">
                        @{request.user.handle}
                      </p>
                    )}
                    {request.message && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        &ldquo;{request.message}&rdquo;
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {formatDistanceToNow(new Date(request.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2"
                      onClick={() =>
                        handleJoinRequest(request.id, "reject", request.user.name)
                      }
                      disabled={actionLoading === request.id}
                    >
                      {actionLoading === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 px-2 bg-success hover:bg-success/90"
                      onClick={() =>
                        handleJoinRequest(request.id, "approve", request.user.name)
                      }
                      disabled={actionLoading === request.id}
                    >
                      {actionLoading === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.profilePicture || undefined} />
                    <AvatarFallback>
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {member.name}
                      </p>
                      <RoleBadge role={member.role} />
                    </div>
                    {member.handle && (
                      <p className="text-xs text-muted-foreground">
                        @{member.handle}
                      </p>
                    )}
                  </div>
                  {/* Actions dropdown for admin/owner */}
                  {isAdminOrOwner && member.role !== "owner" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={actionLoading === member.id}
                        >
                          {actionLoading === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreVertical className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isOwner && (
                          <>
                            {member.role === "admin" ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleRoleChange(member.id, "member")
                                }
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Demote to Member
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleRoleChange(member.id, "admin")
                                }
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Promote to Admin
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {userRole === "admin" && member.role === "admin" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(member.id, "member")}
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Demote to Member
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() =>
                            handleRemoveMember(member.id, member.name)
                          }
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove from Rally
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Invite Links Section */}
      {isAdminOrOwner && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Invite Links
              </CardTitle>
              <Button
                size="sm"
                onClick={handleCreateInvite}
                disabled={actionLoading === "create-invite"}
              >
                {actionLoading === "create-invite" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Generate Link
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {invitations.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active invite links</p>
                <p className="text-xs mt-1">
                  Generate a link to invite new members
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {invitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm truncate">{invite.code}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {invite.role}
                        </Badge>
                        {invite.maxUses && (
                          <span className="text-xs text-muted-foreground">
                            {invite.uses}/{invite.maxUses} uses
                          </span>
                        )}
                        {invite.expiresAt && (
                          <span className="text-xs text-muted-foreground">
                            Expires{" "}
                            {formatDistanceToNow(new Date(invite.expiresAt), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() => handleCopyInvite(invite.url)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-destructive hover:text-destructive"
                      onClick={() => handleRevokeInvite(invite.id)}
                      disabled={actionLoading === invite.id}
                    >
                      {actionLoading === invite.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.action}
        variant={confirmDialog.variant}
        loading={actionLoading !== null}
      />
    </div>
  );
}

// ============================================================================
// EMBEDDED COMPONENT
// ============================================================================

export function MemberManagement({
  circleId,
  userRole,
}: MemberManagementProps) {
  return (
    <MemberManagementContent circleId={circleId} userRole={userRole} />
  );
}

// ============================================================================
// SHEET COMPONENT
// ============================================================================

export function MemberManagementSheet({
  open,
  onOpenChange,
  circleId,
  userRole,
}: MemberManagementSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] p-0">
        <div className="flex flex-col h-full">
          <div className="px-6 pt-6">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand" />
                Manage Members
              </SheetTitle>
              <SheetDescription>
                View members, manage roles, and handle join requests
              </SheetDescription>
            </SheetHeader>
          </div>
          <ScrollArea className="flex-1 px-6 py-4">
            <MemberManagementContent circleId={circleId} userRole={userRole} />
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
