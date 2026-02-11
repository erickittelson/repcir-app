"use client";

import { useState, useRef, useEffect } from "react";
import { authClient } from "@/lib/neon-auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

interface VerifyEmailCodeProps {
  email: string;
  onVerified?: () => void;
  onBack?: () => void;
}

export function VerifyEmailCode({ email, onVerified, onBack }: VerifyEmailCodeProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 6) return;
    setVerifying(true);
    setError("");
    try {
      await authClient.emailOtp.verifyEmail({
        email,
        otp: code,
      });
      setVerified(true);
      if (onVerified) {
        onVerified();
      } else {
        router.push("/login");
      }
    } catch {
      setError("Invalid or expired code. Please try again.");
      setCode("");
      inputRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    setResent(false);
    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      setResent(true);
    } catch {
      setError("Could not resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (verified) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto" />
        <div>
          <h3 className="text-lg font-semibold">Email verified</h3>
          <p className="text-sm text-muted-foreground mt-1">Redirecting you to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Mail className="h-10 w-10 text-muted-foreground mx-auto" />
        <h3 className="text-lg font-semibold">Check your email</h3>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <Input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Enter 6-digit code"
          value={code}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(val);
          }}
          className="text-center text-2xl tracking-[0.5em] font-mono"
          maxLength={6}
        />
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
        <Button type="submit" className="w-full" disabled={verifying || code.length < 6}>
          {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Verify
        </Button>
      </form>

      <div className="text-center space-y-2">
        {resent ? (
          <p className="text-sm text-green-400">New code sent. Check your email.</p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors disabled:opacity-50"
          >
            {resending ? "Sending..." : "Didn't get a code? Resend"}
          </button>
        )}
        {onBack && (
          <div>
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
