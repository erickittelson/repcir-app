"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Check, AlertCircle, Loader2 } from "lucide-react";

interface SupportFormProps {
  userEmail?: string;
  userName?: string;
}

type FeedbackType = "feedback" | "bug" | "feature" | "support";

const feedbackTypes: { value: FeedbackType; label: string; description: string }[] = [
  { value: "feedback", label: "General Feedback", description: "Share your thoughts" },
  { value: "bug", label: "Bug Report", description: "Something's not working" },
  { value: "feature", label: "Feature Request", description: "Suggest an improvement" },
  { value: "support", label: "Support", description: "Get help with an issue" },
];

export function SupportForm({ userEmail, userName }: SupportFormProps) {
  const [type, setType] = useState<FeedbackType>("feedback");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(userEmail || "");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) {
      setStatus("error");
      setErrorMessage("Please fill in all fields");
      return;
    }

    if (!userEmail && !email.includes("@")) {
      setStatus("error");
      setErrorMessage("Please enter a valid email");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          subject,
          message,
          email: userEmail || email,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send message");
      }

      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
          className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Check className="w-8 h-8 text-green-500" />
        </motion.div>
        <h3 className="text-xl font-bold text-white mb-2">Message Sent</h3>
        <p className="text-white/60">
          We'll get back to you soon. Thanks for reaching out.
        </p>
        <button
          onClick={() => {
            setStatus("idle");
            setSubject("");
            setMessage("");
          }}
          className="mt-6 px-6 py-2 text-sm text-[var(--earned-gold)] border border-[var(--earned-gold)]/30 rounded-lg hover:bg-[var(--earned-gold)]/10 transition"
        >
          Send Another
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Feedback Type Selector */}
      <div>
        <label className="block text-sm font-medium text-white/60 mb-3">
          What can we help with?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {feedbackTypes.map((ft) => (
            <button
              key={ft.value}
              type="button"
              onClick={() => setType(ft.value)}
              className={`p-3 rounded-xl border text-left transition ${
                type === ft.value
                  ? "border-[var(--earned-gold)] bg-[var(--earned-gold)]/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <span className={`block text-sm font-medium ${
                type === ft.value ? "text-[var(--earned-gold)]" : "text-white"
              }`}>
                {ft.label}
              </span>
              <span className="block text-xs text-white/40 mt-0.5">
                {ft.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Email (only if not logged in) */}
      {!userEmail && (
        <div>
          <label className="block text-sm font-medium text-white/60 mb-2">
            Your Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--earned-gold)]/50 focus:border-[var(--earned-gold)]"
          />
        </div>
      )}

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-white/60 mb-2">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={
            type === "bug"
              ? "Describe the issue briefly"
              : type === "feature"
              ? "What would you like to see?"
              : "What's on your mind?"
          }
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--earned-gold)]/50 focus:border-[var(--earned-gold)]"
        />
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-white/60 mb-2">
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            type === "bug"
              ? "What happened? What did you expect to happen? Steps to reproduce..."
              : type === "feature"
              ? "Describe the feature and how it would help you..."
              : "Tell us more..."
          }
          rows={5}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--earned-gold)]/50 focus:border-[var(--earned-gold)] resize-none"
        />
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {status === "error" && errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4" />
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[var(--earned-gold)] text-[var(--repcir-black)] font-semibold rounded-xl hover:bg-[var(--earned-gold-light)] transition disabled:opacity-50"
      >
        {status === "loading" ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Send className="w-5 h-5" />
            Send Message
          </>
        )}
      </button>

      {userEmail && (
        <p className="text-xs text-white/40 text-center">
          Sending as {userName || userEmail}
        </p>
      )}
    </form>
  );
}
