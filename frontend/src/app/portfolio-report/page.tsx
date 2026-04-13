"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Download,
  Loader2,
  Scale,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { analysisApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { ThemeToggle } from "@/components/ui/theme-toggle";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TriageEntry {
  contract_id: string;
  title: string;
  risk_score: number;
  risk_level: string;
  critical_findings: number;
  high_findings: number;
  governing_law: string | null;
  contract_type: string | null;
  parties: string[];
  summary: string | null;
}

interface ActionItem {
  priority: number;
  action: string;
  risk_level: string;
  contract_title: string;
  contract_id: string;
  clause_id: string;
  section: string;
  rationale: string;
  effort: string;
  recommended_assignee: string;
  legal_reference: string | null;
  trustfoundry_verified: boolean;
}

interface Pattern {
  pattern: string;
  affected_contracts: number;
  contract_titles: string[];
  significance: string;
  recommendation: string;
}

interface PortfolioReport {
  report_metadata: {
    contracts_analyzed: number;
    total_clauses_reviewed: number;
    total_findings: number;
    generated_at: string;
  };
  risk_overview: {
    overall_risk_score: number;
    overall_risk_level: string;
    risk_distribution: Record<string, number>;
    contracts_requiring_immediate_attention: number;
    contracts_requiring_renegotiation: number;
    contracts_acceptable_as_is: number;
  };
  executive_summary: string;
  contract_triage: {
    immediate_attention: TriageEntry[];
    renegotiation_recommended: TriageEntry[];
    acceptable_as_is: TriageEntry[];
  };
  priority_action_items: ActionItem[];
  cross_contract_patterns: Pattern[];
  trustfoundry_grounded: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const riskColor = (level: string) => {
  switch (level) {
    case "critical": return "var(--risk-critical)";
    case "high":     return "var(--risk-high)";
    case "medium":   return "var(--risk-medium)";
    default:         return "var(--risk-low)";
  }
};

const riskBg = (level: string) => {
  switch (level) {
    case "critical": return "var(--risk-critical-bg)";
    case "high":     return "var(--risk-high-bg)";
    case "medium":   return "var(--risk-medium-bg)";
    default:         return "var(--risk-low-bg)";
  }
};

const riskBorder = (level: string) => {
  switch (level) {
    case "critical": return "var(--risk-critical-border)";
    case "high":     return "var(--risk-high-border)";
    case "medium":   return "var(--risk-medium-border)";
    default:         return "var(--risk-low-border)";
  }
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
      style={{
        color: riskColor(level),
        background: riskBg(level),
        border: `1px solid ${riskBorder(level)}`,
      }}
    >
      {level}
    </span>
  );
}

function TriageCard({ entry, tier }: { entry: TriageEntry; tier: "red" | "orange" | "green" }) {
  const router = useRouter();
  const borderMap = { red: "var(--risk-critical-border)", orange: "var(--risk-high-border)", green: "var(--risk-low-border)" };
  const bgMap = { red: "var(--risk-critical-bg)", orange: "var(--risk-high-bg)", green: "var(--risk-low-bg)" };

  return (
    <button
      onClick={() => router.push(`/review/${entry.contract_id}`)}
      className="w-full text-left rounded-xl border p-4 transition-all"
      style={{ borderColor: borderMap[tier], background: bgMap[tier] }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {entry.title}
          </p>
          {entry.parties.length > 0 && (
            <p className="mt-0.5 text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
              {entry.parties.slice(0, 2).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold tabular-nums" style={{ color: riskColor(entry.risk_level) }}>
            {Math.round(entry.risk_score * 100)}
          </span>
          <RiskBadge level={entry.risk_level} />
          <ChevronRight className="h-3.5 w-3.5" style={{ color: "var(--text-tertiary)" }} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
        {entry.critical_findings > 0 && (
          <span style={{ color: "var(--risk-critical)" }}>{entry.critical_findings} critical</span>
        )}
        {entry.high_findings > 0 && (
          <span style={{ color: "var(--risk-high)" }}>{entry.high_findings} high</span>
        )}
        {entry.contract_type && <span>{entry.contract_type}</span>}
        {entry.governing_law && <span>{entry.governing_law} law</span>}
      </div>
    </button>
  );
}

function ActionItemCard({ item }: { item: ActionItem }) {
  return (
    <div
      className="rounded-xl border p-5 space-y-3"
      style={{ borderColor: riskBorder(item.risk_level), background: "var(--bg-secondary)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{ background: riskBg(item.risk_level), color: riskColor(item.risk_level) }}
        >
          {item.priority}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <RiskBadge level={item.risk_level} />
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{item.contract_title}</span>
            {item.trustfoundry_verified && (
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
                style={{
                  color: "var(--risk-low)",
                  background: "rgba(34,197,94,0.08)",
                  borderColor: "rgba(34,197,94,0.25)",
                }}
              >
                <CheckCircle2 className="h-3 w-3" />
                Verified by TrustFoundry
              </span>
            )}
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {item.action}
          </p>
        </div>
      </div>

      {item.rationale && (
        <p className="text-xs leading-relaxed ml-9" style={{ color: "var(--text-secondary)" }}>
          {item.rationale}
        </p>
      )}

      {item.legal_reference && (
        <div className="ml-9 rounded-lg border p-2.5" style={{ background: "rgba(21,96,252,0.04)", borderColor: "rgba(21,96,252,0.15)" }}>
          <p className="text-xs font-semibold" style={{ color: "var(--accent-primary)" }}>
            📜 {item.legal_reference}
          </p>
        </div>
      )}

      <div className="ml-9 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
        <span><span className="font-medium">Section:</span> {item.section}</span>
        <span><span className="font-medium">Effort:</span> {item.effort}</span>
        <span><span className="font-medium">Assign to:</span> {item.recommended_assignee}</span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PortfolioReportPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [report, setReport] = useState<PortfolioReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { router.replace("/login"); return; }
    loadReport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await analysisApi.portfolioReport();
      setReport(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Failed to generate portfolio report.");
    } finally {
      setLoading(false);
    }
  }

  function downloadMarkdown() {
    if (!report) return;
    const lines: string[] = [
      "# ClauseGuard — Portfolio Risk Report",
      "",
      `**Generated:** ${new Date(report.report_metadata.generated_at).toLocaleString()}`,
      `**Contracts Analyzed:** ${report.report_metadata.contracts_analyzed}`,
      `**Total Clauses Reviewed:** ${report.report_metadata.total_clauses_reviewed}`,
      "",
      "## Executive Summary",
      "",
      report.executive_summary,
      "",
      "## Risk Overview",
      "",
      `- **Overall Risk Score:** ${Math.round(report.risk_overview.overall_risk_score * 100)}%`,
      `- **Critical Findings:** ${report.risk_overview.risk_distribution.critical}`,
      `- **High Findings:** ${report.risk_overview.risk_distribution.high}`,
      `- **Immediate Attention Required:** ${report.risk_overview.contracts_requiring_immediate_attention} contracts`,
      `- **Renegotiation Recommended:** ${report.risk_overview.contracts_requiring_renegotiation} contracts`,
      `- **Acceptable As-Is:** ${report.risk_overview.contracts_acceptable_as_is} contracts`,
      "",
      "## Priority Action Items",
      "",
      ...report.priority_action_items.map((item) => [
        `### ${item.priority}. ${item.action}`,
        `**Risk Level:** ${item.risk_level.toUpperCase()} | **Contract:** ${item.contract_title}`,
        `**Effort:** ${item.effort} | **Assign to:** ${item.recommended_assignee}`,
        item.rationale ? `\n${item.rationale}` : "",
        item.legal_reference ? `\n📜 _${item.legal_reference}_` : "",
        "",
      ].join("\n")),
      "## Cross-Contract Patterns",
      "",
      ...report.cross_contract_patterns.map((p) => [
        `### ${p.pattern} (${p.affected_contracts} contracts)`,
        p.significance,
        `**Recommendation:** ${p.recommendation}`,
        "",
      ].join("\n")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clauseguard_portfolio_report_${new Date().toISOString().slice(0,10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="flex flex-col items-center gap-5">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)" }}
          >
            <Loader2 className="h-7 w-7 animate-spin" style={{ color: "var(--accent-primary)" }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Generating portfolio report…</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Analyzing all contracts and cross-contract patterns</p>
          </div>
          {/* Skeleton shimmer bars */}
          <div className="w-72 space-y-2 mt-2">
            {[100, 80, 90, 60].map((w, i) => (
              <div
                key={i}
                className="h-3 rounded-full shimmer-loading"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    // Special empty state when no contracts are analyzed yet
    const isEmpty = error.toLowerCase().includes("no analyzed") || error.toLowerCase().includes("not enough") || error.toLowerCase().includes("need at least");
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4" style={{ background: "var(--bg-primary)" }}>
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: isEmpty ? "var(--bg-tertiary)" : "var(--risk-high-bg)", border: `1px solid ${isEmpty ? "var(--border-secondary)" : "var(--risk-high-border)"}` }}
        >
          {isEmpty
            ? <BarChart3 className="h-7 w-7" style={{ color: "var(--text-tertiary)" }} />
            : <AlertTriangle className="h-7 w-7" style={{ color: "var(--risk-high)" }} />
          }
        </div>
        <div className="text-center max-w-xs">
          <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            {isEmpty ? "No contracts analyzed yet" : "Report generation failed"}
          </p>
          <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
            {isEmpty
              ? "Analyze at least 2 contracts to generate a portfolio risk report with cross-contract insights."
              : error
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border-secondary)", color: "var(--text-secondary)" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </button>
          {isEmpty ? (
            <button
              onClick={() => router.push("/upload")}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "var(--accent-primary)" }}
            >
              Upload Contracts
            </button>
          ) : (
            <button
              onClick={loadReport}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "var(--accent-primary)" }}
            >
              <Loader2 className="h-3.5 w-3.5" />
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!report) return null;

  const { risk_overview, report_metadata, contract_triage, priority_action_items, cross_contract_patterns } = report;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 border-b px-6 py-4"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
      >
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: "var(--text-tertiary)" }}
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
            <span style={{ color: "var(--border-primary)" }}>·</span>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" style={{ color: "var(--accent-primary)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Portfolio Risk Report</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {report_metadata.contracts_analyzed} contracts · {report_metadata.total_clauses_reviewed} clauses
            </span>
            <ThemeToggle />
            <button
              onClick={downloadMarkdown}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
              style={{
                background: "var(--accent-primary)",
                borderColor: "var(--accent-primary)",
                color: "#fff",
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8 space-y-10">

        {/* Risk Overview */}
        <div
          className="rounded-2xl border p-6"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
        >
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <h2 className="text-base font-semibold font-display flex items-center gap-2" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              <TrendingUp className="h-4 w-4" style={{ color: "var(--accent-primary)" }} />
              Risk Overview
            </h2>
            <RiskBadge level={risk_overview.overall_risk_level} />
            {report.trustfoundry_grounded > 0 && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
                style={{
                  color: "var(--risk-low)",
                  background: "rgba(34,197,94,0.08)",
                  borderColor: "rgba(34,197,94,0.25)",
                }}
              >
                <CheckCircle2 className="h-3 w-3" />
                {report.trustfoundry_grounded} findings verified by TrustFoundry
              </span>
            )}
          </div>

          {/* Risk score bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Portfolio Risk Score</span>
              <p className="text-sm font-bold tabular-nums" style={{ color: riskColor(risk_overview.overall_risk_level) }}>
                {Math.round(risk_overview.overall_risk_score * 100)} / 100
              </p>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.round(risk_overview.overall_risk_score * 100)}%`,
                  background: riskColor(risk_overview.overall_risk_level),
                }}
              />
            </div>
          </div>

          {/* Stats row — flat, no nested cards */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4"
            style={{ borderTop: "1px solid var(--border-primary)", borderBottom: "1px solid var(--border-primary)" }}
          >
            {[
              { label: "Critical", value: risk_overview.risk_distribution.critical, color: "var(--risk-critical)" },
              { label: "High", value: risk_overview.risk_distribution.high, color: "var(--risk-high)" },
              { label: "Medium", value: risk_overview.risk_distribution.medium, color: "var(--risk-medium)" },
              { label: "Low", value: risk_overview.risk_distribution.low, color: "var(--risk-low)" },
            ].map(({ label, value, color }, i) => (
              <div
                key={label}
                className="py-4 px-5"
                style={{ borderRight: i < 3 ? "1px solid var(--border-primary)" : undefined }}
              >
                <p className="text-xs mb-0.5" style={{ color: "var(--text-tertiary)" }}>{label}</p>
                <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {report.executive_summary}
          </p>
        </div>

        {/* Contract Triage */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold font-display flex items-center gap-2" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              <Scale className="h-4 w-4" style={{ color: "var(--accent-primary)" }} />
              Contract Triage
            </h2>
          </div>

          {contract_triage.immediate_attention.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: "var(--risk-critical)" }}>
                <AlertTriangle className="h-3.5 w-3.5" />
                Immediate Attention Required ({contract_triage.immediate_attention.length})
              </p>
              <div className="space-y-2">
                {contract_triage.immediate_attention.map((entry) => (
                  <TriageCard key={entry.contract_id} entry={entry} tier="red" />
                ))}
              </div>
            </div>
          )}

          {contract_triage.renegotiation_recommended.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: "var(--risk-high)" }}>
                <TrendingUp className="h-3.5 w-3.5" />
                Renegotiation Recommended ({contract_triage.renegotiation_recommended.length})
              </p>
              <div className="space-y-2">
                {contract_triage.renegotiation_recommended.map((entry) => (
                  <TriageCard key={entry.contract_id} entry={entry} tier="orange" />
                ))}
              </div>
            </div>
          )}

          {contract_triage.acceptable_as_is.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: "var(--risk-low)" }}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Acceptable As-Is ({contract_triage.acceptable_as_is.length})
              </p>
              <div className="space-y-2">
                {contract_triage.acceptable_as_is.map((entry) => (
                  <TriageCard key={entry.contract_id} entry={entry} tier="green" />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Priority Action Items */}
        {priority_action_items.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-base font-semibold font-display flex items-center gap-2" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                <Zap className="h-4 w-4" style={{ color: "var(--accent-primary)" }} />
                Priority Action Items
              </h2>
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {priority_action_items.filter(i => i.trustfoundry_verified).length} verified by TrustFoundry
              </span>
            </div>
            <div className="space-y-3">
              {priority_action_items.map((item) => (
                <ActionItemCard key={`${item.contract_id}-${item.clause_id}`} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Cross-Contract Patterns */}
        {cross_contract_patterns.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-base font-semibold font-display flex items-center gap-2" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                <Users className="h-4 w-4" style={{ color: "var(--accent-primary)" }} />
                Cross-Contract Patterns
              </h2>
            </div>
            <div className="space-y-3">
              {cross_contract_patterns.map((pattern, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border p-5 space-y-2"
                  style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" style={{ color: "var(--accent-primary)" }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {pattern.pattern}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: "var(--bg-tertiary)", color: "var(--text-tertiary)" }}
                    >
                      {pattern.affected_contracts} contracts
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {pattern.significance}
                  </p>
                  <p className="text-xs font-medium" style={{ color: "var(--accent-primary)" }}>
                    → {pattern.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer attribution */}
        <div className="border-t pt-6 text-center" style={{ borderColor: "var(--border-secondary)" }}>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Generated by ClauseGuard · Legal citations verified via{" "}
            <a
              href="https://trustfoundry.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: "var(--accent-primary)" }}
            >
              TrustFoundry
            </a>
            {" "}(14M+ US laws & cases) · Not a substitute for legal advice
          </p>
        </div>
      </div>
    </div>
  );
}
