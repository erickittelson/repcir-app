"use client";

/**
 * Motion Components - Re-exports from Framer Motion
 * 
 * Centralized exports for motion components with common animation variants.
 */

// Re-export motion components directly from framer-motion
// Next.js/Turbopack handles tree-shaking and code splitting
export { motion, AnimatePresence } from "framer-motion";

// Common animation variants for consistent animations across the app
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const slideIn = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};
