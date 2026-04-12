"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Shield,
  Send,
  Download,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Calendar,
  Scale,
  Users,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { contractsApi, clausesApi, analysisApi, chatApi } from "@/lib/api";
import { useContractStore } from "@/stores/contract-store";
import { usePolling } from "@/hooks/use-polling";
import { useTypewriter } from "@/hooks/use-typewriter";
import { cn, riskHexColor, formatRiskPercent } from "@/lib/utils";
import type { Contract, Clause, ContractAnalysisSummary } from "@/types";

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    currentContract,
    setCurrentContract,
    clauses,
    setClauses,
    analysisSummary,
    setAnalysisSummary,
  } = useContractStore();

  const [selectedClause, setSelectedClause] = useState<Clause | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [heatmapReady, setHeatmapReady] = useState(false);
  const [activeTab, setActiveTab] = useState<"analysis" | "chat">("analysis");
  // Clause IDs surfaced by the AI chat as relevant context — highlights them in the heatmap
  const [chatContextIds, setChatContextIds] = useState<Set<string>>(new Set());
  const analysisScrollRef = useRef<HTMLDivElement>(null);
  const clauseRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const documentClauseRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Robust polling via the pre-built hook (stale-closure-safe)
  usePolling(
    async () => {
      try {
        const res = await analysisApi.status(id);
        if (res.data.status === "analyzed") {
          setPolling(false);
          await loadAnalysis();
          const contractRes = await contractsApi.get(id);
          setCurrentContract(contractRes.data);
          return true; // stop
        }
        if (res.data.status === "error") {
          setPolling(false);
          const contractRes = await contractsApi.get(id);
          setCurrentContract(contractRes.data);
          return true; // stop
        }
      } catch {
        return false; // transient network error — keep polling
      }
      return false; // keep polling
    },
    3000,
    polling
  );

  useEffect(() => {
    loadContract();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadContract = async () => {
    try {
      const contractRes = await contractsApi.get(id);
      const contract: Contract = contractRes.data;
      setCurrentContract(contract);

      if (contract.status === "analyzed") {
        await loadAnalysis();
      } else if (contract.status === "processing") {
        setPolling(true);
      }
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysis = async () => {
    try {
      const [clauseRes, summaryRes] = await Promise.all([
        clausesApi.list(id),
        clausesApi.summary(id),
      ]);
      setClauses(clauseRes.data.clauses);
      setAnalysisSummary(summaryRes.data);
      setTimeout(() => setHeatmapReady(true), 100);
    } catch {
      /* silently handle */
    }
  };

  const handleClauseClick = (clause: Clause) => {
    setSelectedClause(clause);
    setActiveTab("analysis");
    // Scroll both panels: left document heatmap + right analysis detail
    setTimeout(() => {
      documentClauseRefs.current[clause.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      clauseRefs.current[clause.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
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
    <div
      className="flex h-screen flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* ── Header ── */}
      <ReviewHeader
        contract={currentContract}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBack={() => router.push("/dashboard")}
        onReport={() => router.push(`/summary/${id}`)}
      />

      {/* ── Body ── */}
      {polling ? (
        <ProcessingState />
      ) : currentContract?.status === "error" ? (
        <ErrorState onBack={() => router.push("/dashboard")} />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left — Document heatmap */}
          <div
            className="w-[55%] overflow-y-auto border-r scroll-smooth"
            style={{
              borderColor: "var(--border-primary)",
              background: "var(--bg-secondary)",
            }}
          >
            <DocumentPanel
              clauses={clauses}
              selectedClause={selectedClause}
              heatmapReady={heatmapReady}
              chatContextIds={chatContextIds}
              onClauseClick={handleClauseClick}
              documentClauseRefs={documentClauseRefs}
            />
          </div>

          {/* Right — Analysis / Chat */}
          <div
            className="flex w-[45%] flex-col overflow-hidden"
            style={{ background: "var(--bg-primary)" }}
          >
            {activeTab === "analysis" ? (
              <AnalysisPanel
                contract={currentContract}
                clause={selectedClause}
                summary={analysisSummary}
                clauses={clauses}
                scrollRef={analysisScrollRef}
                clauseRefs={clauseRefs}
                onClauseClick={handleClauseClick}
                onClearClause={() => setSelectedClause(null)}
              />
            ) : (
              <ChatPanel
                contractId={id}
                onContextClauses={(ids) => setChatContextIds(new Set(ids))}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Header ────────────────────────────────────────────────────────────────────
function ReviewHeader({
  contract,
  activeTab,
  onTabChange,
  onBack,
  onReport,
}: {
  contract: Contract | null;
  activeTab: "analysis" | "chat";
  onTabChange: (t: "analysis" | "chat") => void;
  onBack: () => void;
  onReport: () => void;
}) {
  return (
    <header
      className="flex h-14 shrink-0 items-center justify-between border-b px-4"
      style={{
        borderColor: "var(--border-primary)",
        background: "var(--bg-secondary)",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 transition-colors shrink-0"
          style={{ color: "var(--text-tertiary)" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background =
              "var(--bg-tertiary)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "transparent")
          }
        >
            <ArrowLeft className="h-4 w-4" />
          </button>

        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
          style={{ background: "var(--accent-primary)" }}
        >
          <Shield className="h-4 w-4 text-white" />
        </div>

        <span
          className="text-sm font-semibold truncate max-w-sm"
          style={{ color: "var(--text-primary)" }}
        >
          {contract?.title || contract?.original_filename}
        </span>

        {contract?.risk_level && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium shrink-0"
            style={{
              color: riskHexColor(contract.risk_level),
              background: `${riskHexColor(contract.risk_level)}15`,
              borderColor: `${riskHexColor(contract.risk_level)}40`,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: riskHexColor(contract.risk_level) }}
            />
            {contract.risk_level.toUpperCase()} ·{" "}
            {formatRiskPercent(contract.overall_risk_score)}
            </span>
          )}
        </div>

      <div className="flex items-center gap-1">
        {(["analysis", "chat"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors"
            style={{
              background:
                activeTab === tab ? "var(--accent-muted)" : "transparent",
              color:
                activeTab === tab
                  ? "var(--accent-primary)"
                  : "var(--text-tertiary)",
            }}
          >
            {tab === "analysis" ? "Analysis" : "Chat AI"}
          </button>
        ))}
        <button
          onClick={onReport}
          className="ml-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          style={{ color: "var(--text-tertiary)" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background =
              "var(--bg-tertiary)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "transparent")
          }
        >
          <Download className="inline mr-1 h-3.5 w-3.5" />
          Report
        </button>
      </div>
    </header>
  );
}

// ─── Processing state ───────────────────────────────────────────────────────────
const PROCESSING_STEPS = [
  "Extracting text...",
  "Chunking clauses...",
  "Generating embeddings...",
  "Running risk analysis...",
  "Extracting metadata...",
];

function ProcessingState() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((s) => (s < PROCESSING_STEPS.length - 1 ? s + 1 : s));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex flex-1 items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="text-center max-w-xs">
        <div
          className="mx-auto h-12 w-12 rounded-full border-4 border-t-transparent animate-spin mb-6"
          style={{
            borderColor: "var(--accent-primary)",
            borderTopColor: "transparent",
          }}
        />
        <h3
          className="text-base font-semibold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Analyzing contract
        </h3>
        <div className="space-y-2 text-left">
          {PROCESSING_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-2.5">
              {i < currentStep ? (
                <CheckCircle2
                  className="h-4 w-4 shrink-0"
                  style={{ color: "var(--risk-low)" }}
                />
              ) : i === currentStep ? (
                <div
                  className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin shrink-0"
                  style={{
                    borderColor: "var(--accent-primary)",
                    borderTopColor: "transparent",
                  }}
                />
              ) : (
                <div
                  className="h-4 w-4 rounded-full border-2 shrink-0"
                  style={{ borderColor: "var(--border-secondary)" }}
                />
              )}
              <span
                className="text-sm"
                style={{
                  color:
                    i <= currentStep
                      ? "var(--text-primary)"
                      : "var(--text-tertiary)",
                }}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Error state ─────────────────────────────────────────────────────────────
function ErrorState({ onBack }: { onBack: () => void }) {
  return (
    <div
      className="flex flex-1 items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="text-center max-w-sm px-6">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
          style={{ background: "rgba(239,68,68,0.12)" }}
        >
          <AlertTriangle className="h-7 w-7" style={{ color: "var(--risk-critical)" }} />
        </div>
        <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Analysis failed
        </h3>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
          Something went wrong while processing this contract. This may be due to an unsupported file format, corrupted content, or a temporary service issue.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border-primary)" }}
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: "var(--accent-primary)" }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
          </div>
        </div>
  );
}

// ─── Document panel with cascading heatmap ────────────────────────────────────
function DocumentPanel({
  clauses,
  selectedClause,
  heatmapReady,
  chatContextIds,
  onClauseClick,
  documentClauseRefs,
}: {
  clauses: Clause[];
  selectedClause: Clause | null;
  heatmapReady: boolean;
  chatContextIds: Set<string>;
  onClauseClick: (c: Clause) => void;
  documentClauseRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  if (clauses.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          No clauses available for this contract.
        </p>
                  </div>
    );
  }

  return (
    <div className="p-6 space-y-1 legal-doc">
      {clauses.map((clause, index) => (
        <ClauseBlock
          key={clause.id}
          clause={clause}
          index={index}
          isSelected={selectedClause?.id === clause.id}
          isChatContext={chatContextIds.has(clause.id)}
          heatmapReady={heatmapReady}
          onClick={() => onClauseClick(clause)}
          registerRef={(el) => {
            if (documentClauseRefs) documentClauseRefs.current[clause.id] = el;
          }}
        />
                ))}
              </div>
  );
}

function ClauseBlock({
  clause,
  index,
  isSelected,
  isChatContext,
  heatmapReady,
  onClick,
  registerRef,
}: {
  clause: Clause;
  index: number;
  isSelected: boolean;
  isChatContext: boolean;
  heatmapReady: boolean;
  onClick: () => void;
  registerRef?: (el: HTMLDivElement | null) => void;
}) {
  const [visible, setVisible] = useState(heatmapReady);
  const [pulse, setPulse] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (heatmapReady) {
      const timer = setTimeout(() => {
        setVisible(true);
        // Only pulse critical and high-risk clauses once, after they appear
        if (clause.risk_level === "critical" || clause.risk_level === "high") {
          setTimeout(() => {
            setPulse(true);
            setTimeout(() => setPulse(false), 700);
          }, 200);
        }
      }, index * 40);
      return () => clearTimeout(timer);
    }
  }, [heatmapReady, index, clause.risk_level]);

  const riskLevel = clause.risk_level?.toLowerCase();
  const borderColor = riskHexColor(riskLevel);

  return (
    <div
      ref={registerRef}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative cursor-pointer rounded-lg border-l-[3px] px-3 py-2.5 text-sm leading-relaxed transition-all duration-300",
        isSelected ? "ring-1" : ""
      )}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-4px)",
        transition: "opacity 0.3s ease, transform 0.3s ease, background 0.3s, box-shadow 0.3s",
        borderLeftColor: visible ? borderColor : "transparent",
        background: visible
          ? isSelected
            ? `${borderColor}22`
            : isChatContext
            ? `${borderColor}18`
            : hovered
            ? `${borderColor}14`
            : `${borderColor}0a`
          : "transparent",
        animation: pulse
          ? `risk-pulse-${riskLevel === "critical" ? "critical" : riskLevel === "high" ? "high" : "medium"} 700ms ease-out`
          : "none",
        boxShadow: isSelected
          ? `0 0 0 1px ${borderColor}50`
          : isChatContext
          ? `0 0 0 1px #3B82F660, inset 0 0 0 1px #3B82F620`
          : "none",
        outline: isChatContext ? "none" : undefined,
      }}
    >
      {/* Hover tooltip with risk badge */}
      {hovered && !isSelected && (
        <div
          className="absolute right-2 top-2 rounded-full border px-2 py-0.5 text-xs font-semibold"
          style={{
            color: borderColor,
            background: `${borderColor}15`,
            borderColor: `${borderColor}40`,
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          {clause.risk_level?.toUpperCase()} · {formatRiskPercent(clause.risk_score)}
        </div>
      )}

      {clause.section_heading && (
        <p className="section-heading">
          {clause.section_heading}
        </p>
      )}
      <p style={{ fontSize: "15px", lineHeight: 1.75 }}>
        {clause.clause_text}
      </p>
    </div>
  );
}

// ─── Analysis panel ───────────────────────────────────────────────────────────
function AnalysisPanel({
  contract,
  clause,
  summary,
  clauses,
  scrollRef,
  clauseRefs,
  onClauseClick,
  onClearClause,
}: {
  contract: Contract | null;
  clause: Clause | null;
  summary: ContractAnalysisSummary | null;
  clauses: Clause[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  clauseRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  onClauseClick?: (c: Clause) => void;
  onClearClause?: () => void;
}) {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth">
      {/* Overall risk gauge — always visible at the top */}
      {summary && <RiskGauge summary={summary} />}

      {/* Contract metadata — parties, governing law, dates */}
      {contract && <ContractMetaCard contract={contract} />}

      {/* Selected clause detail or top risks + executive summary */}
      {clause ? (
        <>
          {onClearClause && (
            <button
              onClick={onClearClause}
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--accent-primary)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Overview
            </button>
          )}
          <ClauseDetail clause={clause} clauseRefs={clauseRefs} />
        </>
      ) : (
        <>
          {contract?.summary && (
            <div
              className="rounded-xl border p-4"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
                Executive Summary
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {contract.summary}
              </p>
            </div>
          )}
          <ClauseList clauses={clauses} clauseRefs={clauseRefs} onClauseClick={onClauseClick} />
        </>
      )}
    </div>
  );
}


function RiskGauge({ summary }: { summary: ContractAnalysisSummary }) {
  const targetPct = Math.round((summary.overall_risk_score ?? 0) * 100);
  const level = summary.risk_level ?? "low";
  const [displayPct, setDisplayPct] = useState(0);
  const [barWidth, setBarWidth] = useState(0);

  // Animated counter — counts from 0 to the final score over ~1.2s
  useEffect(() => {
    if (targetPct === 0) return;
    let frame = 0;
    const totalFrames = 60; // ~1s at 60fps
    const raf = () => {
      frame++;
      const progress = Math.min(frame / totalFrames, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPct(Math.round(eased * targetPct));
      setBarWidth(eased * targetPct);
      if (progress < 1) requestAnimationFrame(raf);
    };
    const id = requestAnimationFrame(raf);
    return () => cancelAnimationFrame(id);
  }, [targetPct]);

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{
        background: "var(--bg-secondary)",
        borderColor: `${riskHexColor(level)}30`,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          Overall Risk Score
        </span>
        <span
          className="text-3xl font-bold tabular-nums"
          style={{ color: riskHexColor(level) }}
        >
          {displayPct}%
        </span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${barWidth}%`,
            background: `linear-gradient(90deg, ${riskHexColor(level)}aa, ${riskHexColor(level)})`,
            transition: "none",
          }}
        />
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
        {level === "critical" && "This contract has critical provisions requiring immediate attention before signing."}
        {level === "high" && "Significant risks identified. Key provisions should be negotiated before execution."}
        {level === "medium" && "Moderate risk profile. Several provisions warrant review and possible negotiation."}
        {level === "low" && "Low risk profile. Standard provisions — proceed with normal due diligence."}
      </p>
      <div className="grid grid-cols-4 gap-2 pt-1">
        {(["critical", "high", "medium", "low"] as const).map((lvl) => (
          <div key={lvl} className="text-center">
            <p className="text-xl font-bold tabular-nums" style={{ color: riskHexColor(lvl) }}>
              {summary.risk_distribution[lvl]}
            </p>
            <p className="text-xs capitalize mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              {lvl}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContractMetaCard({ contract }: { contract: Contract }) {
  const parties = contract.parties && typeof contract.parties === "object"
    ? (contract.parties as { names?: string[] }).names ?? []
    : [];

  const rows: { icon: React.ReactNode; label: string; value: string | null }[] = [
    {
      icon: <Users className="h-3.5 w-3.5" />,
      label: "Parties",
      value: parties.length > 0 ? parties.join(" / ") : null,
    },
    {
      icon: <Scale className="h-3.5 w-3.5" />,
      label: "Governing Law",
      value: contract.governing_law ?? null,
    },
    {
      icon: <Calendar className="h-3.5 w-3.5" />,
      label: "Effective",
      value: contract.effective_date ?? null,
    },
    {
      icon: <Calendar className="h-3.5 w-3.5" />,
      label: "Expires",
      value: contract.expiration_date ?? null,
    },
  ].filter((r) => r.value);

  if (rows.length === 0) return null;

  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
        Contract Details
      </p>
      <div className="space-y-2">
        {rows.map(({ icon, label, value }) => (
          <div key={label} className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0" style={{ color: "var(--text-tertiary)" }}>{icon}</span>
            <div className="min-w-0">
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{label}: </span>
              <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{value}</span>
            </div>
          </div>
        ))}
        {contract.contract_type && (
          <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--border-primary)" }}>
            <span
              className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
            >
              {contract.contract_type}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniRiskBar({ score, level }: { score: number | null; level: string | null }) {
  const [width, setWidth] = useState(0);
  const target = Math.round((score ?? 0) * 100);
  useEffect(() => {
    const t = setTimeout(() => setWidth(target), 60);
    return () => clearTimeout(t);
  }, [target]);
  return (
    <div className="h-1 rounded-full overflow-hidden mt-1" style={{ background: "var(--bg-tertiary)" }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          background: `linear-gradient(90deg, ${riskHexColor(level)}99, ${riskHexColor(level)})`,
          transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </div>
  );
}

function ClauseDetail({
  clause,
  clauseRefs,
}: {
  clause: Clause;
  clauseRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  const { displayed: displayedExplanation, isDone } = useTypewriter(
    clause.explanation ?? "",
    { speed: 12 }
  );

    return (
    <div
      ref={(el) => { clauseRefs.current[clause.id] = el; }}
      className="space-y-4"
    >
      {/* Risk header */}
      <div
        className="rounded-xl border p-4"
        style={{
          background: "var(--bg-secondary)",
          borderColor: `${riskHexColor(clause.risk_level)}40`,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
            style={{
              color: riskHexColor(clause.risk_level),
              background: `${riskHexColor(clause.risk_level)}15`,
              borderColor: `${riskHexColor(clause.risk_level)}40`,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: riskHexColor(clause.risk_level) }}
            />
            {clause.risk_level ?? "unknown"}
          </span>
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            {formatRiskPercent(clause.risk_score)} risk score
              </span>
              {clause.metadata_?.confidence != null && (
            <span
              className="rounded-lg px-2 py-0.5 text-xs"
              style={{ background: "var(--bg-tertiary)", color: "var(--text-tertiary)" }}
              title="AI confidence in this assessment"
            >
                  {Math.round(clause.metadata_.confidence * 100)}% confidence
                </span>
              )}
              {clause.clause_type && (
            <span
              className="ml-auto rounded-lg px-2 py-0.5 text-xs capitalize"
              style={{ background: "var(--bg-tertiary)", color: "var(--text-tertiary)" }}
            >
                  {clause.clause_type.replace(/_/g, " ")}
                </span>
              )}
            </div>
        {/* Mini risk bar — visual context for the score number */}
        <MiniRiskBar score={clause.risk_score} level={clause.risk_level} />
        {clause.section_heading && (
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-tertiary)" }}>
            {clause.section_heading}
          </p>
        )}
        {/* Clause text excerpt */}
        <blockquote
          className="mt-3 border-l-2 pl-3 text-xs leading-relaxed line-clamp-5"
          style={{
            borderColor: `${riskHexColor(clause.risk_level)}50`,
            color: "var(--text-tertiary)",
            fontFamily: "Georgia, Charter, 'Times New Roman', serif",
          }}
        >
          {clause.clause_text}
        </blockquote>
      </div>

      {/* Explanation — typewriter with markdown */}
            {clause.explanation && (
        <div
          className="rounded-xl border p-4"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-tertiary)" }}>
            Analysis
          </p>
          <div
            className={cn(
              "cg-prose text-sm",
              !isDone && "typewriter-cursor",
              isDone && "typewriter-cursor-done"
            )}
          >
            <ReactMarkdown>{displayedExplanation}</ReactMarkdown>
                </div>
              </div>
            )}

      {/* Suggestion */}
      {clause.suggestion && (
        <div
          className="rounded-xl border p-4"
          style={{
            background: "rgba(34,197,94,0.05)",
            borderColor: "rgba(34,197,94,0.2)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5"
            style={{ color: "var(--risk-low)" }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Suggested Alternative
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "#86efac" }}>
            {clause.suggestion}
          </p>
        </div>
      )}
      </div>
  );
}

function ClauseList({
  clauses,
  clauseRefs,
  onClauseClick,
}: {
  clauses: Clause[];
  clauseRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  onClauseClick?: (c: Clause) => void;
}) {
  const criticalHigh = clauses
    .filter((c) => c.risk_level === "critical" || c.risk_level === "high")
    .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
    .slice(0, 8);

  const topRisks = criticalHigh.length > 0
    ? criticalHigh
    : clauses
        .filter((c) => c.risk_level === "medium")
        .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
        .slice(0, 5);

  if (topRisks.length === 0) {
    return (
      <p className="text-sm text-center py-8" style={{ color: "var(--text-tertiary)" }}>
        Click a clause in the document to see its analysis.
      </p>
    );
  }

  return (
    <div>
      <p
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "var(--text-tertiary)" }}
      >
        {criticalHigh.length > 0 ? "Top Risk Findings" : "Notable Clauses"}
      </p>
      <div className="space-y-2">
        {topRisks.map((c) => (
          <button
            key={c.id}
            ref={(el) => { clauseRefs.current[c.id] = el as HTMLDivElement | null; }}
            onClick={() => onClauseClick?.(c)}
            className="w-full text-left rounded-xl border p-3 transition-all"
            style={{
              background: "var(--bg-secondary)",
              borderColor: `${riskHexColor(c.risk_level)}30`,
              cursor: onClauseClick ? "pointer" : "default",
            }}
            onMouseEnter={(e) => {
              if (onClauseClick) {
                (e.currentTarget as HTMLElement).style.borderColor = riskHexColor(c.risk_level);
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 1px ${riskHexColor(c.risk_level)}40`;
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = `${riskHexColor(c.risk_level)}30`;
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ background: riskHexColor(c.risk_level) }}
              />
              <span
                className="text-xs font-semibold capitalize"
                style={{ color: riskHexColor(c.risk_level) }}
              >
                {c.risk_level}
              </span>
              <span className="text-xs ml-auto" style={{ color: "var(--text-tertiary)" }}>
                {c.clause_type?.replace(/_/g, " ")}
              </span>
              {onClauseClick && (
                <ChevronRight className="h-3 w-3 shrink-0" style={{ color: "var(--text-tertiary)" }} />
              )}
            </div>
            <p
              className="text-xs leading-relaxed line-clamp-3"
              style={{ color: "var(--text-secondary)" }}
            >
              {c.explanation ? stripMd(c.explanation) : c.clause_text?.slice(0, 160)}
            </p>
          </button>
        ))}
      </div>
      <p
        className="mt-4 text-center text-xs"
        style={{ color: "var(--text-tertiary)" }}
      >
        Click any clause on the left to see full AI analysis
      </p>
    </div>
  );
}

/** Strip common markdown syntax for plain-text snippet previews. */
function stripMd(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
    .trim();
}

// ─── Chat panel ────────────────────────────────────────────────────────────────
const EXAMPLE_QUESTIONS = [
  "Is the indemnification mutual or one-sided?",
  "What are the termination provisions?",
  "Are there any change-of-control clauses?",
  "What is the limitation of liability?",
];

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

function ChatPanel({
  contractId,
  onContextClauses,
}: {
  contractId: string;
  onContextClauses?: (ids: string[]) => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [heatmapPulse, setHeatmapPulse] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing chat history on mount
  useEffect(() => {
    chatApi.history(contractId)
      .then((res) => {
        // Backend returns { items: [...], contract_id, ... } — unwrap the array
        const raw: { role: "user" | "assistant"; content: string }[] =
          Array.isArray(res.data) ? res.data : (res.data?.items ?? res.data?.messages ?? []);
        const history: ChatMsg[] = raw.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        setMessages(history);
      })
      .catch(() => { /* no history or error — start fresh */ })
      .finally(() => setHistoryLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setStreaming(true);

    // Add placeholder assistant message
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", streaming: true },
    ]);

    try {
      let fullContent = "";
      for await (const event of chatApi.send(contractId, msg)) {
        if (event.type === "context") {
          // Surface clause IDs to the document heatmap and show brief pulse indicator
          onContextClauses?.(event.clause_ids);
          if (event.clause_ids.length > 0) {
            setHeatmapPulse(true);
            setTimeout(() => setHeatmapPulse(false), 2500);
          }
        } else if (event.type === "error") {
          // Backend reported an error mid-stream
          fullContent = `I encountered an error: ${event.detail}. Please try again.`;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: fullContent, streaming: false };
            return updated;
          });
          break;
        } else if (event.type === "token") {
          fullContent += event.content;
        setMessages((prev) => {
          const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: fullContent,
              streaming: true,
            };
          return updated;
        });
        }
      }
      // Mark done
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: fullContent,
          streaming: false,
        };
        return updated;
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "I encountered an error. Please try again.",
          streaming: false,
        };
        return updated;
      });
    } finally {
      setStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {historyLoading ? (
          <div className="flex items-center justify-center h-full">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }}
            />
          </div>
        ) : messages.length === 0 ? (
          <EmptyChat onQuestion={(q) => sendMessage(q)} />
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Heatmap sync indicator */}
      {heatmapPulse && (
        <div
          className="mx-4 mb-2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
          style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent-primary)", border: "1px solid rgba(59,130,246,0.25)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "var(--accent-primary)" }} />
          Heatmap updated — relevant clauses highlighted
        </div>
      )}

      {/* Input */}
      <div
        className="border-t p-4"
        style={{ borderColor: "var(--border-primary)" }}
      >
        <div
          className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-primary)",
          }}
          onFocus={() => {}}
        >
        <input
            ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          placeholder="Ask about this contract..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--text-primary)" }}
            disabled={streaming}
        />
        <button
            onClick={() => sendMessage()}
          disabled={streaming || !input.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-all disabled:opacity-40"
            style={{
              background: input.trim() && !streaming ? "var(--accent-primary)" : "var(--bg-tertiary)",
            }}
          >
            <Send className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px]" style={{ color: "var(--text-tertiary)", opacity: 0.6 }}>
          Press Enter to send
        </p>
      </div>
    </div>
  );
}

function EmptyChat({ onQuestion }: { onQuestion: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-8">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl mb-4"
        style={{ background: "var(--accent-muted)" }}
      >
        <Shield className="h-6 w-6" style={{ color: "var(--accent-primary)" }} />
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        Ask me anything about this contract
      </p>
      <p className="text-xs mb-5 text-center max-w-[240px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
        I&apos;ve read every clause. Ask about risk, obligations, or specific provisions.
      </p>
      <div className="w-full space-y-2">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onQuestion(q)}
            className="w-full rounded-xl border px-4 py-2.5 text-left text-xs transition-colors flex items-center justify-between group"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-primary)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border-secondary)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border-primary)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
            }}
          >
            {q}
            <ChevronRight className="h-3 w-3 shrink-0 ml-2 opacity-50" />
        </button>
        ))}
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMsg }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser ? "rounded-br-sm" : "rounded-bl-sm"
        )}
        style={{
          background: isUser ? "var(--accent-primary)" : "var(--bg-secondary)",
          color: isUser ? "#fff" : "var(--text-primary)",
          border: isUser ? "none" : "1px solid var(--border-primary)",
        }}
      >
        {message.content ? (
          isUser ? (
            <span>{message.content}</span>
          ) : (
            <div
              className={cn(
                "cg-prose text-sm",
                message.streaming && "typewriter-cursor",
                !message.streaming && "typewriter-cursor-done"
              )}
            >
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )
        ) : (
          <span className="flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 rounded-full animate-bounce"
              style={{ background: "var(--text-tertiary)", animationDelay: "0ms" }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full animate-bounce"
              style={{ background: "var(--text-tertiary)", animationDelay: "150ms" }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full animate-bounce"
              style={{ background: "var(--text-tertiary)", animationDelay: "300ms" }}
            />
          </span>
        )}
      </div>
    </div>
  );
}
