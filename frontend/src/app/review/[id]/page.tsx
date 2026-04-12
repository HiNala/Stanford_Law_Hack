"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Shield,
  Send,
  Download,
  ChevronRight,
  Sparkles,
} from "lucide-react";
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
  const analysisScrollRef = useRef<HTMLDivElement>(null);
  const clauseRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
        return true; // stop on network error
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
    // Scroll analysis panel to the selected clause card
    setTimeout(() => {
      const el = clauseRefs.current[clause.id];
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
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
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left — Document heatmap */}
          <div
            className="w-[55%] overflow-y-auto border-r"
            style={{
              borderColor: "var(--border-primary)",
              background: "var(--bg-secondary)",
            }}
          >
            <DocumentPanel
              clauses={clauses}
              selectedClause={selectedClause}
              heatmapReady={heatmapReady}
              onClauseClick={handleClauseClick}
            />
          </div>

          {/* Right — Analysis / Chat */}
          <div
            className="flex w-[45%] flex-col overflow-hidden"
            style={{ background: "var(--bg-primary)" }}
          >
            {activeTab === "analysis" ? (
              <AnalysisPanel
                clause={selectedClause}
                summary={analysisSummary}
                clauses={clauses}
                scrollRef={analysisScrollRef}
                clauseRefs={clauseRefs}
              />
            ) : (
              <ChatPanel contractId={id} />
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
function ProcessingState() {
  const steps = [
    "Extracting text...",
    "Chunking clauses...",
    "Generating embeddings...",
    "Running risk analysis...",
    "Extracting metadata...",
  ];
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((s) => (s < steps.length - 1 ? s + 1 : s));
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
          {steps.map((step, i) => (
            <div key={step} className="flex items-center gap-2.5">
              {i < currentStep ? (
                <div
                  className="h-4 w-4 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "var(--risk-low)" }}
                >
                  <span className="text-white text-xs">✓</span>
                </div>
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

// ─── Document panel with cascading heatmap ────────────────────────────────────
function DocumentPanel({
  clauses,
  selectedClause,
  heatmapReady,
  onClauseClick,
}: {
  clauses: Clause[];
  selectedClause: Clause | null;
  heatmapReady: boolean;
  onClauseClick: (c: Clause) => void;
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
    <div className="p-5 space-y-1 font-serif">
      {clauses.map((clause, index) => (
        <ClauseBlock
          key={clause.id}
          clause={clause}
          index={index}
          isSelected={selectedClause?.id === clause.id}
          heatmapReady={heatmapReady}
          onClick={() => onClauseClick(clause)}
        />
      ))}
    </div>
  );
}

function ClauseBlock({
  clause,
  index,
  isSelected,
  heatmapReady,
  onClick,
}: {
  clause: Clause;
  index: number;
  isSelected: boolean;
  heatmapReady: boolean;
  onClick: () => void;
}) {
  const [visible, setVisible] = useState(!heatmapReady);

  useEffect(() => {
    if (heatmapReady) {
      const timer = setTimeout(() => setVisible(true), index * 40);
      return () => clearTimeout(timer);
    }
  }, [heatmapReady, index]);

  const riskLevel = clause.risk_level?.toLowerCase();
  const borderColor = riskHexColor(riskLevel);

  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-lg border-l-[3px] px-3 py-2.5 text-sm leading-relaxed transition-all duration-300",
        isSelected ? "ring-1" : "hover:brightness-110"
      )}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-4px)",
        transition: "opacity 0.3s ease, transform 0.3s ease, background 0.2s",
        borderLeftColor: visible ? borderColor : "transparent",
        background: visible
          ? isSelected
            ? `${borderColor}20`
            : `${borderColor}10`
          : "transparent",
        boxShadow: isSelected ? `0 0 0 1px ${borderColor}50` : "none",
      }}
    >
      {clause.section_heading && (
        <p
          className="mb-1 text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-tertiary)" }}
        >
          {clause.section_heading}
        </p>
      )}
      <p
        className="leading-7"
        style={{
          color: "var(--text-primary)",
          fontFamily: "Georgia, Charter, 'Times New Roman', serif",
          fontSize: "14px",
        }}
      >
        {clause.clause_text}
      </p>
    </div>
  );
}

// ─── Analysis panel ───────────────────────────────────────────────────────────
function AnalysisPanel({
  clause,
  summary,
  clauses,
  scrollRef,
  clauseRefs,
}: {
  clause: Clause | null;
  summary: ContractAnalysisSummary | null;
  clauses: Clause[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  clauseRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5">
      {/* Overall risk gauge */}
      {summary && !clause && <RiskGauge summary={summary} />}

      {/* Selected clause detail */}
      {clause ? (
        <ClauseDetail clause={clause} clauseRefs={clauseRefs} />
      ) : (
        <ClauseList clauses={clauses} clauseRefs={clauseRefs} />
      )}
    </div>
  );
}

function RiskGauge({ summary }: { summary: ContractAnalysisSummary }) {
  const score = summary.overall_risk_score ?? 0;
  const pct = Math.round(score * 100);
  const level = summary.risk_level ?? "low";

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border-primary)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          Overall Risk
        </span>
        <span
          className="text-2xl font-bold"
          style={{ color: riskHexColor(level) }}
        >
          {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: riskHexColor(level) }}
        />
      </div>
      <div className="grid grid-cols-4 gap-2 pt-1">
        {(["critical", "high", "medium", "low"] as const).map((lvl) => (
          <div key={lvl} className="text-center">
            <p className="text-lg font-bold" style={{ color: riskHexColor(lvl) }}>
              {summary.risk_distribution[lvl]}
            </p>
            <p className="text-xs capitalize" style={{ color: "var(--text-tertiary)" }}>
              {lvl}
            </p>
          </div>
        ))}
      </div>
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
          {clause.clause_type && (
            <span
              className="ml-auto rounded-lg px-2 py-0.5 text-xs"
              style={{ background: "var(--bg-tertiary)", color: "var(--text-tertiary)" }}
            >
              {clause.clause_type}
            </span>
          )}
        </div>
        {clause.section_heading && (
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-tertiary)" }}>
            {clause.section_heading}
          </p>
        )}
      </div>

      {/* Explanation — typewriter */}
      {clause.explanation && (
        <div
          className="rounded-xl border p-4"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-tertiary)" }}>
            Analysis
          </p>
          <p
            className={cn(
              "text-sm leading-relaxed",
              !isDone && "typewriter-cursor",
              isDone && "typewriter-cursor-done"
            )}
            style={{ color: "var(--text-primary)" }}
          >
            {displayedExplanation}
          </p>
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
}: {
  clauses: Clause[];
  clauseRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  const topRisks = clauses
    .filter((c) => c.risk_level === "critical" || c.risk_level === "high")
    .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
    .slice(0, 8);

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
        Top Risk Findings
      </p>
      <div className="space-y-2">
        {topRisks.map((c) => (
          <div
            key={c.id}
            ref={(el) => { clauseRefs.current[c.id] = el; }}
            className="rounded-xl border p-3"
            style={{
              background: "var(--bg-secondary)",
              borderColor: `${riskHexColor(c.risk_level)}30`,
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
                {c.clause_type}
              </span>
            </div>
            <p
              className="text-xs leading-relaxed line-clamp-3"
              style={{ color: "var(--text-secondary)" }}
            >
              {c.explanation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
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

function ChatPanel({ contractId }: { contractId: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      for await (const chunk of chatApi.send(contractId, msg)) {
        fullContent += chunk;
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
        {messages.length === 0 ? (
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
        Ask me anything about this contract.
      </p>
      <p className="text-xs mb-6 text-center" style={{ color: "var(--text-tertiary)" }}>
        I&apos;ve read every clause and can answer questions grounded in the actual text.
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
          <span
            className={cn(
              message.streaming && "typewriter-cursor",
              !message.streaming && "typewriter-cursor-done"
            )}
          >
            {message.content}
          </span>
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
