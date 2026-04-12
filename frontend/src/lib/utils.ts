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

/** Map a risk level string to a Tailwind color class. */
export function riskColor(level: string | null | undefined): string {
  switch (level) {
    case "critical":
      return "text-red-600 bg-red-50 border-red-200";
    case "high":
      return "text-orange-600 bg-orange-50 border-orange-200";
    case "medium":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "low":
      return "text-green-600 bg-green-50 border-green-200";
    default:
      return "text-gray-500 bg-gray-50 border-gray-200";
  }
}

/** Map risk level to heatmap highlight color for the document viewer. */
export function riskHighlightColor(level: string | null | undefined): string {
  switch (level) {
    case "critical":
      return "bg-red-200/60";
    case "high":
      return "bg-orange-200/60";
    case "medium":
      return "bg-yellow-200/60";
    case "low":
      return "bg-green-100/40";
    default:
      return "";
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
