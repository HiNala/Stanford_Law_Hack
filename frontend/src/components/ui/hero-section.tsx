"use client";

import React from "react";
import Link from "next/link";
import { Zap, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { GooeyFilter } from "@/components/ui/gooey-filter";
import { PixelTrail } from "@/components/ui/pixel-trail";
import { useScreenSize } from "@/hooks/use-screen-size";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

export default function HeroSection() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const screenSize = useScreenSize();

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

      {/* ── Interactive pixel trail — follows cursor, gooey SVG filter applied ── */}
      <GooeyFilter id="gooey-hero-trail" strength={6} />
      {/* z-[1] keeps the trail below all interactive elements (nav z-20, body z-10) */}
      <div
        className="absolute inset-0 z-[1]"
        style={{ filter: "url(#gooey-hero-trail)" }}
      >
        <PixelTrail
          pixelSize={screenSize.lessThan("md") ? 18 : 26}
          fadeDuration={600}
          delay={0}
          pixelClassName="bg-white/[0.14]"
        />
      </div>

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
          {/* Hackathon badge + TrustFoundry row */}
          <div className="mb-8 flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
              style={{ borderColor: "rgba(21,96,252,0.35)", background: "rgba(21,96,252,0.08)", color: "var(--accent-primary)" }}
            >
              🏆 LLM × Law Hackathon #6
            </span>
            <a
              href="#features"
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
              style={{ borderColor: "var(--border-secondary)", background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--border-secondary)")}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--risk-low)" }} />
              Verified via TrustFoundry
            </a>
          </div>

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
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all"
              style={{ background: "linear-gradient(135deg, #1560FC, #0F4DD6)", boxShadow: "0 4px 16px rgba(21,96,252,0.35)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(21,96,252,0.5)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(21,96,252,0.35)"; }}
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
            {["No credit card required", "PDF, DOCX, TXT supported", "Under 30 seconds"].map((t) => (
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
  {
    heading: "Section 9 — Indemnification",
    risk: "critical" as const,
    score: 97,
    text: "Client shall defend and indemnify Provider from any and all claims, damages, losses, and expenses including attorneys' fees. Provider's indemnification obligations are expressly excluded.",
    analysis: "One-sided indemnification — Client bears unlimited exposure. Market standard requires mutual indemnification capped at contract value.",
    suggestion: "Add mutual indemnification and a cap tied to 12-month fees paid.",
  },
  {
    heading: "Section 12.3 — Change of Control",
    risk: "critical" as const,
    score: 91,
    text: "Upon any Change of Control of Client, Provider may terminate this Agreement upon five (5) days' written notice with immediate fee acceleration.",
    analysis: "5-day notice with fee acceleration upon M&A is extremely onerous. Standard is 30-90 days with no penalty.",
    suggestion: "Negotiate 60-day notice and remove fee acceleration.",
  },
  {
    heading: "Section 11 — Auto-Renewal",
    risk: "high" as const,
    score: 84,
    text: "Agreement renews automatically unless cancelled no later than fifteen (15) days prior to the end of the then-current term.",
    analysis: "15-day cancellation window is unusually short. Industry standard is 30-90 days to allow time for renewal decisions.",
    suggestion: "Require minimum 60 days written notice for non-renewal.",
  },
  {
    heading: "Section 9.2 — Liability Cap",
    risk: "high" as const,
    score: 78,
    text: "Provider's total liability shall not exceed the greater of fees paid in the preceding 3 months or One Thousand Dollars ($1,000).",
    analysis: "$1,000 liability floor is inadequate for enterprise SaaS. This effectively caps recovery at 3 months of fees.",
    suggestion: "Cap at 12 months of fees paid, minimum $50,000.",
  },
  {
    heading: "Section 2 — License Grant",
    risk: "low" as const,
    score: 12,
    text: "Provider grants Client a non-exclusive, non-transferable license to access the Service solely for internal business purposes during the Term.",
    analysis: "Standard SaaS license grant. No unusual restrictions identified.",
    suggestion: null,
  },
];

const RISK_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#EAB308",
  low: "#22C55E",
};

const RISK_BG: Record<string, string> = {
  critical: "rgba(239,68,68,0.15)",
  high: "rgba(249,115,22,0.15)",
  medium: "rgba(234,179,8,0.18)",
  low: "rgba(34,197,94,0.10)",
};

function HeatmapPreview() {
  const [selected, setSelected] = React.useState<number>(0);
  const clause = PREVIEW_CLAUSES[selected];
  const color = RISK_COLORS[clause.risk];

  return (
    <div
      className="hidden lg:flex flex-col rounded-2xl border overflow-hidden"
      style={{
        background: "#0D1117",
        borderColor: "rgba(255,255,255,0.08)",
        boxShadow: "0 8px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
        height: "500px",
      }}
    >
      {/* Window chrome */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#080B0F" }}
      >
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#FF5F57" }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#FFBD2E" }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#28C840" }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>GlobalSupply Vendor MSA</span>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444" }}>
            CRITICAL · 91%
          </span>
        </div>
        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>clauseguard.ai</span>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — document with highlights */}
        <div
          className="w-[55%] overflow-y-auto border-r p-4"
          style={{ background: "#F8F7F4", borderColor: "rgba(0,0,0,0.1)" }}
        >
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "#9CA3AF" }}>
            CONTRACT DOCUMENT
          </p>
          <p className="text-[11px] font-bold mb-3" style={{ fontFamily: "Georgia, serif", color: "#0A0A0A" }}>
            GlobalSupply Vendor MSA
          </p>
          <div className="space-y-0.5">
            {PREVIEW_CLAUSES.map((c, i) => {
              const isSelected = selected === i;
              const cl = RISK_COLORS[c.risk];
              const bg = RISK_BG[c.risk];
              const noHL = c.risk === "low" && !isSelected;
              return (
                <div
                  key={i}
                  onClick={() => setSelected(i)}
                  className="cursor-pointer"
                >
                  {i === 0 || PREVIEW_CLAUSES[i - 1].heading.split("—")[0] !== c.heading.split("—")[0] ? (
                    <p className="mt-3 mb-1 text-[9px] font-bold" style={{ color: "#374151", fontFamily: "Georgia, serif" }}>
                      {c.heading}
                    </p>
                  ) : null}
                  <div className="flex">
                    <div className="w-0.5 shrink-0 mr-1.5 rounded-full self-stretch" style={{ background: noHL ? "transparent" : cl, opacity: isSelected ? 1 : 0.5, minHeight: "1em" }} />
                    <p
                      className="text-[10.5px] leading-[1.7] py-0.5 px-0.5 rounded transition-colors"
                      style={{
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        color: "#111827",
                        background: isSelected ? bg : noHL ? "transparent" : `${cl}0d`,
                        outline: isSelected ? `1.5px solid ${cl}40` : "none",
                        outlineOffset: "1px",
                      }}
                    >
                      {c.text.slice(0, 100)}{c.text.length > 100 ? "…" : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-2 flex flex-wrap gap-1" style={{ borderTop: "1px solid #E5E7EB" }}>
            {(["critical","high","medium","low"] as const).map((lvl) => {
              const ct = PREVIEW_CLAUSES.filter(c => c.risk === lvl).length;
              if (!ct) return null;
              return (
                <span key={lvl} className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ background: `${RISK_COLORS[lvl]}18`, color: RISK_COLORS[lvl] }}>
                  {ct} {lvl}
                </span>
              );
            })}
          </div>
        </div>

        {/* Right — analysis panel */}
        <div className="w-[45%] overflow-y-auto p-3 flex flex-col gap-2.5">
          {/* Selected clause detail */}
          <div className="rounded-xl p-3" style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border" style={{ color, background: `${color}15`, borderColor: `${color}35` }}>
                <span className="h-1 w-1 rounded-full" style={{ background: color }} />
                {clause.risk}
              </span>
              <span className="text-[10px] font-bold tabular-nums" style={{ color }}>{clause.score}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="h-full rounded-full" style={{ width: `${clause.score}%`, background: color }} />
            </div>
            <p className="text-[9px] font-semibold uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Analysis</p>
            <p className="text-[10px] leading-[1.6]" style={{ color: "rgba(255,255,255,0.75)" }}>{clause.analysis}</p>
          </div>

          {clause.suggestion && (
            <div className="rounded-xl p-3" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.20)" }}>
              <p className="text-[9px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#22C55E" }}>✦ Suggested Fix</p>
              <p className="text-[10px] leading-[1.6]" style={{ color: "rgba(255,255,255,0.65)" }}>{clause.suggestion}</p>
            </div>
          )}

          {/* TrustFoundry badge */}
          <div className="rounded-xl p-2.5 flex items-center gap-2" style={{ background: "rgba(21,96,252,0.10)", border: "1px solid rgba(21,96,252,0.20)" }}>
            <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(21,96,252,0.25)" }}>
              <span className="text-[8px] font-bold" style={{ color: "#1560FC" }}>TF</span>
            </div>
            <p className="text-[9px] leading-[1.4]" style={{ color: "rgba(255,255,255,0.5)" }}>
              <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>TrustFoundry verified</span> — matched against 14M+ US laws & cases
            </p>
          </div>

          {/* Mini clause list */}
          <div className="space-y-1 mt-1">
            {PREVIEW_CLAUSES.filter((_, i) => i !== selected).map((c, i) => (
              <button
                key={i}
                onClick={() => setSelected(PREVIEW_CLAUSES.indexOf(c))}
                className="w-full text-left rounded-lg px-2.5 py-2 flex items-center gap-2 transition-colors"
                style={{ background: "rgba(255,255,255,0.04)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)")}
              >
                <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: RISK_COLORS[c.risk] }} />
                <span className="text-[9px] flex-1 truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{c.heading}</span>
                <span className="text-[9px] font-bold shrink-0" style={{ color: RISK_COLORS[c.risk] }}>{c.score}%</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-between px-4 py-2 shrink-0 text-[9px]"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)" }}
      >
        <span>{PREVIEW_CLAUSES.length} clauses · 24 sec · GPT-4o + TrustFoundry</span>
        <span style={{ color: "#22C55E" }}>● Live demo</span>
      </div>
    </div>
  );
}
