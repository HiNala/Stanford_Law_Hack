import { cn } from "@/lib/utils";

type RiskLevel = "critical" | "high" | "medium" | "low";

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  className?: string;
}

const config: Record<RiskLevel, { dot: string; text: string; bg: string; border: string; label: string }> = {
  critical: {
    dot: "bg-[var(--risk-critical)]",
    text: "text-[var(--risk-critical)]",
    bg: "bg-[var(--risk-critical-bg)]",
    border: "border-[var(--risk-critical-border)]",
    label: "CRITICAL",
  },
  high: {
    dot: "bg-[var(--risk-high)]",
    text: "text-[var(--risk-high)]",
    bg: "bg-[var(--risk-high-bg)]",
    border: "border-[var(--risk-high-border)]",
    label: "HIGH",
  },
  medium: {
    dot: "bg-[var(--risk-medium)]",
    text: "text-[var(--risk-medium)]",
    bg: "bg-[var(--risk-medium-bg)]",
    border: "border-[var(--risk-medium-border)]",
    label: "MEDIUM",
  },
  low: {
    dot: "bg-[var(--risk-low)]",
    text: "text-[var(--risk-low)]",
    bg: "bg-[var(--risk-low-bg)]",
    border: "border-[var(--risk-low-border)]",
    label: "LOW",
  },
};

export default function RiskBadge({ level, score, className }: RiskBadgeProps) {
  const c = config[level] || config.low;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold",
        c.bg,
        c.border,
        c.text,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
      {score !== undefined && <span className="opacity-75">{score.toFixed(2)}</span>}
    </span>
  );
}
