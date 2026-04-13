"use client";

import { useEffect, useState, useRef, use, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  FileText,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Calendar,
  Scale,
  Users,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Download,
  Copy,
  X,
  ExternalLink,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import CounterLoader from "@/components/ui/counter-loader";
import { Logo } from "@/components/ui/logo";
import ReactMarkdown from "react-markdown";
import { contractsApi, clausesApi, analysisApi, chatApi } from "@/lib/api";
import { useContractStore } from "@/stores/contract-store";
import { usePolling } from "@/hooks/use-polling";
import { useTypewriter } from "@/hooks/use-typewriter";
import { cn, riskHexColor, formatRiskPercent } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
  const [exportModalOpen, setExportModalOpen] = useState(false);
  // Clause IDs surfaced by the AI chat as relevant context — highlights them in the heatmap
  const [chatContextIds, setChatContextIds] = useState<Set<string>>(new Set());
  const analysisScrollRef = useRef<HTMLDivElement>(null);
  const clauseRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const documentClauseRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Issue count badge for the Analysis tab
  const criticalHighCount = useMemo(
    () => clauses.filter((c) => c.risk_level === "critical" || c.risk_level === "high").length,
    [clauses]
  );

  // ── Clause navigation (risk-first order for step-through) ──────────────────
  // Risk-sorted so critical clauses come first when stepping through
  const navClauses = useMemo(() => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...clauses].sort((a, b) => {
      const ao = order[a.risk_level ?? "low"] ?? 3;
      const bo = order[b.risk_level ?? "low"] ?? 3;
      if (ao !== bo) return ao - bo;
      return (b.risk_score ?? 0) - (a.risk_score ?? 0);
    });
  }, [clauses]);

  const navIndex = useMemo(
    () => (selectedClause ? navClauses.findIndex((c) => c.id === selectedClause.id) : -1),
    [selectedClause, navClauses]
  );

  const handleNavClause = useCallback((clause: Clause) => {
    setSelectedClause(clause);
    setActiveTab("analysis");
    setTimeout(() => {
      // Scroll doc panel to the highlighted clause
      documentClauseRefs.current[clause.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      // Scroll analysis panel back to top so the nav bar + detail are immediately visible
      analysisScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  }, [analysisScrollRef]);

  const handleNextClause = useCallback(() => {
    if (navIndex < navClauses.length - 1) handleNavClause(navClauses[navIndex + 1]);
  }, [navIndex, navClauses, handleNavClause]);

  const handlePrevClause = useCallback(() => {
    if (navIndex > 0) handleNavClause(navClauses[navIndex - 1]);
  }, [navIndex, navClauses, handleNavClause]);

  // Keyboard arrow navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedClause) return;
      // Don't hijack arrows when user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); handleNextClause(); }
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   { e.preventDefault(); handlePrevClause(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedClause, handleNextClause, handlePrevClause]);

  // Robust polling via the pre-built hook (stale-closure-safe)
  usePolling(
    async () => {
      try {
        const res = await analysisApi.status(id);
        const status = res.data.status;

        if (status === "analyzed") {
          setPolling(false);
          await loadAnalysis();
          const contractRes = await contractsApi.get(id);
          setCurrentContract(contractRes.data);
          return true; // stop
        }
        if (status === "error") {
          setPolling(false);
          const contractRes = await contractsApi.get(id);
          setCurrentContract(contractRes.data);
          return true; // stop
        }
        // If contract is still "uploaded" (pipeline hasn't started yet),
        // trigger the analysis explicitly so it doesn't stay stuck
        if (status === "uploaded" || status === "pending") {
          try {
            await analysisApi.triggerAnalysis(id);
          } catch {
            // Already processing or another error — keep polling
          }
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
    // Clear stale data from a previous contract immediately
    setClauses([]);
    setAnalysisSummary(null);
    setSelectedClause(null);
    setHeatmapReady(false);
    try {
      const contractRes = await contractsApi.get(id);
      const contract: Contract = contractRes.data;
      setCurrentContract(contract);

      if (contract.status === "analyzed") {
        await loadAnalysis();
      } else if (
        contract.status === "processing" ||
        contract.status === "uploaded" ||
        contract.status === "pending"
      ) {
        // Any pre-analysis state → poll until done
        setPolling(true);
      }
      // "error" is handled in the render below
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Auto-retry once if the contract is analyzed but clauses somehow came back empty
  useEffect(() => {
    if (loading || polling) return;
    if (currentContract?.status !== "analyzed") return;
    if (clauses.length > 0) return;
    const t = setTimeout(() => {
      loadAnalysis();
    }, 1500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, polling, currentContract?.status]);

  const loadAnalysis = async () => {
    // Fetch clauses and summary independently — a summary failure must not block clause display
    const [clauseResult, summaryResult] = await Promise.allSettled([
      clausesApi.list(id),
      clausesApi.summary(id),
    ]);

    if (clauseResult.status === "fulfilled") {
      const data = clauseResult.value.data;
      const items: Clause[] = Array.isArray(data?.clauses)
        ? data.clauses
        : Array.isArray(data)
        ? data
        : [];
      setClauses(items);
      setTimeout(() => setHeatmapReady(true), 100);

      // Auto-select the highest-risk clause so the right panel is immediately useful
      if (items.length > 0) {
        const riskOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        const topClause = [...items].sort((a, b) => {
          const ao = riskOrder[a.risk_level ?? "low"] ?? 3;
          const bo = riskOrder[b.risk_level ?? "low"] ?? 3;
          if (ao !== bo) return ao - bo;
          return (b.risk_score ?? 0) - (a.risk_score ?? 0);
        })[0];
        // Only auto-select if something notable (high/critical/medium) found
        if (topClause && (topClause.risk_level === "critical" || topClause.risk_level === "high" || topClause.risk_level === "medium")) {
          setSelectedClause(topClause);
          setActiveTab("analysis");
        }
      }
    } else {
      console.error("Failed to load clauses:", clauseResult.reason);
    }

    if (summaryResult.status === "fulfilled") {
      setAnalysisSummary(summaryResult.value.data);
    } else {
      console.error("Failed to load summary:", summaryResult.reason);
    }
  };

  const triggerReanalysis = async () => {
    try {
      await analysisApi.triggerAnalysis(id);
      setPolling(true);
    } catch (err) {
      console.error("Failed to trigger re-analysis:", err);
    }
  };

  const handleClauseClick = handleNavClause;

  if (loading) {
    return (
      <div className="flex h-screen flex-col" style={{ background: "var(--bg-primary)" }}>
        {/* Keep real header during skeleton so there's no layout shift */}
        <ReviewHeader
          contract={null}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onBack={() => router.push("/dashboard")}
          onReport={() => setExportModalOpen(true)}
          criticalHighCount={0}
        />
        <div className="flex flex-1 overflow-hidden">
          {/* Document panel skeleton */}
          <div
            className="w-[55%] border-r overflow-hidden"
            style={{ background: "var(--bg-doc)", borderColor: "var(--border-primary)" }}
          >
            <div className="mx-auto max-w-2xl px-8 py-10 animate-pulse">
              <div className="h-3 w-28 rounded mb-3" style={{ background: "var(--bg-tertiary)" }} />
              <div className="h-5 w-72 rounded mb-8" style={{ background: "var(--bg-tertiary)" }} />
              {[90, 100, 75, 100, 88, 60, 100, 82].map((w, i) => (
                <div key={i} className="mb-5 space-y-2">
                  <div className="h-3 rounded" style={{ background: "var(--bg-tertiary)", width: `${w}%` }} />
                  <div className="h-3 w-full rounded" style={{ background: "var(--bg-tertiary)" }} />
                  <div className="h-3 rounded" style={{ background: "var(--bg-tertiary)", width: `${w - 20}%` }} />
                </div>
              ))}
            </div>
          </div>
          {/* Analysis panel skeleton */}
          <div
            className="w-[45%] p-5 space-y-3 animate-pulse overflow-hidden"
            style={{ background: "var(--bg-primary)" }}
          >
            <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--bg-secondary)" }}>
              <div className="h-3 w-24 rounded" style={{ background: "var(--bg-tertiary)" }} />
              <div className="h-9 w-16 rounded" style={{ background: "var(--bg-tertiary)" }} />
              <div className="h-2.5 w-full rounded-full" style={{ background: "var(--bg-tertiary)" }} />
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[1,2,3,4].map((k) => (
                  <div key={k} className="space-y-1">
                    <div className="h-5 rounded" style={{ background: "var(--bg-tertiary)" }} />
                    <div className="h-2.5 w-8 rounded mx-auto" style={{ background: "var(--bg-tertiary)" }} />
                  </div>
                ))}
              </div>
            </div>
            {[1,2,3].map((k) => (
              <div key={k} className="rounded-xl p-4 space-y-2" style={{ background: "var(--bg-secondary)" }}>
                <div className="h-3 w-16 rounded" style={{ background: "var(--bg-tertiary)" }} />
                <div className="h-3 w-full rounded" style={{ background: "var(--bg-tertiary)" }} />
                <div className="h-3 w-3/4 rounded" style={{ background: "var(--bg-tertiary)" }} />
              </div>
            ))}
          </div>
        </div>
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
        onReport={() => setExportModalOpen(true)}
        criticalHighCount={criticalHighCount}
      />
      {/* ── Export modal ── */}
      {exportModalOpen && (
        <ExportModal
          contractId={id}
          contract={currentContract}
          summary={analysisSummary}
          clauses={clauses}
          onClose={() => setExportModalOpen(false)}
          onFullReport={() => { setExportModalOpen(false); router.push(`/summary/${id}`); }}
        />
      )}

      {/* ── Body ── */}
      {polling ? (
        <ProcessingState contract={currentContract} />
      ) : currentContract?.status === "error" ? (
        <ErrorState onBack={() => router.push("/dashboard")} onRetry={triggerReanalysis} />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left — Document viewer */}
          <div
            className="w-[55%] overflow-y-auto border-r scroll-smooth"
            style={{
              borderColor: "var(--border-primary)",
              background: "var(--bg-doc)",
            }}
          >
            <DocumentPanel
              contract={currentContract}
              clauses={clauses}
              selectedClause={selectedClause}
              heatmapReady={heatmapReady}
              chatContextIds={chatContextIds}
              onClauseClick={handleClauseClick}
              documentClauseRefs={documentClauseRefs}
              onRetryAnalysis={clauses.length === 0 ? triggerReanalysis : undefined}
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
                navIndex={navIndex}
                navTotal={navClauses.length}
                onNext={handleNextClause}
                onPrev={handlePrevClause}
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
  criticalHighCount = 0,
}: {
  contract: Contract | null;
  activeTab: "analysis" | "chat";
  onTabChange: (t: "analysis" | "chat") => void;
  onBack: () => void;
  onReport: () => void;
  criticalHighCount?: number;
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

        <Logo size="sm" showWordmark={false} />

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
        {/* Analysis / Chat AI tabs */}
        <div
          className="flex items-center rounded-lg p-0.5"
          style={{ background: "var(--bg-tertiary)" }}
        >
          {(["analysis", "chat"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5"
              style={{
                background: activeTab === tab ? "var(--bg-primary)" : "transparent",
                color: activeTab === tab ? "var(--text-primary)" : "var(--text-tertiary)",
                boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
              }}
            >
              {tab === "analysis" ? (
                <>
                  <BarChart3 className="h-3 w-3" />
                  Analysis
                  {criticalHighCount > 0 && (
                    <span
                      className="inline-flex items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ background: "#EF4444", minWidth: "16px", height: "16px", padding: "0 3px" }}
                    >
                      {criticalHighCount}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <MessageSquare className="h-3 w-3" />
                  Chat AI
                </>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={onReport}
          className="ml-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5"
          style={{ color: "var(--text-tertiary)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
          }}
        >
          <FileText className="h-3.5 w-3.5" />
          Report
        </button>
        <div className="ml-1 border-l pl-2" style={{ borderColor: "var(--border-primary)" }}>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

// ─── Processing state ───────────────────────────────────────────────────────────
const PROCESSING_STEPS = [
  { label: "Extracting text", detail: "Reading document structure & raw content" },
  { label: "Chunking clauses", detail: "Splitting into individually addressable provisions" },
  { label: "Generating embeddings", detail: "Encoding every clause into vector space" },
  { label: "Running risk analysis", detail: "AI scoring each clause for legal risk" },
  { label: "Extracting metadata", detail: "Identifying parties, dates & governing law" },
];

function ProcessingState({ contract }: { contract: Contract | null }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setCurrentStep((s) => (s < PROCESSING_STEPS.length - 1 ? s + 1 : s));
    }, 4500);
    return () => clearInterval(stepTimer);
  }, []);

  useEffect(() => {
    const clock = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(clock);
  }, []);

  const filename = contract?.title || contract?.original_filename || "Contract";

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* ── Left — counter animation lives in the document panel area ── */}
      <div
        className="w-[55%] border-r flex flex-col items-center justify-center gap-12"
        style={{ background: "var(--bg-doc)", borderColor: "var(--border-primary)" }}
      >
        {/* Pixel counter grid — counts 0→9 on a 10s loop */}
        <CounterLoader />

        {/* Label underneath the counter */}
        <div className="text-center space-y-1.5">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--accent-primary)" }}
          >
            Analyzing
          </p>
          <p
            className="font-display text-xl font-bold leading-snug max-w-xs px-4"
            style={{ color: "var(--text-primary)" }}
          >
            {filename}
          </p>
          <p className="text-xs tabular-nums" style={{ color: "var(--text-tertiary)" }}>
            {elapsed}s elapsed
          </p>
        </div>
      </div>

      {/* ── Right — step progress in the analysis panel area ── */}
      <div
        className="w-[45%] flex flex-col justify-center px-8 py-10 gap-8"
        style={{ background: "var(--bg-primary)" }}
      >
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            AI Analysis in Progress
          </p>
          <h2 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Reading every clause
          </h2>
          <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            ClauseGuard is embedding and scoring each provision for legal risk.
          </p>
        </div>

        {/* Step list */}
        <div className="space-y-3">
          {PROCESSING_STEPS.map((step, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <div
                key={step.label}
                className="flex items-start gap-3.5 rounded-xl border p-3.5 transition-all"
                style={{
                  borderColor: active
                    ? "var(--accent-primary)"
                    : done
                    ? "var(--border-primary)"
                    : "var(--border-primary)",
                  background: active ? "var(--accent-subtle)" : "var(--bg-secondary)",
                  opacity: done ? 0.55 : 1,
                }}
              >
                <div className="mt-0.5 shrink-0">
                  {done ? (
                    <CheckCircle2 className="h-4 w-4" style={{ color: "var(--risk-low)" }} />
                  ) : active ? (
                    <div
                      className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin"
                      style={{
                        borderColor: "var(--accent-primary)",
                        borderTopColor: "transparent",
                      }}
                    />
                  ) : (
                    <div
                      className="h-4 w-4 rounded-full border-2"
                      style={{ borderColor: "var(--border-secondary)" }}
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className="text-sm font-medium"
                    style={{
                      color: active ? "var(--accent-primary)" : done ? "var(--text-tertiary)" : "var(--text-secondary)",
                    }}
                  >
                    {step.label}
                  </p>
                  {active && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
          Usually takes 20–30 seconds. You&apos;ll land directly in the review view when complete.
        </p>
      </div>
    </div>
  );
}

// ─── Error state ─────────────────────────────────────────────────────────────
function ErrorState({ onBack, onRetry }: { onBack: () => void; onRetry?: () => void }) {
  return (
    <div
      className="flex flex-1 items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="text-center max-w-sm px-6">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
          style={{ background: "var(--risk-critical-bg)" }}
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
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ background: "var(--accent-primary)" }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Re-analyze
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Highlight colours keyed by risk level ───────────────────────────────────
const HIGHLIGHT: Record<string, { idle: string; hover: string; selected: string; chat: string }> = {
  critical: {
    idle:     "rgba(239,68,68,0.18)",
    hover:    "rgba(239,68,68,0.30)",
    selected: "rgba(239,68,68,0.42)",
    chat:     "rgba(239,68,68,0.24)",
  },
  high: {
    idle:     "rgba(249,115,22,0.18)",
    hover:    "rgba(249,115,22,0.30)",
    selected: "rgba(249,115,22,0.42)",
    chat:     "rgba(249,115,22,0.24)",
  },
  medium: {
    idle:     "rgba(234,179,8,0.20)",
    hover:    "rgba(234,179,8,0.34)",
    selected: "rgba(234,179,8,0.48)",
    chat:     "rgba(234,179,8,0.28)",
  },
  low: {
    idle:     "rgba(34,197,94,0.10)",
    hover:    "rgba(34,197,94,0.20)",
    selected: "rgba(34,197,94,0.30)",
    chat:     "rgba(34,197,94,0.16)",
  },
};

// ─── Document panel ───────────────────────────────────────────────────────────
function DocumentPanel({
  contract,
  clauses,
  selectedClause,
  heatmapReady,
  chatContextIds,
  onClauseClick,
  documentClauseRefs,
  onRetryAnalysis,
}: {
  contract: Contract | null;
  clauses: Clause[];
  selectedClause: Clause | null;
  heatmapReady: boolean;
  chatContextIds: Set<string>;
  onClauseClick: (c: Clause) => void;
  documentClauseRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  onRetryAnalysis?: () => void;
}) {
  // Count risk levels for the summary bar
  const riskCounts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 };
    clauses.forEach((cl) => { if (cl.risk_level) c[cl.risk_level as keyof typeof c] = (c[cl.risk_level as keyof typeof c] || 0) + 1; });
    return c;
  }, [clauses]);

  if (clauses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-5" style={{ background: "var(--bg-doc)" }}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--accent-subtle)", border: "1.5px solid rgba(21,96,252,0.2)" }}>
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--accent-primary)" }} />
        </div>
        <div>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Loading analysis…</p>
          <p className="text-xs leading-relaxed max-w-xs" style={{ color: "var(--text-tertiary)" }}>
            The AI is reviewing every clause. This usually takes 15–30 seconds for a new contract.
          </p>
        </div>
        {onRetryAnalysis && (
          <button onClick={onRetryAnalysis} className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-primary)" }}>
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        )}
      </div>
    );
  }

  const parties = contract?.parties && typeof contract.parties === "object"
    ? ((contract.parties as { names?: string[] }).names ?? [])
    : [];

  return (
    <div className="min-h-full" style={{ background: "var(--bg-doc)" }}>
      {/* Sticky mini risk bar at the top of the doc panel */}
      <div
        className="sticky top-0 z-10 flex items-center gap-2 px-6 py-2 text-xs border-b"
        style={{ background: "var(--bg-doc)", borderColor: "rgba(0,0,0,0.08)" }}
      >
        <span className="font-medium mr-1 text-[10px] uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Risk:</span>
        {(["critical","high","medium","low"] as const).map((lvl) => {
          const ct = riskCounts[lvl];
          if (!ct) return null;
          const colors: Record<string,string> = { critical:"#EF4444", high:"#F97316", medium:"#CA8A04", low:"#16A34A" };
          return (
            <span key={lvl} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${colors[lvl]}18`, color: colors[lvl] }}>
              {ct} {lvl}
            </span>
          );
        })}
        <span className="ml-auto text-[10px]" style={{ color: "#9CA3AF" }}>↑ click any highlighted clause</span>
      </div>

      {/* Document paper */}
      <div className="px-6 py-8">
        <div className="mx-auto max-w-2xl bg-white" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.10), 0 8px 40px rgba(0,0,0,0.12)" }}>

          {/* Top margin with document metadata */}
          <div className="px-14 pt-12 pb-8" style={{ borderBottom: "2px solid #111" }}>
            {contract?.contract_type && (
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: "#9CA3AF" }}>
                {contract.contract_type}
              </p>
            )}
            <h1 className="text-xl font-bold leading-tight mb-4" style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#0A0A0A", letterSpacing: "-0.01em" }}>
              {contract?.title || contract?.original_filename || "Contract"}
            </h1>
            {(parties.length > 0 || contract?.effective_date || contract?.governing_law) && (
              <div className="space-y-1.5 mb-4">
                {parties.length > 0 && (
                  <p className="text-xs" style={{ color: "#374151" }}>
                    <span className="font-semibold">Parties:</span>{" "}
                    {parties.join(" and ")}
                  </p>
                )}
                {contract?.effective_date && (
                  <p className="text-xs" style={{ color: "#374151" }}>
                    <span className="font-semibold">Effective Date:</span>{" "}
                    {contract.effective_date}
                  </p>
                )}
                {contract?.governing_law && (
                  <p className="text-xs" style={{ color: "#374151" }}>
                    <span className="font-semibold">Governing Law:</span>{" "}
                    {contract.governing_law}
                  </p>
                )}
              </div>
            )}
            {/* Risk legend */}
            <div className="flex flex-wrap items-center gap-2 pt-3" style={{ borderTop: "1px solid #E5E7EB" }}>
              <span className="text-[9px] font-bold uppercase tracking-wider mr-1" style={{ color: "#9CA3AF" }}>Highlight key:</span>
              {([
                { label: "Critical risk", color: "#EF4444", bg: "rgba(239,68,68,0.18)" },
                { label: "High risk",     color: "#F97316", bg: "rgba(249,115,22,0.18)" },
                { label: "Medium risk",   color: "#CA8A04", bg: "rgba(234,179,8,0.22)" },
              ]).map(({ label, color, bg }) => (
                <span key={label} className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: bg, color }}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Clause body */}
          <div className="px-14 py-10">
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

          {/* Document footer */}
          <div className="px-14 py-4 flex items-center justify-between" style={{ borderTop: "1px solid #E5E7EB" }}>
            <span className="text-[9px] uppercase tracking-wider" style={{ color: "#D1D5DB" }}>
              Analyzed by ClauseGuard · AI-Powered Risk Review
            </span>
            <span className="text-[9px]" style={{ color: "#D1D5DB" }}>
              {clauses.length} clauses reviewed
            </span>
          </div>
        </div>
      </div>
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
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (heatmapReady) {
      const timer = setTimeout(() => setVisible(true), index * 25);
      return () => clearTimeout(timer);
    }
  }, [heatmapReady, index]);

  const riskLevel = (clause.risk_level?.toLowerCase() ?? "low") as keyof typeof HIGHLIGHT;
  const hl = HIGHLIGHT[riskLevel] ?? HIGHLIGHT.low;
  const noHighlight = riskLevel === "low" && !isSelected && !isChatContext;
  const highlightBg = noHighlight
    ? "transparent"
    : isSelected ? hl.selected : isChatContext ? hl.chat : hovered ? hl.hover : hl.idle;
  const riskColor = riskHexColor(riskLevel);

  // Left-margin bar color: only visible for critical/high/medium
  const barColor = riskLevel === "low" && !isSelected ? "transparent" : riskColor;

  return (
    <div
      ref={registerRef}
      className="relative mb-0.5"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s ease" }}
    >
      {/* Section heading */}
      {clause.section_heading && (
        <h2
          className="mt-8 mb-3 pb-1"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "13px",
            fontWeight: 700,
            color: "#111827",
            letterSpacing: "0.005em",
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          {clause.section_heading}
        </h2>
      )}

      {/* Clause row: left bar + text */}
      <div
        className="flex group/clause cursor-pointer"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Left risk indicator bar */}
        <div
          className="shrink-0 w-0.5 rounded-full mr-3 self-stretch"
          style={{
            background: barColor,
            opacity: (isSelected || hovered || isChatContext) ? 1 : riskLevel === "critical" ? 0.8 : riskLevel === "high" ? 0.6 : 0.4,
            transition: "background 0.15s, opacity 0.15s",
            minHeight: "1.2em",
          }}
        />

        <div className="flex-1 relative">
          <p
            className="leading-[1.85] py-0.5"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "13.5px",
              color: "#111827",
              background: highlightBg,
              borderRadius: "2px",
              paddingLeft: "3px",
              paddingRight: "3px",
              marginLeft: "-3px",
              marginRight: "-3px",
              transition: "background 0.15s ease",
              outline: isSelected ? `2px solid ${riskColor}45` : "none",
              outlineOffset: "2px",
            }}
          >
            {clause.clause_text}
          </p>

          {/* Floating risk badge on hover/select — right-aligned, above text */}
          {(hovered || isSelected) && riskLevel !== "low" && (
            <div
              className="absolute -top-6 right-0 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold pointer-events-none"
              style={{
                color: riskColor,
                background: `${riskColor}15`,
                borderColor: `${riskColor}45`,
                whiteSpace: "nowrap",
                zIndex: 20,
                boxShadow: "0 1px 6px rgba(0,0,0,0.15)",
                backdropFilter: "blur(4px)",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: riskColor }} />
              {clause.risk_level?.toUpperCase()} · {formatRiskPercent(clause.risk_score)}
              {isChatContext && " · AI context"}
            </div>
          )}
        </div>
      </div>
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
  navIndex,
  navTotal,
  onNext,
  onPrev,
}: {
  contract: Contract | null;
  clause: Clause | null;
  summary: ContractAnalysisSummary | null;
  clauses: Clause[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  clauseRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  onClauseClick?: (c: Clause) => void;
  onClearClause?: () => void;
  navIndex: number;
  navTotal: number;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Clause step-through nav bar — only when a clause is selected ── */}
      {clause && (
        <div
          className="flex items-center justify-between gap-2 border-b px-4 py-2.5 shrink-0"
          style={{ borderColor: "var(--border-primary)", background: "var(--bg-secondary)" }}
        >
          {/* Back to overview */}
          <button
            onClick={onClearClause}
            className="flex items-center gap-1 text-xs rounded-lg px-2 py-1.5 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Overview
          </button>

          {/* Prev / counter / Next */}
          <div className="flex items-center gap-1">
            <button
              onClick={onPrev}
              disabled={navIndex <= 0}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:opacity-30"
              style={{ color: "var(--text-secondary)" }}
              title="Previous clause (←)"
              onMouseEnter={(e) => { if (navIndex > 0) (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="text-xs tabular-nums px-2" style={{ color: "var(--text-tertiary)", minWidth: "56px", textAlign: "center" }}>
              {navIndex + 1} / {navTotal}
            </span>

            <button
              onClick={onNext}
              disabled={navIndex >= navTotal - 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:opacity-30"
              style={{ color: "var(--text-secondary)" }}
              title="Next clause (→)"
              onMouseEnter={(e) => { if (navIndex < navTotal - 1) (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Keyboard hint */}
          <span className="text-[10px] hidden sm:block" style={{ color: "var(--text-tertiary)", opacity: 0.6 }}>
            ← → keys
          </span>
        </div>
      )}

      {/* ── Scrollable content ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth">
        {clause ? (
          /* Clause selected: jump straight to analysis — no gauge/meta overhead */
          <ClauseDetail clause={clause} clauseRefs={clauseRefs} />
        ) : (
          /* Overview: show gauge, meta, executive summary, and top risk findings */
          <>
            {summary && <RiskGauge summary={summary} />}
            {contract && <ContractMetaCard contract={contract} />}
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
    </div>
  );
}


function RiskGauge({ summary }: { summary: ContractAnalysisSummary }) {
  const pct = Math.round((summary.overall_risk_score ?? 0) * 100);
  const level = summary.risk_level ?? "low";
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setBarWidth(pct), 120);
    return () => clearTimeout(t);
  }, [pct]);

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
        <span className="text-3xl font-bold tabular-nums" style={{ color: riskHexColor(level) }}>
          {pct}%
        </span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${barWidth}%`,
            background: riskHexColor(level),
            transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)",
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
          background: riskHexColor(level),
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
    { speed: 4 }
  );

  const riskColor = riskHexColor(clause.risk_level);
  const riskPct = Math.round((clause.risk_score ?? 0) * 100);
  const isCriticalOrHigh = clause.risk_level === "critical" || clause.risk_level === "high";

  return (
    <div
      ref={(el) => { clauseRefs.current[clause.id] = el; }}
      className="space-y-3"
    >
      {/* ── Risk header card ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: `1px solid ${riskColor}35` }}
      >
        {/* Colored top strip */}
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, ${riskColor}, ${riskColor}40)` }}
        />
        <div className="p-4" style={{ background: "var(--bg-secondary)" }}>
          {/* Type + level row */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide"
              style={{ color: riskColor, background: `${riskColor}12`, borderColor: `${riskColor}35` }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: riskColor }} />
              {clause.risk_level ?? "unknown"} risk
            </span>
            {clause.clause_type && (
              <span
                className="rounded-full px-2.5 py-1 text-xs font-medium capitalize"
                style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-primary)" }}
              >
                {clause.clause_type.replace(/_/g, " ")}
              </span>
            )}
            {clause.metadata_?.confidence != null && (
              <span className="ml-auto text-xs" style={{ color: "var(--text-tertiary)" }} title="AI confidence">
                {Math.round(clause.metadata_.confidence * 100)}% confidence
              </span>
            )}
          </div>

          {/* Score + animated bar */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl font-black tabular-nums leading-none" style={{ color: riskColor }}>
              {riskPct}
              <span className="text-lg font-bold" style={{ opacity: 0.6 }}>%</span>
            </span>
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Risk Score
                </span>
                {isCriticalOrHigh && (
                  <span className="text-[10px] font-bold" style={{ color: riskColor }}>
                    {clause.risk_level === "critical" ? "⚠ Deal blocker" : "⚡ Negotiate before signing"}
                  </span>
                )}
              </div>
              <MiniRiskBar score={clause.risk_score} level={clause.risk_level} />
            </div>
          </div>

          {/* Clause text excerpt */}
          {clause.section_heading && (
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-tertiary)" }}>
              {clause.section_heading}
            </p>
          )}
          <blockquote
            className="border-l-2 pl-3 text-xs leading-relaxed"
            style={{
              borderColor: `${riskColor}55`,
              color: "var(--text-tertiary)",
              fontFamily: "Georgia, Charter, 'Times New Roman', serif",
              lineHeight: 1.7,
            }}
          >
            {clause.clause_text?.slice(0, 280)}{(clause.clause_text?.length ?? 0) > 280 ? "…" : ""}
          </blockquote>
        </div>
      </div>

      {/* ── AI Analysis — typewriter reveal ── */}
      {clause.explanation && (
        <div
          className="rounded-2xl border p-4"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full shrink-0" style={{ background: "var(--accent-subtle)", border: "1px solid rgba(21,96,252,0.2)" }}>
              <Sparkles className="h-3 w-3" style={{ color: "var(--accent-primary)" }} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
              AI Analysis
            </p>
            {!isDone && (
              <div className="ml-auto flex items-center gap-1">
                {[0, 100, 200].map((d) => (
                  <span key={d} className="h-1 w-1 rounded-full animate-bounce" style={{ background: "var(--accent-primary)", animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}
          </div>
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

      {/* ── TrustFoundry legal grounding ── */}
      {clause.metadata_?.legal_grounding?.verified && (clause.metadata_.legal_grounding.citations?.length ?? 0) > 0 && (
        <div
          className="rounded-2xl border p-4 space-y-3"
          style={{ background: "rgba(21,96,252,0.05)", borderColor: "rgba(21,96,252,0.20)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "rgba(21,96,252,0.15)" }}>
                <CheckCircle2 className="h-3 w-3" style={{ color: "var(--accent-primary)" }} />
              </div>
              <span className="text-xs font-bold" style={{ color: "var(--accent-primary)" }}>
                TrustFoundry Verified
              </span>
            </div>
            <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background: "rgba(34,197,94,0.08)", color: "var(--risk-low)" }}>
              {clause.metadata_.legal_grounding.source === "trustfoundry" ? "Live API" : "14M+ laws & cases"}
            </span>
          </div>
          {clause.metadata_.legal_grounding.citations.slice(0, 2).map((cit, i) => (
            <div key={i} className="rounded-xl p-3 space-y-1.5" style={{ background: "rgba(21,96,252,0.06)", border: "1px solid rgba(21,96,252,0.12)" }}>
              <p className="text-xs font-bold" style={{ color: "var(--accent-primary)" }}>
                {cit.citation}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                {cit.summary.slice(0, 220)}{cit.summary.length > 220 ? "…" : ""}
              </p>
              {cit.source_url && (
                <a
                  href={cit.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-semibold flex items-center gap-1"
                  style={{ color: "var(--accent-primary)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  View source →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Suggested alternative ── */}
      {clause.suggestion && (
        <div
          className="rounded-2xl border p-4"
          style={{ background: "rgba(34,197,94,0.04)", borderColor: "rgba(34,197,94,0.22)" }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "rgba(34,197,94,0.12)" }}>
              <Sparkles className="h-3 w-3" style={{ color: "var(--risk-low)" }} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--risk-low)" }}>
              Suggested Negotiation Language
            </p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
            &ldquo;{clause.suggestion}&rdquo;
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
  const criticalClauses = clauses.filter((c) => c.risk_level === "critical");
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
      {/* Step-through CTA — most prominent affordance for the demo */}
      {topRisks.length > 0 && onClauseClick && (
        <button
          onClick={() => onClauseClick(topRisks[0])}
          className="w-full flex items-center justify-between rounded-2xl border px-4 py-3.5 mb-4 text-left transition-all"
          style={{ background: "var(--accent-subtle)", borderColor: "rgba(21,96,252,0.25)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(21,96,252,0.12)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(21,96,252,0.4)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-subtle)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(21,96,252,0.25)"; }}
        >
          <div>
            <p className="text-xs font-bold" style={{ color: "var(--accent-primary)" }}>
              Step through all findings →
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              Use ← → arrow keys or navigation buttons · highest risk first
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "var(--accent-primary)" }} />
        </button>
      )}

      {/* Deal-breaker alert — only when critical clauses exist */}
      {criticalClauses.length > 0 && (
        <div
          className="flex items-start gap-3 rounded-xl border p-3.5 mb-4"
          style={{
            background: "rgba(239,68,68,0.07)",
            borderColor: "rgba(239,68,68,0.30)",
          }}
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--risk-critical)" }} />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color: "var(--risk-critical)" }}>
              Deal-Breaker Alert
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {criticalClauses.length} critical provision{criticalClauses.length !== 1 ? "s" : ""} found.
              This contract cannot close on current terms.
            </p>
          </div>
        </div>
      )}

      <p
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "var(--text-tertiary)" }}
      >
        {criticalHigh.length > 0 ? "Top Risk Findings" : "Notable Clauses"}
      </p>
      <div className="space-y-2">
        {topRisks.map((c, idx) => (
          <button
            key={c.id}
            ref={(el) => { clauseRefs.current[c.id] = el as HTMLDivElement | null; }}
            onClick={() => onClauseClick?.(c)}
            className="w-full text-left rounded-xl border p-3.5 transition-all"
            style={{
              background: idx === 0 && c.risk_level === "critical"
                ? "rgba(239,68,68,0.06)"
                : "var(--bg-secondary)",
              borderColor: idx === 0 && c.risk_level === "critical"
                ? "rgba(239,68,68,0.35)"
                : `${riskHexColor(c.risk_level)}28`,
              cursor: onClauseClick ? "pointer" : "default",
            }}
            onMouseEnter={(e) => {
              if (onClauseClick) {
                (e.currentTarget as HTMLElement).style.borderColor = `${riskHexColor(c.risk_level)}60`;
                (e.currentTarget as HTMLElement).style.background = `${riskHexColor(c.risk_level)}0e`;
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = idx === 0 && c.risk_level === "critical"
                ? "rgba(239,68,68,0.35)"
                : `${riskHexColor(c.risk_level)}28`;
              (e.currentTarget as HTMLElement).style.background = idx === 0 && c.risk_level === "critical"
                ? "rgba(239,68,68,0.06)"
                : "var(--bg-secondary)";
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{
                  color: riskHexColor(c.risk_level),
                  background: `${riskHexColor(c.risk_level)}12`,
                  borderColor: `${riskHexColor(c.risk_level)}35`,
                }}
              >
                {c.risk_level}
              </span>
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {c.clause_type?.replace(/_/g, " ")}
              </span>
              {onClauseClick && (
                <ChevronRight className="h-3 w-3 shrink-0 ml-auto" style={{ color: "var(--text-tertiary)" }} />
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
        Click any highlighted clause in the document for full AI analysis
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

// ─── Export Modal ─────────────────────────────────────────────────────────────
function ExportModal({
  contractId,
  contract,
  summary,
  clauses,
  onClose,
  onFullReport,
}: {
  contractId: string;
  contract: Contract | null;
  summary: ContractAnalysisSummary | null;
  clauses: Clause[];
  onClose: () => void;
  onFullReport: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const buildMarkdown = () => {
    const lines: string[] = [];
    const title = contract?.title || contract?.original_filename || "Contract";
    lines.push(`# Due Diligence Report: ${title}`);
    lines.push(`**Generated:** ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`);
    if (contract?.contract_type) lines.push(`**Type:** ${contract.contract_type}`);
    if (contract?.governing_law) lines.push(`**Governing Law:** ${contract.governing_law}`);
    if (contract?.effective_date) lines.push(`**Effective Date:** ${contract.effective_date}`);
    lines.push("");
    if (summary) {
      const pct = Math.round((summary.overall_risk_score ?? 0) * 100);
      lines.push(`## Overall Risk: ${pct}% (${(summary.risk_level ?? "").toUpperCase()})`);
      lines.push("");
      lines.push(`| Severity | Count |`);
      lines.push(`|----------|-------|`);
      lines.push(`| Critical | ${summary.risk_distribution.critical} |`);
      lines.push(`| High     | ${summary.risk_distribution.high} |`);
      lines.push(`| Medium   | ${summary.risk_distribution.medium} |`);
      lines.push(`| Low      | ${summary.risk_distribution.low} |`);
      lines.push("");
    }
    if (contract?.summary) {
      lines.push("## Executive Summary");
      lines.push(contract.summary);
      lines.push("");
    }
    const highRisk = clauses
      .filter((c) => c.risk_level === "critical" || c.risk_level === "high")
      .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));
    if (highRisk.length > 0) {
      lines.push("## Critical & High-Risk Findings");
      highRisk.forEach((c, i) => {
        lines.push(`### ${i + 1}. ${c.clause_type?.replace(/_/g, " ") ?? "Clause"} — ${(c.risk_level ?? "").toUpperCase()}`);
        if (c.section_heading) lines.push(`**Section:** ${c.section_heading}`);
        lines.push(`**Risk Score:** ${Math.round((c.risk_score ?? 0) * 100)}%`);
        lines.push("");
        lines.push(`> ${c.clause_text?.slice(0, 400)}${(c.clause_text?.length ?? 0) > 400 ? "…" : ""}`);
        lines.push("");
        if (c.explanation) { lines.push(`**Analysis:** ${c.explanation}`); lines.push(""); }
        if (c.suggestion) { lines.push(`**Suggested Alternative:** ${c.suggestion}`); lines.push(""); }
      });
    }
    lines.push("---");
    lines.push("*Generated by ClauseGuard · AI-Powered Contract Intelligence*");
    return lines.join("\n");
  };

  const downloadMarkdown = () => {
    const md = buildMarkdown();
    const filename = ((contract?.title || contract?.original_filename || "report")
      .replace(/[^a-z0-9_\-.]/gi, "_").toLowerCase()) + "_clauseguard.md";
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 3000);
    }
  };

  const printPDF = () => {
    // Open the summary page in a new tab for print-to-PDF
    window.open(`/summary/${contractId}`, "_blank");
  };

  const riskCounts = summary?.risk_distribution ?? { critical: 0, high: 0, medium: 0, low: 0 };
  const riskPct = Math.round((summary?.overall_risk_score ?? 0) * 100);
  const riskLevel = summary?.risk_level ?? "low";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        className="w-full max-w-md rounded-2xl border overflow-hidden"
        style={{ background: "var(--bg-primary)", borderColor: "var(--border-primary)", boxShadow: "0 25px 60px rgba(0,0,0,0.4)" }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border-primary)" }}>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" style={{ color: "var(--accent-primary)" }} />
            <span id="export-modal-title" className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Export Report</span>
          </div>
          <button type="button" aria-label="Close export modal" onClick={onClose} className="rounded-lg p-1.5 transition-colors" style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Risk summary */}
        {summary && (
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border-primary)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Contract Risk Summary</span>
              <span className="text-xl font-bold tabular-nums" style={{ color: riskHexColor(riskLevel) }}>
                {riskPct}% <span className="text-xs font-semibold uppercase">{riskLevel}</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "var(--bg-tertiary)" }}>
              <div className="h-full rounded-full" style={{ width: `${riskPct}%`, background: riskHexColor(riskLevel) }} />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(["critical","high","medium","low"] as const).map((lvl) => (
                <div key={lvl} className="text-center rounded-lg py-2" style={{ background: "var(--bg-secondary)" }}>
                  <p className="text-base font-bold" style={{ color: riskHexColor(lvl) }}>{riskCounts[lvl]}</p>
                  <p className="text-[9px] capitalize mt-0.5" style={{ color: "var(--text-tertiary)" }}>{lvl}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export options */}
        <div className="p-5 space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-tertiary)" }}>Export Options</p>

          <button
            onClick={downloadMarkdown}
            className="w-full flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-primary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-primary)"; }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0" style={{ background: "var(--accent-subtle)" }}>
              <Download className="h-4 w-4" style={{ color: "var(--accent-primary)" }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Download Markdown</p>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Formatted report with all findings — works in Notion, Obsidian, etc.</p>
            </div>
          </button>

          <button
            type="button"
            onClick={copyMarkdown}
            className="w-full flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all"
            style={{
              background: "var(--bg-secondary)",
              borderColor: copied ? "rgba(34,197,94,0.4)" : copyFailed ? "rgba(239,68,68,0.4)" : "var(--border-primary)",
            }}
            onMouseEnter={(e) => { if (!copied && !copyFailed) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-secondary)"; }}
            onMouseLeave={(e) => { if (!copied && !copyFailed) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-primary)"; }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0" style={{ background: copied ? "rgba(34,197,94,0.1)" : copyFailed ? "rgba(239,68,68,0.08)" : "var(--bg-tertiary)" }}>
              <Copy className="h-4 w-4" style={{ color: copied ? "#16A34A" : copyFailed ? "var(--risk-critical)" : "var(--text-secondary)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: copied ? "#16A34A" : copyFailed ? "var(--risk-critical)" : "var(--text-primary)" }}>
                {copied ? "Copied to clipboard!" : copyFailed ? "Copy unavailable — use Ctrl+C" : "Copy as Markdown"}
              </p>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Paste directly into email, docs, or legal systems</p>
            </div>
          </button>

          <button
            onClick={printPDF}
            className="w-full flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-secondary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-primary)"; }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0" style={{ background: "var(--bg-tertiary)" }}>
              <ExternalLink className="h-4 w-4" style={{ color: "var(--text-secondary)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Open Full Report</p>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Full AI-generated memo — use browser Print → Save as PDF</p>
            </div>
          </button>

          {!summary && (
            <button
              type="button"
              onClick={async () => {
                setGenerating(true);
                setGenerateError(false);
                try {
                  const { analysisApi: api } = await import("@/lib/api");
                  await api.report(contractId);
                  onFullReport();
                } catch {
                  setGenerateError(true);
                  setTimeout(() => setGenerateError(false), 4000);
                } finally {
                  setGenerating(false);
                }
              }}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: generateError ? "var(--risk-critical)" : "var(--accent-primary)" }}
            >
              {generating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              {generating ? "Generating…" : generateError ? "Generation failed — try again" : "Generate Full AI Report"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Chat panel ────────────────────────────────────────────────────────────────
const EXAMPLE_QUESTIONS = [
  { q: "Is the indemnification mutual or one-sided?", label: "Indemnification", icon: "⚖️" },
  { q: "What are the termination provisions?", label: "Termination", icon: "🔴" },
  { q: "Are there any change-of-control clauses?", label: "M&A risk", icon: "🏢" },
  { q: "What is the limitation of liability?", label: "Liability cap", icon: "🛡️" },
];

interface ChatMsg {
  id: string;
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
        const history = raw.map((m, i) => ({
          id: `hist-${i}`,
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
    const userMsgId = `msg-${Date.now()}-u`;
    const asstMsgId = `msg-${Date.now()}-a`;
    setMessages((prev) => [...prev, { id: userMsgId, role: "user", content: msg }]);
    setStreaming(true);

    // Add placeholder assistant message
    setMessages((prev) => [...prev, { id: asstMsgId, role: "assistant", content: "", streaming: true }]);

    try {
      let fullContent = "";
      // Batch DOM updates: flush to state every ~40ms to avoid 1 setState per token
      let pendingFlush = false;
      const flushContent = () => {
        pendingFlush = false;
        const snapshot = fullContent;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = { ...last, content: snapshot, streaming: true };
          return updated;
        });
      };

      for await (const event of chatApi.send(contractId, msg)) {
        if (event.type === "context") {
          onContextClauses?.(event.clause_ids);
          if (event.clause_ids.length > 0) {
            setHeatmapPulse(true);
            setTimeout(() => setHeatmapPulse(false), 2500);
          }
        } else if (event.type === "error") {
          fullContent = `I encountered an error: ${event.detail}. Please try again.`;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, content: fullContent, streaming: false };
            return updated;
          });
          break;
        } else if (event.type === "token") {
          fullContent += event.content;
          // Schedule a batched flush — skip if one is already pending
          if (!pendingFlush) {
            pendingFlush = true;
            setTimeout(flushContent, 40);
          }
        }
      }
      // Final flush with streaming=false to remove cursor
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        updated[updated.length - 1] = { ...last, content: fullContent, streaming: false };
        return updated;
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        updated[updated.length - 1] = { ...last, content: "I encountered an error. Please try again.", streaming: false };
        return updated;
      });
    } finally {
      setStreaming(false);
      // Auto-focus input after response
      setTimeout(() => inputRef.current?.focus(), 80);
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
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Heatmap sync indicator */}
      {heatmapPulse && (
        <div
          className="mx-4 mb-2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
          style={{ background: "var(--accent-subtle)", color: "var(--accent-primary)", border: "1px solid rgba(21,96,252,0.25)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "var(--accent-primary)" }} />
          Heatmap updated — relevant clauses highlighted
        </div>
      )}

      {/* Input */}
      <div className="border-t p-3" style={{ borderColor: "var(--border-primary)" }}>
        {streaming && (
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <div className="flex gap-0.5">
              {[0, 150, 300].map((d) => (
                <span key={d} className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: "var(--accent-primary)", animationDelay: `${d}ms` }} />
              ))}
            </div>
            <span className="text-[10px]" style={{ color: "var(--accent-primary)" }}>ClauseGuard is thinking…</span>
          </div>
        )}
        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-primary)",
          }}
          onFocusCapture={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-primary)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(21,96,252,0.10)"; }}
          onBlurCapture={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-primary)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
            placeholder={streaming ? "Waiting for response…" : "Ask about this contract…"}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--text-primary)" }}
            disabled={streaming}
          />
          <button
            onClick={() => sendMessage()}
            disabled={streaming || !input.trim()}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-all disabled:opacity-35 shrink-0"
            style={{ background: input.trim() && !streaming ? "var(--accent-primary)" : "var(--bg-tertiary)" }}
          >
            {streaming ? (
              <div className="h-3 w-3 rounded-full border-2 animate-spin" style={{ borderColor: "var(--text-tertiary)", borderTopColor: "transparent" }} />
            ) : (
              <Send className="h-3.5 w-3.5" style={{ color: input.trim() ? "#fff" : "var(--text-tertiary)" }} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyChat({ onQuestion }: { onQuestion: (q: string) => void }) {
  return (
    <div className="flex flex-col h-full py-6 px-1">
      {/* Header */}
      <div className="text-center mb-5 px-4">
        <div className="flex justify-center mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: "var(--accent-subtle)", border: "1px solid rgba(21,96,252,0.2)" }}>
            <MessageSquare className="h-5 w-5" style={{ color: "var(--accent-primary)" }} />
          </div>
        </div>
        <p className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Ask about this contract
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)", maxWidth: "240px", margin: "0 auto" }}>
          I&apos;ve read every clause. Ask in plain English about risk, obligations, or what to negotiate.
        </p>
      </div>

      {/* Suggested questions */}
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: "var(--text-tertiary)" }}>
        Try asking
      </p>
      <div className="space-y-1.5">
        {EXAMPLE_QUESTIONS.map(({ q, label, icon }) => (
          <button
            key={q}
            onClick={() => onQuestion(q)}
            className="w-full rounded-xl border px-3.5 py-2.5 text-left transition-all flex items-center gap-3"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-primary)";
              (e.currentTarget as HTMLElement).style.background = "var(--accent-subtle)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border-primary)";
              (e.currentTarget as HTMLElement).style.background = "var(--bg-secondary)";
            }}
          >
            <span className="text-base shrink-0">{icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>{label}</p>
              <p className="text-xs leading-snug" style={{ color: "var(--text-secondary)" }}>{q}</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
          </button>
        ))}
      </div>

      {/* Hint */}
      <p className="text-[10px] text-center mt-4" style={{ color: "var(--text-tertiary)" }}>
        Relevant clauses are highlighted in the document as you chat
      </p>
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
