"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Search, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const DEMO_EMAIL = "demo@clauseguard.ai";
const DEMO_PASSWORD = "demo1234";

// ── Static preview data for the left panel ────────────────────────────────────
const PREVIEW_FINDINGS = [
  {
    risk: "critical",
    score: 97,
    type: "Indemnification",
    text: "Client shall defend and indemnify Provider from any and all claims, damages, and expenses including attorneys' fees. Provider obligations expressly excluded.",
    finding: "One-sided indemnification — Client bears unlimited exposure with no mutual obligation or cap.",
    color: "#EF4444",
  },
  {
    risk: "critical",
    score: 91,
    type: "Change of Control",
    text: "Upon any Change of Control of Client, Provider may terminate this Agreement upon five (5) days' written notice with immediate fee acceleration.",
    finding: "5-day termination + fee acceleration upon M&A is extremely onerous. Standard: 60-90 days, no penalty.",
    color: "#EF4444",
  },
  {
    risk: "high",
    score: 84,
    type: "Auto-Renewal",
    text: "Agreement renews automatically unless cancelled no later than fifteen (15) days prior to end of current term.",
    finding: "15-day cancellation window is dangerously short. Industry standard is 30–60 days.",
    color: "#F97316",
  },
  {
    risk: "high",
    score: 78,
    type: "Liability Cap",
    text: "Provider's total liability shall not exceed fees paid in the preceding 3 months or One Thousand Dollars ($1,000).",
    finding: "$1,000 liability cap is wholly inadequate for enterprise SaaS. Negotiate 12-month fee cap minimum.",
    color: "#F97316",
  },
  {
    risk: "medium",
    score: 54,
    type: "Data Retention",
    text: "Provider retains Customer Data for a period of up to 24 months following termination of the Agreement.",
    finding: "24-month post-termination retention is excessive. Negotiate 30-day deletion with certification.",
    color: "#EAB308",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated, hydrate } = useAuthStore();
  const emailRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [selectedFinding, setSelectedFinding] = useState(0);

  // Cycle through findings every 3s to animate the preview
  useEffect(() => {
    const t = setInterval(() => setSelectedFinding((i) => (i + 1) % PREVIEW_FINDINGS.length), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);
  useEffect(() => { emailRef.current?.focus(); }, []);

  const validate = () => {
    const errs: { email?: string; password?: string } = {};
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = "Enter a valid email";
    if (password.length < 8) errs.password = "At least 8 characters required";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const res = isRegister
        ? await authApi.register(email, password, name)
        : await authApi.login(email, password);
      setAuth(res.data.user, res.data.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      setError(msg || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError("");
    setLoading(true);
    try {
      let res;
      try {
        res = await authApi.login(DEMO_EMAIL, DEMO_PASSWORD);
      } catch {
        await authApi.register(DEMO_EMAIL, DEMO_PASSWORD, "Demo User");
        res = await authApi.login(DEMO_EMAIL, DEMO_PASSWORD);
      }
      setAuth(res.data.user, res.data.access_token);
      router.push("/dashboard");
    } catch {
      setError("Demo login failed. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const finding = PREVIEW_FINDINGS[selectedFinding];

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-primary)" }}>

      {/* ── Left panel — animated product preview ── */}
      <div
        className="hidden lg:flex lg:w-[58%] flex-col relative overflow-hidden"
        style={{ background: "#080B11" }}
      >
        {/* Subtle radial glow behind the content */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(21,96,252,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Top-left logo */}
        <div className="relative z-10 px-10 pt-8">
          <Logo size="md" />
        </div>

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-10 pb-12 gap-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(21,96,252,0.9)" }}>
              AI Contract Intelligence
            </p>
            <h2 className="text-3xl font-bold leading-tight mb-3" style={{ color: "#F0F0F5", letterSpacing: "-0.02em" }}>
              Every risk, visible<br />before you sign.
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)", maxWidth: "42ch" }}>
              Upload any contract. ClauseGuard reads every clause, scores each for risk, and streams answers to your questions in plain English.
            </p>
          </div>

          {/* Mini product preview — the heatmap */}
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: "#0D1117", borderColor: "rgba(255,255,255,0.07)", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}
          >
            {/* Chrome bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: "#080B0F", borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#FF5F57" }} />
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#FFBD2E" }} />
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#28C840" }} />
              </div>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>GlobalSupply Vendor MSA · 5 findings</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444" }}>
                CRITICAL · 91%
              </span>
            </div>

            {/* Two-column layout */}
            <div className="flex" style={{ height: "260px" }}>
              {/* Left: document fragment */}
              <div
                className="w-[52%] overflow-y-auto border-r p-4 space-y-1"
                style={{ background: "#F7F6F3", borderColor: "rgba(0,0,0,0.08)" }}
              >
                <p className="text-[8px] font-bold uppercase tracking-widest mb-2" style={{ color: "#9CA3AF" }}>Contract Document</p>
                {PREVIEW_FINDINGS.map((f, i) => {
                  const isSelected = selectedFinding === i;
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedFinding(i)}
                      className="cursor-pointer flex"
                    >
                      <div
                        className="w-0.5 shrink-0 mr-1.5 rounded-full self-stretch transition-all"
                        style={{ background: f.color, opacity: isSelected ? 1 : 0.35, minHeight: "1em" }}
                      />
                      <p
                        className="text-[9.5px] leading-[1.65] py-0.5 px-0.5 rounded transition-all"
                        style={{
                          fontFamily: "Georgia, serif",
                          color: "#111827",
                          background: isSelected ? `${f.color}18` : "transparent",
                          outline: isSelected ? `1.5px solid ${f.color}35` : "none",
                          outlineOffset: "1px",
                        }}
                      >
                        {f.text.slice(0, 95)}…
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Right: analysis */}
              <div className="w-[48%] overflow-y-auto p-3 flex flex-col gap-2">
                {/* Risk badge + score */}
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border"
                    style={{ color: finding.color, background: `${finding.color}15`, borderColor: `${finding.color}35` }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: finding.color }} />
                    {finding.risk}
                  </span>
                  <span className="text-[10px] font-bold tabular-nums" style={{ color: finding.color }}>{finding.score}%</span>
                  <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>{finding.type}</span>
                </div>
                {/* Progress bar */}
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${finding.score}%`, background: finding.color }} />
                </div>
                {/* Finding */}
                <div className="rounded-lg p-2.5" style={{ background: `${finding.color}10`, border: `1px solid ${finding.color}25` }}>
                  <p className="text-[9px] font-semibold uppercase tracking-wide mb-1" style={{ color: finding.color }}>Analysis</p>
                  <p className="text-[9.5px] leading-[1.55]" style={{ color: "rgba(255,255,255,0.65)" }}>{finding.finding}</p>
                </div>
                {/* TrustFoundry */}
                <div className="rounded-lg p-2" style={{ background: "rgba(21,96,252,0.08)", border: "1px solid rgba(21,96,252,0.18)" }}>
                  <p className="text-[8.5px] leading-[1.45]" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <span style={{ color: "rgba(21,96,252,0.9)", fontWeight: 600 }}>✓ TrustFoundry verified</span>
                    {" "}— matched against 14M+ US laws & cases
                  </p>
                </div>
                {/* Mini list */}
                <div className="space-y-1 mt-0.5">
                  {PREVIEW_FINDINGS.filter((_, i) => i !== selectedFinding).slice(0, 3).map((f, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedFinding(PREVIEW_FINDINGS.indexOf(f))}
                      className="w-full text-left flex items-center gap-1.5 rounded px-1.5 py-1"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)")}
                    >
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: f.color }} />
                      <span className="text-[8.5px] flex-1 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{f.type}</span>
                      <span className="text-[8.5px] font-bold shrink-0" style={{ color: f.color }}>{f.score}%</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t text-[9px]" style={{ borderColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)" }}>
              <span>{PREVIEW_FINDINGS.length} clauses · 24 sec · GPT-4o + TrustFoundry</span>
              <span className="flex items-center gap-1" style={{ color: "#22C55E" }}>
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#22C55E" }} />
                Live analysis
              </span>
            </div>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Zap className="h-3.5 w-3.5" />, stat: "<30s", label: "Analysis time" },
              { icon: <Search className="h-3.5 w-3.5" />, stat: "14M+", label: "Laws indexed" },
              { icon: <MessageSquare className="h-3.5 w-3.5" />, stat: "100%", label: "Clause coverage" },
            ].map(({ icon, stat, label }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex justify-center mb-1.5" style={{ color: "rgba(21,96,252,0.8)" }}>{icon}</div>
                <p className="text-base font-bold tabular-nums" style={{ color: "#F0F0F5" }}>{stat}</p>
                <p className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom credit */}
        <div className="relative z-10 px-10 pb-8">
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>
            Built for LLM × Law Hackathon · ClauseGuard 2026
          </p>
        </div>
      </div>

      {/* ── Right panel — auth form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 relative">
        {/* Theme toggle */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        {/* Mobile-only logo */}
        <div className="mb-8 lg:hidden">
          <Logo size="lg" />
        </div>

        <div className="w-full max-w-sm space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              {isRegister ? "Create account" : "Welcome back"}
            </h1>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              {isRegister ? "Start analyzing contracts in seconds." : "Sign in to your portfolio."}
            </p>
          </div>

          {/* Demo CTA — the hero action */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: "var(--risk-low)" }} />
              <p className="text-xs font-semibold" style={{ color: "var(--risk-low)" }}>Demo account ready</p>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              See <strong style={{ color: "var(--text-primary)" }}>pre-analyzed contracts</strong> with live AI heatmaps, clause chat, and export — instantly.
            </p>
            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #1560FC 0%, #0F4DD6 100%)",
                boxShadow: "0 4px 16px rgba(21,96,252,0.35)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(21,96,252,0.5)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(21,96,252,0.35)"; }}
            >
              {loading ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  View Live Demo
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <div className="flex items-center justify-center gap-4 pt-0.5">
              {[
                { icon: <CheckCircle2 className="h-3 w-3" />, label: "No sign-up" },
                { icon: <CheckCircle2 className="h-3 w-3" />, label: "Instant access" },
                { icon: <CheckCircle2 className="h-3 w-3" />, label: "Real AI analysis" },
              ].map(({ icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  {icon}
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t" style={{ borderColor: "var(--border-primary)" }} />
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>or sign in with email</span>
            <div className="flex-1 border-t" style={{ borderColor: "var(--border-primary)" }} />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
              />
            )}
            <Input
              ref={emailRef}
              id="email"
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }}
              placeholder="you@lawfirm.com"
              error={fieldErrors.email}
            />
            <Input
              id="password"
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); }}
              placeholder="••••••••"
              error={fieldErrors.password}
            />
            {error && (
              <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: "var(--risk-critical-bg)", color: "var(--risk-critical)", border: "1px solid var(--risk-critical-border)" }}>
                {error}
              </div>
            )}
            <Button type="submit" loading={loading} variant="secondary" className="w-full">
              {isRegister ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-xs" style={{ color: "var(--text-tertiary)" }}>
            {isRegister ? "Already have an account?" : "Need an account?"}{" "}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(""); setFieldErrors({}); }}
              className="font-medium"
              style={{ color: "var(--accent-primary)" }}
            >
              {isRegister ? "Sign in" : "Register free"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
