"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  UserCheck,
  Clock,
  Check,
  Loader2,
  UserMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

export type ConnectionStatus =
  | "not_connected"    // No relationship
  | "pending_sent"     // Current user sent a request, waiting
  | "pending_received" // Other user sent a request to current user
  | "connected";       // Mutual connection

interface ConnectButtonProps {
  userId: string;
  userName: string;
  initialStatus: ConnectionStatus;
  onStatusChange?: (newStatus: ConnectionStatus) => void;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "minimal";
  className?: string;
}

// ============================================================================
// Connect Button Component
// ============================================================================

export function ConnectButton({
  userId,
  userName,
  initialStatus,
  onStatusChange,
  size = "default",
  variant = "default",
  className,
}: ConnectButtonProps) {
  const [status, setStatus] = useState<ConnectionStatus>(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [showUnfollow, setShowUnfollow] = useState(false);

  const updateStatus = (newStatus: ConnectionStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  };

  // Send connection request
  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: "POST",
      });

      if (response.ok) {
        updateStatus("pending_sent");
        toast.success(`Connection request sent to ${userName}`);
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to send request");
      }
    } catch (error) {
      console.error("Failed to connect:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send connection request");
    } finally {
      setIsLoading(false);
    }
  };

  // Accept incoming request
  const handleAccept = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: "POST",
      });

      if (response.ok) {
        updateStatus("connected");
        toast.success(`You are now connected with ${userName}`);
      } else {
        throw new Error("Failed to accept request");
      }
    } catch (error) {
      console.error("Failed to accept:", error);
      toast.error("Failed to accept connection request");
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel pending request or disconnect
  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: "DELETE",
      });

      if (response.ok) {
        updateStatus("not_connected");
        const message = status === "connected"
          ? `Disconnected from ${userName}`
          : "Connection request cancelled";
        toast.success(message);
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error) {
      console.error("Failed to disconnect:", error);
      toast.error("Failed to disconnect");
    } finally {
      setIsLoading(false);
      setShowUnfollow(false);
    }
  };

  // Get button configuration based on status
  const getButtonConfig = () => {
    switch (status) {
      case "not_connected":
        return {
          icon: UserPlus,
          label: "Connect",
          onClick: handleConnect,
          className: cn(
            variant === "default" && "bg-brand hover:bg-brand/90 text-brand-foreground",
            variant === "outline" && "border-brand text-brand hover:bg-brand/10",
            variant === "minimal" && "text-brand hover:bg-brand/10"
          ),
        };

      case "pending_sent":
        return {
          icon: Clock,
          label: "Pending",
          onClick: handleDisconnect,
          className: cn(
            "bg-muted text-muted-foreground hover:bg-muted/80",
            "border border-border"
          ),
        };

      case "pending_received":
        return {
          icon: Check,
          label: "Accept",
          onClick: handleAccept,
          className: cn(
            "bg-brand hover:bg-brand/90 text-brand-foreground",
            "ring-2 ring-brand/30 ring-offset-2 ring-offset-background"
          ),
        };

      case "connected":
        return {
          icon: showUnfollow ? UserMinus : UserCheck,
          label: showUnfollow ? "Disconnect" : "Connected",
          onClick: showUnfollow ? handleDisconnect : undefined,
          className: cn(
            showUnfollow
              ? "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20"
              : "bg-muted/50 text-foreground border border-border hover:bg-muted",
          ),
        };

      default:
        return {
          icon: UserPlus,
          label: "Connect",
          onClick: handleConnect,
          className: "bg-brand hover:bg-brand/90 text-brand-foreground",
        };
    }
  };

  const config = getButtonConfig();
  const Icon = config.icon;

  // Size configurations
  const sizeConfig = {
    sm: {
      button: "h-8 px-3 text-xs",
      icon: "h-3.5 w-3.5",
    },
    default: {
      button: "h-9 px-4 text-sm",
      icon: "h-4 w-4",
    },
    lg: {
      button: "h-10 px-5 text-base",
      icon: "h-5 w-5",
    },
  };

  const sizes = sizeConfig[size];

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Button
        onClick={config.onClick}
        disabled={isLoading || (status === "connected" && !showUnfollow)}
        onMouseEnter={() => status === "connected" && setShowUnfollow(true)}
        onMouseLeave={() => setShowUnfollow(false)}
        className={cn(
          sizes.button,
          "relative overflow-hidden transition-all duration-200",
          config.className,
          className
        )}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={isLoading ? "loading" : status + (showUnfollow ? "-unfollow" : "")}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5"
          >
            {isLoading ? (
              <Loader2 className={cn(sizes.icon, "animate-spin")} />
            ) : (
              <Icon className={sizes.icon} />
            )}
            <span>{isLoading ? "..." : config.label}</span>
          </motion.span>
        </AnimatePresence>

        {/* Success animation for accepting */}
        {status === "connected" && !showUnfollow && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute right-2"
          >
            <div className="h-2 w-2 rounded-full bg-success" />
          </motion.div>
        )}
      </Button>
    </motion.div>
  );
}

// ============================================================================
// Compact Connect Button (icon only)
// ============================================================================

interface CompactConnectButtonProps {
  userId: string;
  userName: string;
  initialStatus: ConnectionStatus;
  onStatusChange?: (newStatus: ConnectionStatus) => void;
  className?: string;
}

export function CompactConnectButton({
  userId,
  userName,
  initialStatus,
  onStatusChange,
  className,
}: CompactConnectButtonProps) {
  const [status, setStatus] = useState<ConnectionStatus>(initialStatus);
  const [isLoading, setIsLoading] = useState(false);

  const updateStatus = (newStatus: ConnectionStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  };

  const handleClick = async () => {
    setIsLoading(true);

    try {
      switch (status) {
        case "not_connected":
        case "pending_received": {
          const response = await fetch(`/api/users/${userId}/follow`, {
            method: "POST",
          });
          if (response.ok) {
            const newStatus = status === "pending_received" ? "connected" : "pending_sent";
            updateStatus(newStatus);
            toast.success(
              newStatus === "connected"
                ? `Connected with ${userName}`
                : `Request sent to ${userName}`
            );
          }
          break;
        }
        case "pending_sent":
        case "connected": {
          const response = await fetch(`/api/users/${userId}/follow`, {
            method: "DELETE",
          });
          if (response.ok) {
            updateStatus("not_connected");
            toast.success(
              status === "connected"
                ? `Disconnected from ${userName}`
                : "Request cancelled"
            );
          }
          break;
        }
      }
    } catch (error) {
      console.error("Connection action failed:", error);
      toast.error("Action failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = () => {
    if (isLoading) return Loader2;
    switch (status) {
      case "not_connected":
        return UserPlus;
      case "pending_sent":
        return Clock;
      case "pending_received":
        return Check;
      case "connected":
        return UserCheck;
    }
  };

  const Icon = getIcon();

  const getStyles = () => {
    switch (status) {
      case "not_connected":
        return "bg-brand/10 text-brand hover:bg-brand/20 border-brand/30";
      case "pending_sent":
        return "bg-muted text-muted-foreground hover:bg-muted/80 border-border";
      case "pending_received":
        return "bg-brand text-brand-foreground hover:bg-brand/90 ring-2 ring-brand/30";
      case "connected":
        return "bg-success/10 text-success hover:bg-destructive/10 hover:text-destructive border-success/30 hover:border-destructive/30";
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "h-9 w-9 rounded-full border flex items-center justify-center transition-all duration-200",
        getStyles(),
        className
      )}
    >
      <Icon className={cn("h-4 w-4", isLoading && "animate-spin")} />
    </motion.button>
  );
}

export default ConnectButton;
