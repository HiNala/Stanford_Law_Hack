"use client";

import Link from "next/link";
import {
  Zap, MessageSquare, Search, BarChart3,
  CheckCircle2, ArrowRight, Scale, BookOpen,
} from "lucide-react";
import HeroSection from "@/components/ui/hero-section";
import { Logo } from "@/components/ui/logo";

// ─── Feature data ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Instant Risk Heatmaps",
    description:
      "Every clause color-coded by severity. Critical provisions flash red immediately — you see what matters in seconds, not hours.",
    accent: "var(--risk-critical)",
  },
  {
    icon: <MessageSquare className="h-5 w-5" />,
    title: "Chat With Your Contract",
    description:
      "Ask plain-English questions. Our AI has read every clause and streams answers with specific evidence cited from the document.",
    accent: "var(--accent-primary)",
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Semantic Clause Search",
    description:
      "Search across your entire portfolio by meaning. Find every indemnification clause or change-of-control provision instantly.",
    accent: "#0EA5E9",
  },
  {
    icon: <Scale className="h-5 w-5" />,
    title: "Verified Legal Citations",
    description:
      "Risky clauses are matched against 14M+ US laws and cases via TrustFoundry. Every finding grounded in real statute.",
    accent: "var(--risk-low)",
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Portfolio Intelligence",
    description:
      "Cross-document pattern detection surfaces systemic risks across your entire contract portfolio — not just individual files.",
    accent: "var(--risk-high)",
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: "Due Diligence Reports",
    description:
      "One click generates a professional PDF-ready memo with critical findings, market benchmarks, and recommended negotiation language.",
    accent: "var(--risk-medium)",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Upload your contract",
    description: "Drop any PDF, DOCX, or TXT. We extract and chunk the text in under 5 seconds.",
  },
  {
    step: "02",
    title: "AI analyzes every clause",
    description: "GPT-4o scores each clause across 25 legal categories — risk level, market comparison, and worst-case exposure.",
  },
  {
    step: "03",
    title: "Review the heatmap",
    description: "Your document lights up. Click any clause to see its full analysis, legal citations, and safer alternative language.",
  },
  {
    step: "04",
    title: "Chat, search, export",
    description: "Ask questions, search by meaning across your portfolio, and download a professional due-diligence report.",
  },
];

const TESTIMONIALS = [
  {
    quote: "We reviewed a 47-page MSA in 3 minutes. ClauseGuard caught an uncapped indemnification clause our junior associate missed.",
    name: "Sarah Chen",
    title: "Partner, M&A Practice",
    initials: "SC",
    accent: "#1560FC",
  },
    {
    quote: "The semantic search across our SaaS portfolio found 12 non-standard auto-renewal clauses we had no idea existed.",
    name: "Marcus Webb",
    title: "General Counsel, Series B Startup",
    initials: "MW",
    accent: "#0EA5E9",
  },
  {
    quote: "The verified legal citations next to each flagged clause is what separates this from every other contract tool I've tried.",
    name: "Priya Nair",
    title: "Legal Operations Lead",
    initials: "PN",
    accent: "#22C55E",
  },
];

// ─── Marketing Home Page ──────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* ── Hero ── */}
      <HeroSection />

      {/* ── Features ── */}
      <section id="features" className="px-6 py-24 md:px-12 lg:px-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--accent-primary)" }}>
              Capabilities
            </p>
            <h2 className="font-display text-4xl md:text-5xl leading-tight" style={{ color: "var(--text-primary)" }}>
              Contract intelligence, end&#8209;to&#8209;end.
            </h2>
            <p className="mt-5 text-lg max-w-lg" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              From first upload to final signature, every risk is visible before it costs you.
            </p>
          </div>

          {/* Asymmetric 2-col layout — avoids identical card grid anti-pattern */}
          <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
            {FEATURES.map(({ icon, title, description, accent }, i) => (
              <div
                key={title}
                className="flex gap-4 p-6 transition-colors duration-200"
                style={{
                  borderTop: i >= 2 ? "1px solid var(--border-primary)" : undefined,
                  borderRight: i % 2 === 0 ? "1px solid var(--border-primary)" : undefined,
                  borderBottom: i < 4 ? "1px solid var(--border-primary)" : undefined,
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = `${accent}07`)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                {/* Icon inline with content — no stacked tile */}
                <div className="shrink-0 mt-0.5" style={{ color: accent }}>
                  {icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", maxWidth: "38ch" }}>
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section
        id="how-it-works"
        className="px-6 py-24 md:px-12 lg:px-20"
        style={{ borderTop: "1px solid var(--border-primary)", borderBottom: "1px solid var(--border-primary)" }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--accent-primary)" }}>
              How it works
            </p>
            <h2 className="font-display text-4xl md:text-5xl leading-tight" style={{ color: "var(--text-primary)" }}>
              From upload to insight in 30 seconds.
            </h2>
            <p className="mt-5 text-lg" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              No training. No configuration. Just drop your contract and go.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map(({ step, title, description }, i) => (
              <div key={step} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div
                    className="hidden lg:block absolute top-5 left-full w-full h-px -translate-x-4"
                    style={{ background: "var(--border-primary)" }}
                  />
                )}
                {/* Solid step number — no gradient text */}
                <div
                  className="text-sm font-semibold tabular-nums mb-4 inline-flex items-center justify-center h-8 w-8 rounded-full"
                  style={{ background: "var(--bg-tertiary)", color: "var(--accent-primary)", border: "1px solid var(--border-secondary)" }}
                >
                  {i + 1}
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", maxWidth: "30ch" }}>
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="px-6 py-24 md:px-12 lg:px-20">
        <div className="mx-auto max-w-6xl">
          {/* Stats row — solid text, no gradient numbers */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 mb-16"
            style={{ borderBottom: "1px solid var(--border-primary)" }}
          >
            {[
              { value: "14M+", label: "Laws & cases indexed" },
              { value: "25", label: "Clause categories scored" },
              { value: "<30s", label: "Average analysis time" },
              { value: "100%", label: "Clause coverage" },
            ].map(({ value, label }, i) => (
              <div
                key={label}
                className="py-8 px-6"
                style={{ borderRight: i < 3 ? "1px solid var(--border-primary)" : undefined }}
              >
                <p className="font-display text-4xl mb-1" style={{ color: "var(--text-primary)" }}>{value}</p>
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>{label}</p>
              </div>
            ))}
          </div>

          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--accent-primary)" }}>What people say</p>
            <h2 className="font-display text-3xl md:text-4xl" style={{ color: "var(--text-primary)" }}>
              Trusted by legal teams moving fast.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-px md:grid-cols-3" style={{ border: "1px solid var(--border-primary)" }}>
            {TESTIMONIALS.map(({ quote, name, title, initials, accent }) => (
              <div
                key={name}
                className="p-8 flex flex-col"
                style={{ background: "var(--bg-secondary)" }}
              >
                <p className="text-base leading-relaxed flex-1 mb-8" style={{ color: "var(--text-secondary)", maxWidth: "40ch" }}>
                  &ldquo;{quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
                    style={{ background: accent }}
                  >
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{name}</p>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section
        id="pricing"
        className="px-6 py-24 md:px-12 lg:px-20"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <div className="mx-auto max-w-4xl">
          <div className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--accent-primary)" }}>Pricing</p>
            <h2 className="font-display text-4xl md:text-5xl" style={{ color: "var(--text-primary)" }}>
              Simple pricing.
            </h2>
            <p className="mt-4 text-lg" style={{ color: "var(--text-secondary)" }}>
              Start free. Scale as your practice grows.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              {
                name: "Free",
                price: "$0",
                period: "forever",
                description: "For solo practitioners and students exploring AI-powered review.",
                features: ["5 contracts / month", "Risk heatmap", "AI clause chat", "PDF export"],
                cta: "Get Started Free",
                highlight: false,
              },
              {
                name: "Pro",
                price: "$49",
                period: "per month",
                description: "For legal professionals who review contracts regularly.",
                features: ["Unlimited contracts", "Verified legal citations", "Portfolio intelligence", "Semantic search", "Due diligence reports", "Priority support"],
                cta: "Start Pro Trial",
                highlight: true,
              },
              {
                name: "Team",
                price: "Custom",
                period: "contact us",
                description: "For law firms and legal departments with custom workflows.",
                features: ["Everything in Pro", "Team workspaces", "SSO & audit logs", "API access", "Custom integrations", "Dedicated success manager"],
                cta: "Talk to Sales",
                highlight: false,
              },
            ].map(({ name, price, period, description, features, cta, highlight }) => (
              <div
                key={name}
                className="rounded-2xl border p-7 flex flex-col relative"
                style={{
                  background: highlight ? "var(--accent-muted)" : "var(--bg-secondary)",
                  borderColor: highlight ? "var(--accent-primary)" : "var(--border-primary)",
                  boxShadow: "none",
                }}
              >
                {highlight && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold text-white"
                    style={{ background: "var(--accent-primary)" }}
                  >
                    Most Popular
                  </div>
                )}
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>{name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black" style={{ color: "var(--text-primary)" }}>{price}</span>
                    <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>/{period}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{description}</p>
                </div>

                <ul className="space-y-2.5 flex-1 mb-7">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--risk-low)" }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className="block w-full text-center rounded-xl py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{
                    background: highlight ? "var(--accent-primary)" : "var(--bg-tertiary)",
                    color: highlight ? "#fff" : "var(--text-primary)",
                    border: highlight ? "none" : "1px solid var(--border-secondary)",
                  }}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section
        className="px-6 py-32 md:px-12 lg:px-20"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: "var(--accent-primary)" }}>Get started</p>
          <h2 className="font-display text-5xl md:text-6xl leading-tight mb-6" style={{ color: "var(--text-primary)" }}>
            Ready to see what&apos;s hiding in your contracts?
          </h2>
          <p className="text-xl mb-10" style={{ color: "var(--text-secondary)", maxWidth: "48ch", lineHeight: 1.7 }}>
            Upload your first contract free. No credit card, no setup, no waiting.
          </p>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-85"
              style={{ background: "var(--accent-primary)" }}
            >
              Analyze a Contract Free
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 text-base px-6 py-3 rounded-lg border transition-colors"
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
              Learn more
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="px-6 py-10 md:px-12 lg:px-20"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <div className="flex items-center gap-6">
            {["Privacy", "Terms", "Security"].map((l) => (
              <a key={l} href="#" className="text-xs transition-colors" style={{ color: "var(--text-tertiary)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-primary)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}
              >
                {l}
              </a>
            ))}
          </div>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            © 2026 ClauseGuard. Built for LLM × Law Hackathon #6.
          </p>
        </div>
      </footer>
    </div>
  );
}
