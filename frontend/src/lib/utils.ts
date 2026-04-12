/**
 * Utility functions used across the frontend.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely, deduplicating conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a risk score (0-1) as a percentage string. */
export function formatRiskPercent(score: number | null | undefined): string {
  if (score == null) return "N/A";
  return `${Math.round(score * 100)}%`;
}

/** Map a risk level string to dark-theme badge color classes. */
export function riskColor(level: string | null | undefined): string {
  switch (level?.toLowerCase()) {
    case "critical":
      return "text-red-400 bg-red-500/10 border-red-500/30";
    case "high":
      return "text-orange-400 bg-orange-500/10 border-orange-500/30";
    case "medium":
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/25";
    case "low":
      return "text-green-400 bg-green-500/8 border-green-500/20";
    default:
      return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
  }
}

/** Map risk level to a dot color class. */
export function riskDotColor(level: string | null | undefined): string {
  switch (level?.toLowerCase()) {
    case "critical": return "bg-red-500";
    case "high": return "bg-orange-500";
    case "medium": return "bg-yellow-500";
    case "low": return "bg-green-500";
    default: return "bg-zinc-500";
  }
}

/** Map risk level to heatmap highlight color classes for the document viewer. */
export function riskHighlightColor(level: string | null | undefined): string {
  switch (level?.toLowerCase()) {
    case "critical":
      return "bg-red-500/10 border-l-red-500";
    case "high":
      return "bg-orange-500/10 border-l-orange-500";
    case "medium":
      return "bg-yellow-500/8 border-l-yellow-500";
    case "low":
      return "bg-green-500/5 border-l-green-500";
    default:
      return "border-l-zinc-700";
  }
}

/** Return a raw CSS hex color for a risk level. */
export function riskHexColor(level: string | null | undefined): string {
  switch (level?.toLowerCase()) {
    case "critical": return "#EF4444";
    case "high": return "#F97316";
    case "medium": return "#EAB308";
    case "low": return "#22C55E";
    default: return "#71717A";
  }
}

/** Format file size in human-readable units. */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/** Format a date string to a locale-friendly format. */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Sleep helper for delays */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
