"use client";

import Link from "next/link";
import {
  Shield, Zap, MessageSquare, Search, BarChart3,
  CheckCircle2, ArrowRight, Sparkles, Scale, BookOpen,
} from "lucide-react";
import HeroSection from "@/components/ui/hero-section";

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
    accent: "#8B5CF6",
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
    accent: "#3B82F6",
  },
  {
    quote: "The semantic search across our SaaS portfolio found 12 non-standard auto-renewal clauses we had no idea existed.",
    name: "Marcus Webb",
    title: "General Counsel, Series B Startup",
    initials: "MW",
    accent: "#8B5CF6",
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
          <div className="text-center mb-16">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium mb-4"
              style={{ borderColor: "var(--border-secondary)", color: "var(--text-tertiary)", background: "var(--bg-secondary)" }}
            >
              <Sparkles className="h-3 w-3" style={{ color: "var(--accent-primary)" }} />
              Everything your legal team needs
            </span>
            <h2 className="text-4xl font-bold md:text-5xl" style={{ color: "var(--text-primary)" }}>
              Contract intelligence,{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                end-to-end.
              </span>
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-lg" style={{ color: "var(--text-secondary)" }}>
              From first upload to final signature, ClauseGuard makes contract risk visible and actionable.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon, title, description, accent }) => (
              <div
                key={title}
                className="rounded-2xl border p-6 transition-all duration-200 group"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${accent}40`;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 1px ${accent}20, 0 8px 24px rgba(0,0,0,0.3)`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border-primary)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl mb-4 transition-transform group-hover:scale-110"
                  style={{ background: `${accent}18`, color: accent }}
                >
                  {icon}
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {description}
                </p>
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
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold md:text-5xl" style={{ color: "var(--text-primary)" }}>
              From upload to insight{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #3B82F6 0%, #22C55E 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                in 30 seconds.
              </span>
            </h2>
            <p className="mt-4 text-lg" style={{ color: "var(--text-secondary)" }}>
              No training. No configuration. Just drop your contract and go.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map(({ step, title, description }, i) => (
              <div key={step} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div
                    className="hidden lg:block absolute top-7 left-full w-full h-px -translate-x-4"
                    style={{ background: "linear-gradient(90deg, var(--border-secondary), transparent)" }}
                  />
                )}
                <div
                  className="text-5xl font-black mb-4 tabular-nums"
                  style={{
                    background: "linear-gradient(135deg, var(--border-secondary) 0%, transparent 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {step}
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
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
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold md:text-4xl" style={{ color: "var(--text-primary)" }}>
              Trusted by legal teams moving fast
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {TESTIMONIALS.map(({ quote, name, title, initials, accent }) => (
              <div
                key={name}
                className="rounded-2xl border p-6 flex flex-col"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
              >
                <p className="text-sm leading-relaxed flex-1 mb-6" style={{ color: "var(--text-secondary)" }}>
                  &ldquo;{quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
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

          {/* Stats row */}
          <div
            className="mt-12 grid grid-cols-2 gap-px md:grid-cols-4 rounded-2xl overflow-hidden"
            style={{ border: "1px solid var(--border-primary)" }}
          >
            {[
              { value: "14M+", label: "Laws & cases indexed" },
              { value: "25", label: "Clause categories scored" },
              { value: "<30s", label: "Average analysis time" },
              { value: "100%", label: "Clause coverage" },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="flex flex-col items-center justify-center py-8 px-4 text-center"
                style={{ background: "var(--bg-secondary)" }}
              >
                <span
                  className="text-3xl font-black tabular-nums mb-1"
                  style={{
                    background: "linear-gradient(135deg, var(--text-primary) 0%, var(--accent-primary) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {value}
                </span>
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{label}</span>
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
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold md:text-5xl" style={{ color: "var(--text-primary)" }}>
              Simple pricing
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
                  boxShadow: highlight ? "0 0 30px rgba(59,130,246,0.15)" : "none",
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
        className="px-6 py-24 md:px-12 lg:px-20"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <div
          className="mx-auto max-w-4xl rounded-3xl p-12 text-center relative overflow-hidden"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)" }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{ background: "radial-gradient(ellipse at 50% 0%, #3B82F650, transparent 60%)" }}
          />
          <div className="relative">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl mb-6"
              style={{ background: "var(--accent-primary)" }}
            >
              <Shield className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-4xl font-bold md:text-5xl mb-4" style={{ color: "var(--text-primary)" }}>
              Ready to see what&apos;s hiding in your contracts?
            </h2>
            <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              Upload your first contract free. No credit card, no setup, no waiting.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold text-white transition-all hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, var(--accent-primary) 0%, #6366F1 100%)",
                  boxShadow: "0 0 30px rgba(59,130,246,0.35)",
                }}
              >
                <Shield className="h-4 w-4" />
                Analyze a Contract Free
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 text-sm"
                style={{ color: "var(--text-tertiary)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--accent-primary)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}
              >
                Learn more
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="px-6 py-10 md:px-12 lg:px-20"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: "var(--accent-primary)" }}
            >
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>ClauseGuard</span>
          </div>
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
            © 2025 ClauseGuard. Built for Stanford Law Hackathon.
          </p>
        </div>
      </footer>
    </div>
  );
}
