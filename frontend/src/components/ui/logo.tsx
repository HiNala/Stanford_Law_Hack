"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}

/**
 * ClauseGuard logo — stylised "C" with AI scan crosshair.
 * No external image dependency; renders inline SVG.
 */
export function Logo({ size = "md", showWordmark = true, className }: LogoProps) {
  const dims = { sm: 24, md: 32, lg: 44 }[size];
  const textSize = { sm: "text-sm", md: "text-base", lg: "text-xl" }[size];
  const gap = { sm: "gap-1.5", md: "gap-2", lg: "gap-3" }[size];

  return (
    <div className={cn("flex items-center", gap, className)}>
      <svg
        width={dims}
        height={dims}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Outer hexagonal "C" arc */}
        <path
          d="M22 4C12.059 4 4 12.059 4 22C4 31.941 12.059 40 22 40C27.636 40 32.665 37.472 36.069 33.453"
          stroke="#3B82F6"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Inner partial ring */}
        <path
          d="M22 11C15.925 11 11 15.925 11 22C11 28.075 15.925 33 22 33C25.381 33 28.41 31.534 30.527 29.19"
          stroke="#1D4ED8"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Crosshair center dot */}
        <circle cx="22" cy="22" r="2.5" fill="#3B82F6" />
        {/* Crosshair lines */}
        <line x1="22" y1="17" x2="22" y2="19.5" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="22" y1="24.5" x2="22" y2="27" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="17" y1="22" x2="19.5" y2="22" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="24.5" y1="22" x2="27" y2="22" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
        {/* Top-right accent mark */}
        <path
          d="M33 10L38 8L36 13"
          stroke="#60A5FA"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      {showWordmark && (
        <span
          className={cn("font-bold tracking-tight leading-none", textSize)}
          style={{
            background: "linear-gradient(135deg, var(--text-primary) 60%, #3B82F6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "-0.02em",
          }}
        >
          ClauseGuard
        </span>
      )}
    </div>
  );
}
