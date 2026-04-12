"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, RefreshCw, Copy, AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react";
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
      if (contractRes.data.summary) setReport(contractRes.data.summary);
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
    } catch {
      setReport("Failed to generate report. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const copyMarkdown = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              <h1 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Due Diligence Report
              </h1>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {contract?.title || contract?.original_filename}
              </p>
            </div>
          </div>
          {report && (
            <div className="flex items-center gap-2">
              <button
                onClick={copyMarkdown}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderColor: "var(--border-secondary)",
                  color: copied ? "var(--risk-low)" : "var(--text-secondary)",
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Copied!" : "Copy Markdown"}
              </button>
              <button
                onClick={generateReport}
                disabled={generating}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                style={{ borderColor: "var(--border-secondary)", color: "var(--text-secondary)" }}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
                {generating ? "Generating..." : "Regenerate"}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* Stats summary */}
        {summary && (
          <div className="grid grid-cols-4 gap-3">
            {(["critical", "high", "medium", "low"] as const).map((level) => (
              <div
                key={level}
                className="rounded-xl border p-4 text-center"
                style={{
                  background: "var(--bg-secondary)",
                  borderColor: `${riskHexColor(level)}30`,
                }}
              >
                <p className="text-2xl font-bold" style={{ color: riskHexColor(level) }}>
                  {summary.risk_distribution[level]}
                </p>
                <p className="text-xs capitalize mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {level}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Contract metadata card */}
        {contract && (
          <div
            className="rounded-xl border p-5 grid grid-cols-2 gap-4 sm:grid-cols-4"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
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
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{label}</p>
                <p
                  className="text-sm font-semibold mt-0.5"
                  style={{ color: color ?? "var(--text-primary)" }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Report content or CTA */}
        {!report ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl border py-20"
            style={{ borderColor: "var(--border-primary)", borderStyle: "dashed" }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
              style={{ background: "var(--bg-tertiary)" }}
            >
              <TrendingUp className="h-7 w-7" style={{ color: "var(--text-tertiary)" }} />
            </div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              Generate due diligence report
            </h3>
            <p className="text-sm mb-6 text-center max-w-xs" style={{ color: "var(--text-tertiary)" }}>
              AI will synthesize all findings into a professional memo with critical findings and recommended actions.
            </p>
            <button
              onClick={generateReport}
              disabled={generating}
              className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
              style={{ background: "var(--accent-primary)" }}
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Generating...
                </span>
              ) : (
                "Generate Report"
              )}
            </button>
          </div>
        ) : (
          <div
            className="rounded-2xl border p-8"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
          >
            <div
              className="prose prose-sm max-w-none"
              style={{
                "--tw-prose-body": "var(--text-primary)",
                "--tw-prose-headings": "var(--text-primary)",
                "--tw-prose-links": "var(--accent-primary)",
                "--tw-prose-bold": "var(--text-primary)",
                "--tw-prose-counters": "var(--text-secondary)",
                "--tw-prose-bullets": "var(--text-secondary)",
                "--tw-prose-hr": "var(--border-primary)",
                "--tw-prose-quotes": "var(--text-secondary)",
                "--tw-prose-code": "var(--text-primary)",
              } as React.CSSProperties}
            >
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
