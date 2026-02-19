"use client";

import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Share2, QrCode, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface QrInviteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circleName: string;
}

interface InviteData {
  code: string;
  url: string;
}

export function QrInvite({ open, onOpenChange, circleName }: QrInviteProps) {
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>("");

  const createInvite = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/circles/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "member", expiresInDays: 7 }),
      });
      if (!res.ok) throw new Error("Failed to create invite");
      const data = await res.json();
      setInvite({
        code: data.invitation.code,
        url: data.invitation.url,
      });
    } catch {
      toast.error("Failed to create invite link");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !invite && !loading) {
      createInvite();
    }
  }, [open, invite, loading, createInvite]);

  // Generate QR code SVG when invite URL changes
  useEffect(() => {
    if (!invite?.url) return;
    QRCode.toString(invite.url, {
      type: "svg",
      width: 200,
      margin: 0,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrSvg).catch(() => setQrSvg(""));
  }, [invite?.url]);

  const handleCopy = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleShare = async () => {
    if (!invite) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${circleName} on Repcir`,
          text: `I'm inviting you to join my circle "${circleName}" on Repcir!`,
          url: invite.url,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  const handleNewCode = () => {
    setInvite(null);
    setQrSvg("");
    createInvite();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh]">
        <SheetHeader className="text-left pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/20">
              <QrCode className="h-5 w-5 text-brand" />
            </div>
            <SheetTitle className="text-base">Invite to {circleName}</SheetTitle>
          </div>
          <SheetDescription className="text-sm">
            Share this QR code or link. Expires in 7 days.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : invite ? (
            <>
              {/* QR Code */}
              <div className="flex justify-center">
                <div
                  className="rounded-2xl bg-white p-4"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              </div>

              {/* Invite Code */}
              <div className="flex items-center justify-center gap-2">
                <Badge variant="secondary" className="text-base font-mono px-4 py-1.5">
                  {invite.code}
                </Badge>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied ? "Copied" : "Copy Link"}
                </Button>
                <Button
                  className="flex-1 bg-brand hover:bg-brand/90 text-brand-foreground"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>

              {/* New Code */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={handleNewCode}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Generate new code
              </Button>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
