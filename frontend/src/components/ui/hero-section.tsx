"use client";

import React from "react";
import Link from "next/link";
import { Shield, Menu, X } from "lucide-react";
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
    <section className="relative w-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* ── Gooey SVG filter ── */}
      <GooeyFilter id="gooey-hero-trail" strength={6} />

      {/* ── Atmospheric background image ── */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1618044733300-9472054094ee?w=1600&auto=format&fit=crop&q=80"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          style={{ opacity: 0.08 }}
        />
        {/* Vignette gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, var(--bg-primary) 100%)",
          }}
        />
      </div>

      {/* ── Pixel trail layer ── */}
      <div
        className="absolute inset-0 z-10"
        style={{ filter: "url(#gooey-hero-trail)" }}
      >
        <PixelTrail
          pixelSize={screenSize.lessThan("md") ? 20 : 28}
          fadeDuration={600}
          delay={0}
          pixelClassName="bg-white/25"
        />
      </div>

      {/* ── Subtle top border highlight ── */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-px z-20"
        style={{ background: "var(--border-primary)" }}
      />

      {/* ── Navbar ── */}
      <nav
        className="relative z-30 flex items-center justify-between px-6 py-5 md:px-12 lg:px-20"
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
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "var(--text-primary)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "var(--text-secondary)")
              }
            >
              {label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
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

        {/* Mobile: theme toggle + hamburger */}
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

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed inset-0 z-50 flex flex-col p-6"
          style={{ background: "var(--bg-primary)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center justify-between mb-10">
            <Link href="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: "var(--accent-primary)" }}
              >
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                ClauseGuard
              </span>
            </Link>
            <button
              onClick={() => setMenuOpen(false)}
              className="rounded-lg p-2"
              style={{ color: "var(--text-secondary)" }}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col gap-6">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-2xl font-semibold"
                style={{ color: "var(--text-primary)" }}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </a>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-3">
            <Link
              href="/login"
              className="w-full text-center rounded-xl border py-3 text-sm font-medium"
              style={{ borderColor: "var(--border-secondary)", color: "var(--text-primary)" }}
              onClick={() => setMenuOpen(false)}
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="w-full text-center rounded-xl py-3 text-sm font-semibold text-white"
              style={{ background: "var(--accent-primary)" }}
              onClick={() => setMenuOpen(false)}
            >
              Try for Free
            </Link>
          </div>
        </div>
      )}

      {/* ── Hero body — full-width centered ── */}
      <div className="relative z-20 flex flex-col items-center justify-center text-center px-6 pt-28 pb-36 md:pt-36 md:pb-44 min-h-[75vh]">

        {/* Announcement pill */}
        <a
          href="#features"
          className="mb-10 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors backdrop-blur-sm"
          style={{
            borderColor: "var(--border-secondary)",
            background: "color-mix(in srgb, var(--bg-secondary) 70%, transparent)",
            color: "var(--text-secondary)",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.borderColor = "var(--border-secondary)")
          }
        >
          <span
            className="h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ background: "var(--accent-primary)" }}
          />
          Verified legal citations via TrustFoundry
          <span style={{ color: "var(--accent-primary)" }}>→</span>
        </a>

        {/* Headline */}
        <h1
          className="font-display text-6xl leading-tight md:text-7xl lg:text-8xl max-w-4xl"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}
        >
          See risk before
          <br />
          <em style={{ color: "var(--accent-primary)", fontStyle: "italic" }}>
            it sees you.
          </em>
        </h1>

        {/* Sub-headline */}
        <p
          className="mt-7 text-lg md:text-xl leading-relaxed max-w-xl"
          style={{ color: "var(--text-secondary)" }}
        >
          AI-powered contract analysis that colors every clause by risk, cites
          actual statutes, and answers your questions in plain English.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg px-7 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-85"
            style={{ background: "var(--accent-primary)" }}
          >
            <Shield className="h-4 w-4" />
            Try Demo — Free
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-lg border px-7 py-3.5 text-sm font-medium transition-colors backdrop-blur-sm"
            style={{
              borderColor: "var(--border-secondary)",
              color: "var(--text-secondary)",
              background: "color-mix(in srgb, var(--bg-secondary) 50%, transparent)",
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
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
          {[
            "No credit card required",
            "PDF, DOCX, TXT supported",
            "Under 60 seconds",
          ].map((t) => (
            <div key={t} className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--risk-low)" }}
              />
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {t}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
