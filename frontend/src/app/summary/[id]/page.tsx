"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, RefreshCw, Copy, Download, TrendingUp, Printer } from "lucide-react";
import { contractsApi, analysisApi, clausesApi } from "@/lib/api";
import { riskHexColor, formatRiskPercent } from "@/lib/utils";
import type { Contract, ContractAnalysisSummary } from "@/types";

export default function SummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [contract, setContract] = useState<Contract | null>(null);
  const [summary, setSummary] = useState<ContractAnalysisSummary | null>(null);
  const [report, setReport] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [hasFullReport, setHasFullReport] = useState(false);

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadData = async () => {
    try {
      const [contractRes, summaryRes] = await Promise.all([
        contractsApi.get(id),
        clausesApi.summary(id).catch(() => null),
      ]);
      setContract(contractRes.data);
      if (summaryRes) setSummary(summaryRes.data);
      if (contractRes.data.summary) {
        setReport(contractRes.data.summary);
        setHasFullReport(true);
      } else {
        // Auto-generate a full report if no summary exists yet
        setLoading(false);
        await generateReport();
        return;
      }
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const res = await analysisApi.report(id);
      setReport(res.data.report);
      setHasFullReport(true);
    } catch {
      setReport("Failed to generate report. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 3000);
    }
  };

  const downloadMarkdown = () => {
    const filename =
      (contract?.title || contract?.original_filename || "report")
        .replace(/[^a-z0-9_\-\.]/gi, "_")
        .toLowerCase() + "_due_diligence.md";
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header
        className="border-b h-14 flex items-center"
        style={{ borderColor: "var(--border-primary)", background: "var(--bg-secondary)" }}
      >
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/review/${id}`)}
              className="rounded-lg p-1.5 transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "transparent")
              }
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-sm font-semibold font-display" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                Due Diligence Report
              </h1>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {contract?.title || contract?.original_filename}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {generating && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--accent-primary)" }}>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Generating…
              </span>
            )}
            {report && (
              <>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors print:hidden"
                  style={{ borderColor: "var(--border-secondary)", color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print / PDF
                </button>
                <button
                  onClick={downloadMarkdown}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors print:hidden"
                  style={{ borderColor: "var(--border-secondary)", color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Markdown
                </button>
                <button
                  type="button"
                  onClick={copyMarkdown}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors print:hidden"
                  style={{
                    borderColor: "var(--border-secondary)",
                    color: copied ? "var(--risk-low)" : copyFailed ? "var(--risk-critical)" : "var(--text-secondary)",
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copied!" : copyFailed ? "Use Ctrl+C" : "Copy"}
                </button>
                <button
                  onClick={generateReport}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50 print:hidden"
                  style={{ background: "var(--accent-primary)" }}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
                  {hasFullReport ? "Regenerate" : "Full AI Report"}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* Risk distribution — visual bar chart + counts */}
        {summary && <RiskDistributionChart summary={summary} />}

        {/* Contract metadata — flat ruled row, no card wrapper */}
        {contract && (
          <div
            className="grid grid-cols-2 sm:grid-cols-4"
            style={{ borderTop: "1px solid var(--border-primary)", borderBottom: "1px solid var(--border-primary)" }}
          >
            {[
              { label: "Contract Type", value: contract.contract_type || "Unknown" },
              { label: "Governing Law", value: contract.governing_law || "Not specified" },
              { label: "Overall Risk", value: formatRiskPercent(contract.overall_risk_score) },
              {
                label: "Risk Level",
                value: contract.risk_level?.toUpperCase() || "N/A",
                color: contract.risk_level ? riskHexColor(contract.risk_level) : undefined,
              },
            ].map(({ label, value, color }, i) => (
              <div
                key={label}
                className="py-4 px-5"
                style={{ borderRight: i < 3 ? "1px solid var(--border-primary)" : undefined }}
              >
                <p className="text-xs mb-0.5" style={{ color: "var(--text-tertiary)" }}>{label}</p>
                <p className="text-sm font-semibold" style={{ color: color ?? "var(--text-primary)" }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Report content or generating state */}
        {generating && !report ? (
          <div
            className="flex flex-col items-center justify-center py-20 rounded-2xl border"
            style={{ borderColor: "var(--border-primary)", background: "var(--bg-secondary)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="flex gap-1">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-2 w-2 rounded-full animate-bounce" style={{ background: "var(--accent-primary)", animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Generating full AI report…</p>
            <p className="text-xs text-center max-w-xs" style={{ color: "var(--text-tertiary)" }}>
              Synthesizing all clause findings into a professional due-diligence memo.
            </p>
          </div>
        ) : !report ? (
          <div
            className="flex flex-col items-center justify-center py-20 rounded-2xl border"
            style={{ borderColor: "var(--border-primary)", background: "var(--bg-secondary)" }}
          >
            <TrendingUp className="h-8 w-8 mb-3" style={{ color: "var(--text-tertiary)" }} />
            <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Generate your due diligence report
            </h3>
            <p className="text-sm mb-6 text-center max-w-xs" style={{ color: "var(--text-tertiary)" }}>
              AI synthesizes all findings into a professional memo with recommended negotiation language.
            </p>
            <button
              onClick={generateReport}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--accent-primary)" }}
            >
              <RefreshCw className="h-4 w-4" />
              Generate Report
            </button>
          </div>
        ) : (
          <div
            className="rounded-2xl border overflow-hidden print:border-none print:rounded-none print:shadow-none"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
          >
            {/* Report header — visible in print too */}
            <div
              className="px-8 py-5 border-b print:border-b-2 print:border-gray-200"
              style={{ borderColor: "var(--border-primary)" }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-tertiary)" }}>
                    Due Diligence Report · ClauseGuard
                  </p>
                  <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                    {contract?.title || contract?.original_filename}
                  </h2>
                </div>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>
            <div className="p-8 sm:p-10">
              <div className="cg-prose max-w-none">
                <ReactMarkdown>{report}</ReactMarkdown>
              </div>
            </div>
            <div className="px-8 py-4 border-t text-xs flex items-center justify-between" style={{ borderColor: "var(--border-primary)", color: "var(--text-tertiary)" }}>
              <span>Generated by ClauseGuard · AI-Powered Contract Intelligence</span>
              <span className="print:hidden">{hasFullReport ? "Full AI Report" : "Executive Summary"}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Risk Distribution horizontal bar chart ─────────────────────────────────
function RiskDistributionChart({ summary }: { summary: ContractAnalysisSummary }) {
  const total = summary.total_clauses || 1;
  const dist = summary.risk_distribution;
  const levels = [
    { key: "critical" as const, label: "Critical" },
    { key: "high" as const, label: "High" },
    { key: "medium" as const, label: "Medium" },
    { key: "low" as const, label: "Low" },
  ];

  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          Risk Distribution
        </span>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {total} clauses analyzed
        </span>
      </div>

      {/* Stacked bar */}
      <div className="h-3 rounded-full overflow-hidden flex" style={{ background: "var(--bg-tertiary)" }}>
        {levels.map(({ key }) => {
          const pct = (dist[key] / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={key}
              className="h-full"
              style={{
                width: animated ? `${pct}%` : "0%",
                background: riskHexColor(key),
                transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
              }}
              title={`${key}: ${dist[key]} (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>

      {/* Row bars with counts */}
      <div className="space-y-2.5 pt-1">
        {levels.map(({ key, label }) => {
          const count = dist[key];
          const pct = Math.round((count / total) * 100);
          return (
            <div key={key} className="flex items-center gap-3">
              <div className="w-16 text-right shrink-0">
                <span className="text-xs font-medium" style={{ color: riskHexColor(key) }}>
                  {label}
                </span>
              </div>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: animated ? `${pct}%` : "0%",
                    background: riskHexColor(key),
                    transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                  }}
                />
              </div>
              <div className="w-12 flex items-center justify-between shrink-0">
                <span className="text-xs tabular-nums font-bold" style={{ color: riskHexColor(key) }}>
                  {count}
                </span>
                <span className="text-xs tabular-nums" style={{ color: "var(--text-tertiary)" }}>
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall risk score */}
      <div
        className="flex items-center justify-between pt-2 border-t"
        style={{ borderColor: "var(--border-primary)" }}
      >
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Overall risk score
        </span>
        <span
          className="text-sm font-bold"
          style={{
            color: riskHexColor(summary.risk_level ?? "low"),
          }}
        >
          {formatRiskPercent(summary.overall_risk_score)} — {(summary.risk_level ?? "").toUpperCase()}
        </span>
      </div>
    </div>
  );
}
