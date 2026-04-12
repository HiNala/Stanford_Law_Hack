"use client";

import React from "react";
import Link from "next/link";
import { Shield, Menu, X } from "lucide-react";

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
      {/* Subtle top border highlight only — no glow blobs */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-px" style={{ background: "var(--border-primary)" }} />

      {/* ── Navbar ── */}
      <nav
        className="relative z-20 flex items-center justify-between px-6 py-5 md:px-12 lg:px-20"
        style={{ borderBottom: "1px solid var(--border-primary)" }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "var(--accent-primary)" }}
          >
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            ClauseGuard
          </span>
        </Link>

        {/* Desktop nav */}
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

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
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

        {/* Mobile hamburger */}
        <button
          className="md:hidden rounded-lg p-2 transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed inset-0 z-50 flex flex-col p-6"
          style={{ background: "var(--bg-primary)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center justify-between mb-10">
            <Link href="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--accent-primary)" }}>
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>ClauseGuard</span>
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
      <div className="relative z-10 flex flex-col items-start px-6 pt-24 pb-32 md:px-12 lg:px-20 max-w-6xl mx-auto">
        {/* Announcement pill */}
        <a
          href="#features"
          className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors"
          style={{
            borderColor: "var(--border-secondary)",
            background: "var(--bg-secondary)",
            color: "var(--text-secondary)",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--border-secondary)")}
        >
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "var(--accent-primary)" }} />
          New: Verified legal citations via TrustFoundry
          <span style={{ color: "var(--accent-primary)" }}>→</span>
        </a>

        {/* Headline */}
        <h1 className="font-display max-w-4xl text-5xl leading-tight md:text-7xl" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          See risk before<br />
          <em style={{ color: "var(--accent-primary)", fontStyle: "italic" }}>it sees you.</em>
        </h1>

        {/* Sub-headline */}
        <p
          className="mt-6 max-w-2xl text-lg leading-relaxed md:text-xl"
          style={{ color: "var(--text-secondary)" }}
        >
          ClauseGuard uses AI to analyze every clause in your contracts — scoring risk, surfacing legal citations, and letting you chat with your documents in seconds.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-start gap-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg px-7 py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-85"
            style={{ background: "var(--accent-primary)" }}
          >
            <Shield className="h-4 w-4" />
            Analyze a Contract Free
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-lg border px-7 py-3.5 text-base font-medium transition-colors"
            style={{
              borderColor: "var(--border-secondary)",
              color: "var(--text-secondary)",
            }}
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

        {/* Trust bar */}
        <div className="mt-12 flex flex-wrap items-center gap-6">
          {[
            "No credit card required",
            "PDF, DOCX, TXT supported",
            "Results in under 30 seconds",
          ].map((t) => (
            <div key={t} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--risk-low)" }} />
              <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
