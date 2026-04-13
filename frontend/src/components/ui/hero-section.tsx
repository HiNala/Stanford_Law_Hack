"use client";

import React from "react";
import Link from "next/link";
import { Zap, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

export default function HeroSection() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    function onClickOutside(e: MouseEvent) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target as Node)) return;
      setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener("keydown", onKey);
      document.addEventListener("click", onClickOutside);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClickOutside);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-px" style={{ background: "var(--border-primary)" }} />

      {/* ── Navbar ── */}
      <nav
        className="relative z-20 flex items-center justify-between px-6 py-5 md:px-12 lg:px-20"
        style={{ borderBottom: "1px solid var(--border-primary)" }}
      >
        <Link href="/">
          <Logo size="md" />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-primary)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-secondary)")}
            >
              {label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm transition-colors px-4 py-2 rounded-lg"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
            }}
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-85"
            style={{ background: "var(--accent-primary)" }}
          >
            Try for Free
          </Link>
        </div>

        <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
          <button
            className="rounded-lg p-2 transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed inset-0 z-50 flex flex-col p-6"
          style={{ background: "var(--bg-primary)" }}
        >
          <div className="flex items-center justify-between mb-10">
            <Link href="/" onClick={() => setMenuOpen(false)}>
              <Logo size="md" />
            </Link>
            <button onClick={() => setMenuOpen(false)} className="rounded-lg p-2" style={{ color: "var(--text-secondary)" }} aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col gap-6">
            {NAV_LINKS.map(({ label, href }) => (
              <a key={label} href={href} className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }} onClick={() => setMenuOpen(false)}>
                {label}
              </a>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-3">
            <Link href="/login" className="w-full text-center rounded-xl border py-3 text-sm font-medium" style={{ borderColor: "var(--border-secondary)", color: "var(--text-primary)" }} onClick={() => setMenuOpen(false)}>
              Sign In
            </Link>
            <Link href="/login" className="w-full text-center rounded-xl py-3 text-sm font-semibold text-white" style={{ background: "var(--accent-primary)" }} onClick={() => setMenuOpen(false)}>
              Try for Free
            </Link>
          </div>
        </div>
      )}

      {/* ── Hero body ── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 items-center gap-16 px-6 pt-20 pb-28 md:px-12 lg:px-20 max-w-6xl mx-auto">

        {/* Left — copy */}
        <div className="flex flex-col items-start">
          <a
            href="#features"
            className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors"
            style={{ borderColor: "var(--border-secondary)", background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--border-secondary)")}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent-primary)" }} />
            Verified legal citations via TrustFoundry
            <span style={{ color: "var(--accent-primary)" }}>→</span>
          </a>

          <h1 className="font-display text-5xl leading-tight md:text-6xl" style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}>
            See risk before<br />
            <em style={{ color: "var(--accent-primary)", fontStyle: "italic" }}>it sees you.</em>
          </h1>

          <p className="mt-5 text-lg leading-relaxed" style={{ color: "var(--text-secondary)", maxWidth: "44ch" }}>
            AI analyzes every clause in your contracts — scoring risk, surfacing verified legal citations, and answering your questions in plain English.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-start gap-3.5">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85"
              style={{ background: "var(--accent-primary)" }}
            >
              <Zap className="h-4 w-4" />
              Try Demo — Free
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-medium transition-colors"
              style={{ borderColor: "var(--border-secondary)", color: "var(--text-secondary)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-secondary)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
              }}
            >
              See how it works
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            {["No credit card required", "PDF, DOCX, TXT supported", "Under 60 seconds"].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--risk-low)" }} />
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — product preview */}
        <HeatmapPreview />
      </div>
    </section>
  );
}

// ── Static heatmap product preview ────────────────────────────────────────────
const PREVIEW_CLAUSES = [
  { heading: "Section 9 — Indemnification", risk: "critical" as const, score: "97%", text: "Client shall defend and indemnify Provider from any and all claims. Provider's indemnification obligations are expressly excluded." },
  { heading: "Section 12.3 — Change of Control", risk: "critical" as const, score: "91%", text: "Upon any Change of Control of Client, Provider may terminate upon five (5) days' written notice with immediate fee acceleration." },
  { heading: "Section 11 — Auto-Renewal", risk: "high" as const, score: "84%", text: "Agreement renews automatically unless cancelled no later than fifteen (15) days prior to the end of the then-current term." },
  { heading: "Section 9.2 — Liability Cap", risk: "high" as const, score: "78%", text: "Provider's total liability shall not exceed the greater of fees paid in the preceding 3 months or One Thousand Dollars ($1,000)." },
  { heading: "Section 14 — Data Privacy", risk: "high" as const, score: "76%", text: "Provider may use aggregated Customer Data for product improvement and marketing purposes per its Privacy Policy." },
  { heading: "Section 2 — License Grant", risk: "low" as const, score: "12%", text: "Provider grants Client a non-exclusive, non-transferable license to access the Service solely for internal business purposes." },
];

const RISK_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#EAB308",
  low: "#22C55E",
};

function HeatmapPreview() {
  const [selected, setSelected] = React.useState<number | null>(null);

  return (
    <div
      className="hidden lg:flex flex-col rounded-xl border overflow-hidden"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border-primary)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        maxHeight: "480px",
      }}
    >
      {/* Window chrome */}
      <div
        className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border-primary)", background: "var(--bg-primary)" }}
      >
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#FF5F57" }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#FFBD2E" }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#28C840" }} />
        </div>
        <span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>GlobalSupply Vendor MSA</span>
        <span className="rounded px-2 py-0.5 text-xs font-semibold" style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}>
          CRITICAL · 91%
        </span>
      </div>

      {/* Clause blocks */}
      <div className="overflow-y-auto p-3 space-y-1.5 flex-1 legal-doc">
        {PREVIEW_CLAUSES.map((clause, i) => {
          const color = RISK_COLORS[clause.risk];
          const isSelected = selected === i;
          return (
            <div
              key={i}
              onClick={() => setSelected(isSelected ? null : i)}
              className="cursor-pointer rounded-lg px-3 py-2.5 transition-all duration-150"
              style={{
                borderLeft: `3px solid ${color}`,
                background: isSelected ? `${color}18` : `${color}08`,
                boxShadow: isSelected ? `inset 0 0 0 1px ${color}25` : "none",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold uppercase tracking-wide" style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>
                  {clause.heading}
                </span>
                <span className="text-xs font-bold" style={{ color }}>{clause.score}</span>
              </div>
              <p style={{ fontSize: "11.5px", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                {isSelected ? clause.text : clause.text.slice(0, 90) + "…"}
              </p>
            </div>
          );
        })}
      </div>

      <div
        className="flex items-center justify-between px-4 py-2 shrink-0 text-xs"
        style={{ borderTop: "1px solid var(--border-primary)", color: "var(--text-tertiary)" }}
      >
        <span>6 clauses analyzed · 28 sec</span>
        <span style={{ color: "var(--risk-low)" }}>✓ TrustFoundry verified</span>
      </div>
    </div>
  );
}
