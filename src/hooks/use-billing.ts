"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { UsageSummary, PlanTier } from "@/lib/billing/types";

interface BillingState {
  data: UsageSummary | null;
  isLoading: boolean;
  error: string | null;
}

const PAYWALL_COOLDOWN_KEY = "repcir:paywall";
const MAX_PAYWALLS_PER_DAY = 2;

interface PaywallRecord {
  date: string;
  count: number;
  triggers: string[];
}

/**
 * Client hook for billing data and paywall management.
 *
 * Fetches /api/billing/status, provides plan/usage info,
 * and manages anti-annoyance paywall cooldowns.
 */
export function useBilling() {
  const [state, setState] = useState<BillingState>({
    data: null,
    isLoading: true,
    error: null,
  });
  const fetchedRef = useRef(false);

  const fetchBilling = useCallback(async () => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));
      const res = await fetch("/api/billing/status");
      if (!res.ok) throw new Error("Failed to fetch billing status");
      const data: UsageSummary = await res.json();
      setState({ data, isLoading: false, error: null });
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchBilling();
    }
  }, [fetchBilling]);

  /**
   * Check if we can show a paywall for a given trigger.
   * Anti-annoyance rules:
   * - Same trigger: max once per session
   * - Max 2 paywall impressions per day
   * - Never returns true during loading
   */
  const canShowPaywall = useCallback((trigger: string): boolean => {
    if (typeof window === "undefined") return false;

    try {
      const raw = localStorage.getItem(PAYWALL_COOLDOWN_KEY);
      const today = new Date().toISOString().split("T")[0];

      if (!raw) return true;

      const record: PaywallRecord = JSON.parse(raw);

      // Reset if different day
      if (record.date !== today) return true;

      // Max per day
      if (record.count >= MAX_PAYWALLS_PER_DAY) return false;

      // Same trigger already shown this session
      if (record.triggers.includes(trigger)) return false;

      return true;
    } catch {
      return true;
    }
  }, []);

  /**
   * Record that a paywall was shown for a trigger.
   */
  const recordPaywallShown = useCallback((trigger: string) => {
    if (typeof window === "undefined") return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const raw = localStorage.getItem(PAYWALL_COOLDOWN_KEY);
      let record: PaywallRecord = { date: today, count: 0, triggers: [] };

      if (raw) {
        const parsed: PaywallRecord = JSON.parse(raw);
        if (parsed.date === today) {
          record = parsed;
        }
      }

      record.count += 1;
      if (!record.triggers.includes(trigger)) {
        record.triggers.push(trigger);
      }

      localStorage.setItem(PAYWALL_COOLDOWN_KEY, JSON.stringify(record));
    } catch {
      // localStorage not available
    }
  }, []);

  // Convenience getters
  const tier: PlanTier = state.data?.tier || "free";
  const isPaid = tier !== "free";
  const isTrialing = state.data?.subscription.isTrialing || false;
  const isCanceling = state.data?.subscription.cancelAtPeriodEnd || false;
  const isPastDue = state.data?.subscription.status === "past_due";

  return {
    ...state,
    tier,
    isPaid,
    isTrialing,
    isCanceling,
    isPastDue,
    refetch: fetchBilling,
    canShowPaywall,
    recordPaywallShown,
  };
}
