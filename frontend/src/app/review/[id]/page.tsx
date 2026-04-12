"use client";

/**
 * Contract Review — split-screen view with document heatmap (left) and AI analysis (right).
 * This is the hero demo page.
 */

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, MessageSquare, BarChart3, Download } from "lucide-react";
import { contractsApi, clausesApi, analysisApi } from "@/lib/api";
import { useContractStore } from "@/stores/contract-store";
import { cn, riskHighlightColor, riskColor, formatRiskPercent } from "@/lib/utils";
import type { Contract, Clause, ContractAnalysisSummary } from "@/types";

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { currentContract, setCurrentContract, clauses, setClauses, analysisSummary, setAnalysisSummary } = useContractStore();
  const [activeTab, setActiveTab] = useState<"analysis" | "chat">("analysis");
  const [selectedClause, setSelectedClause] = useState<Clause | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    loadContract();
  }, [id]);

  const loadContract = async () => {
    try {
      const [contractRes] = await Promise.all([contractsApi.get(id)]);
      const contract: Contract = contractRes.data;
      setCurrentContract(contract);

      if (contract.status === "analyzed") {
        await loadAnalysis();
      } else if (contract.status === "processing") {
        setPolling(true);
        pollStatus();
      }
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const pollStatus = async () => {
    const interval = setInterval(async () => {
      try {
        const res = await analysisApi.status(id);
        if (res.data.status === "analyzed") {
          clearInterval(interval);
          setPolling(false);
          await loadAnalysis();
          const contractRes = await contractsApi.get(id);
          setCurrentContract(contractRes.data);
        }
      } catch {
        clearInterval(interval);
      }
    }, 3000);
  };

  const loadAnalysis = async () => {
    try {
      const [clauseRes, summaryRes] = await Promise.all([
        clausesApi.list(id),
        clausesApi.summary(id),
      ]);
      setClauses(clauseRes.data.clauses);
      setAnalysisSummary(summaryRes.data);
    } catch {
      // handle gracefully
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <FileText className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-md">
            {currentContract?.title || currentContract?.original_filename}
          </span>
          {currentContract?.risk_level && (
            <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", riskColor(currentContract.risk_level))}>
              {currentContract.risk_level} — {formatRiskPercent(currentContract.overall_risk_score)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("analysis")}
            className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              activeTab === "analysis" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
            )}
          >
            <BarChart3 className="mr-1 inline h-3.5 w-3.5" /> Analysis
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              activeTab === "chat" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
            )}
          >
            <MessageSquare className="mr-1 inline h-3.5 w-3.5" /> Chat
          </button>
          <button
            onClick={() => router.push(`/summary/${id}`)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            <Download className="mr-1 inline h-3.5 w-3.5" /> Report
          </button>
        </div>
      </header>

      {/* Split pane */}
      {polling ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <p className="mt-4 text-sm text-gray-500">Analyzing contract... This may take a minute.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left — Document with heatmap */}
          <div className="w-1/2 overflow-y-auto border-r border-gray-200 bg-white p-6 dark:bg-zinc-900 dark:border-zinc-800">
            {clauses.length === 0 ? (
              <p className="text-sm text-gray-400">No clauses available.</p>
            ) : (
              <div className="space-y-1">
                {clauses.map((clause) => (
                  <div
                    key={clause.id}
                    onClick={() => setSelectedClause(clause)}
                    className={cn(
                      "cursor-pointer rounded-lg px-3 py-2 text-sm leading-relaxed transition-colors border-l-4",
                      riskHighlightColor(clause.risk_level),
                      selectedClause?.id === clause.id
                        ? "ring-2 ring-indigo-500"
                        : "hover:bg-gray-50 dark:hover:bg-zinc-800",
                      clause.risk_level === "critical" ? "border-l-red-500" :
                      clause.risk_level === "high" ? "border-l-orange-500" :
                      clause.risk_level === "medium" ? "border-l-yellow-500" :
                      "border-l-green-400"
                    )}
                  >
                    {clause.section_heading && (
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {clause.section_heading}
                      </p>
                    )}
                    <p className="text-gray-800 dark:text-zinc-200 whitespace-pre-wrap">{clause.clause_text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right — Analysis or Chat */}
          <div className="w-1/2 overflow-y-auto bg-slate-50 p-6 dark:bg-zinc-950">
            {activeTab === "analysis" ? (
              <AnalysisPanel clause={selectedClause} summary={analysisSummary} clauses={clauses} />
            ) : (
              <ChatPanel contractId={id} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisPanel({
  clause,
  summary,
  clauses,
}: {
  clause: Clause | null;
  summary: ContractAnalysisSummary | null;
  clauses: Clause[];
}) {
  if (clause) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Clause Analysis</h3>
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-3">
              <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", riskColor(clause.risk_level))}>
                {clause.risk_level}
              </span>
              <span className="text-sm text-gray-500">Risk Score: {formatRiskPercent(clause.risk_score)}</span>
              {clause.clause_type && (
                <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {clause.clause_type}
                </span>
              )}
            </div>
            {clause.explanation && (
              <div className="rounded-xl bg-white p-4 text-sm leading-relaxed text-gray-700 shadow-sm border border-gray-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300">
                {clause.explanation}
              </div>
            )}
            {clause.suggestion && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Suggested Alternative</h4>
                <div className="rounded-xl bg-green-50 p-4 text-sm leading-relaxed text-green-800 border border-green-200 dark:bg-green-950/20 dark:border-green-900 dark:text-green-300">
                  {clause.suggestion}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show overview when no clause selected
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Contract Overview</h3>
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          {(["critical", "high", "medium", "low"] as const).map((level) => (
            <div key={level} className={cn("rounded-xl border p-4", riskColor(level))}>
              <p className="text-2xl font-bold">{summary.risk_distribution[level]}</p>
              <p className="text-xs font-medium capitalize">{level} Risk</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-sm text-gray-500 dark:text-zinc-400">Click a clause on the left to see its detailed analysis.</p>

      {summary && summary.top_risks.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Top Risks</h4>
          <div className="space-y-2">
            {summary.top_risks.slice(0, 5).map((r) => (
              <div key={r.id} className="rounded-lg bg-white p-3 text-sm border border-gray-100 dark:bg-zinc-900 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", riskColor(r.risk_level))}>
                    {r.risk_level}
                  </span>
                  <span className="text-xs text-gray-400">{r.clause_type}</span>
                </div>
                <p className="text-gray-600 dark:text-zinc-400 line-clamp-2">{r.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChatPanel({ contractId }: { contractId: string }) {
  // Stub — will be fully implemented with streaming
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setStreaming(true);

    try {
      let assistantContent = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const { chatApi } = await import("@/lib/api");
      for await (const chunk of chatApi.send(contractId, userMsg)) {
        assistantContent += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantContent };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong." }]);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Chat with Contract</h3>

      <div className="flex-1 space-y-4 overflow-y-auto mb-4">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-zinc-500">Ask anything about this contract...</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn("rounded-xl px-4 py-3 text-sm leading-relaxed",
            msg.role === "user"
              ? "ml-8 bg-indigo-600 text-white"
              : "mr-8 bg-white text-gray-700 border border-gray-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300"
          )}>
            {msg.content || <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask about this contract..."
          className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        />
        <button
          onClick={sendMessage}
          disabled={streaming || !input.trim()}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
