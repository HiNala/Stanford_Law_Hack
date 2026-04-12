"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Search, AlertCircle, Clock, CheckCircle2, TrendingUp, BarChart3, Trash2, Zap, ArrowRight, Lightbulb } from "lucide-react";
import { contractsApi, statsApi, searchApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useContractStore } from "@/stores/contract-store";
import { cn, riskHexColor, formatDate, formatFileSize } from "@/lib/utils";
import Header from "@/components/layout/header";
import type { Contract, SearchResult } from "@/types";

interface PortfolioStats {
  total_contracts: number;
  contracts_by_status: Record<string, number>;
  average_risk_score: number;
  highest_risk_contract: { id: string; title: string; risk_score: number } | null;
  risk_distribution: { critical: number; high: number; medium: number; low: number };
}

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, hydrate } = useAuthStore();
  const { contracts, setContracts } = useContractStore();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "risk">("date");
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats | null>(null);
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticResults, setSemanticResults] = useState<SearchResult[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [semanticSearched, setSemanticSearched] = useState(false);
  const [portfolioInsights, setPortfolioInsights] = useState<string[]>([]);
  const [riskHotspots, setRiskHotspots] = useState<{clause_type: string; count: number; avg_risk_score: number; critical_count: number}[]>([]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
      return;
    }
    loadAll();
    // Only poll while at least one contract is processing
    const interval = setInterval(() => {
      const hasProcessing = contracts.some((c) => c.status === "processing");
      if (hasProcessing) loadAll();
    }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const loadAll = async () => {
    try {
      const [contractsRes, statsRes] = await Promise.allSettled([
        contractsApi.list(),
        statsApi.get(),
      ]);
      if (contractsRes.status === "fulfilled") setContracts(contractsRes.value.data.items ?? []);
      if (statsRes.status === "fulfilled") setPortfolioStats(statsRes.value.data);
      // Load cross-document patterns
      try {
        const patternsRes = await statsApi.patterns();
        setPortfolioInsights(patternsRes.data.insights ?? []);
        setRiskHotspots(patternsRes.data.risk_hotspots ?? []);
      } catch { /* patterns are non-critical */ }
    } catch {
      // silently fail on refresh
    } finally {
      setLoading(false);
    }
  };

  const runSemanticSearch = async (query?: string) => {
    const q = (query ?? semanticQuery).trim();
    if (!q) return;
    setSemanticLoading(true);
    setSemanticSearched(true);
    try {
      const res = await searchApi.search(q);
      setSemanticResults((res.data as { results: SearchResult[] }).results ?? []);
    } catch {
      setSemanticResults([]);
    } finally {
      setSemanticLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const list = contracts.filter((c) => {
      const matchesSearch =
        !searchQuery ||
        (c.title || c.original_filename).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.contract_type || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = riskFilter === "all" || c.risk_level === riskFilter;
      return matchesSearch && matchesRisk;
    });
    if (sortBy === "risk") {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return [...list].sort((a, b) => {
        const ao = order[a.risk_level as keyof typeof order] ?? 4;
        const bo = order[b.risk_level as keyof typeof order] ?? 4;
        if (ao !== bo) return ao - bo;
        return (b.overall_risk_score ?? 0) - (a.overall_risk_score ?? 0);
      });
    }
    // default: newest first
    return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [contracts, searchQuery, riskFilter, sortBy]);

  const riskCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    contracts.forEach((c) => {
      if (c.risk_level && c.risk_level in counts) {
        counts[c.risk_level as keyof typeof counts]++;
      }
    });
    return counts;
  }, [contracts]);

  const processingCount = contracts.filter((c) => c.status === "processing").length;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Header />

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Title + Upload CTA */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              Contract Portfolio
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
              {contracts.length} contract{contracts.length !== 1 ? "s" : ""} under review
              {processingCount > 0 && (
                <span className="ml-2" style={{ color: "var(--accent-primary)" }}>
                  · {processingCount} analyzing...
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {contracts.filter(c => c.status === "analyzed").length >= 2 && (
              <button
                onClick={() => router.push("/portfolio-report")}
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
                style={{
                  borderColor: "var(--accent-primary)",
                  color: "var(--accent-primary)",
                  background: "rgba(59,130,246,0.06)",
                }}
              >
                <BarChart3 className="h-4 w-4" />
                Portfolio Report
              </button>
            )}
            <button
              onClick={() => router.push("/upload")}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--accent-primary)" }}
            >
              <Plus className="h-4 w-4" />
              Upload Contract
            </button>
          </div>
        </div>

        {/* Portfolio stats bar */}
        {portfolioStats && portfolioStats.total_contracts > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard
              index={0}
              label="Avg Portfolio Risk"
              value={`${Math.round(portfolioStats.average_risk_score * 100)}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              accent={portfolioStats.average_risk_score > 0.5 ? "var(--risk-high)" : portfolioStats.average_risk_score > 0.25 ? "var(--risk-medium)" : "var(--risk-low)"}
            />
            <StatCard
              index={1}
              label="Critical Clauses"
              value={portfolioStats.risk_distribution.critical.toLocaleString()}
              icon={<AlertCircle className="h-4 w-4" />}
              accent="var(--risk-critical)"
            />
            <StatCard
              index={2}
              label="High-Risk Clauses"
              value={portfolioStats.risk_distribution.high.toLocaleString()}
              icon={<BarChart3 className="h-4 w-4" />}
              accent="var(--risk-high)"
            />
            <StatCard
              index={3}
              label="Analyzed"
              value={`${portfolioStats.contracts_by_status["analyzed"] ?? 0} / ${portfolioStats.total_contracts}`}
              icon={<CheckCircle2 className="h-4 w-4" />}
              accent="var(--risk-low)"
            />
          </div>
        )}

        {/* Stats bar */}
        {contracts.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {(["critical", "high", "medium", "low"] as const).map((level) => (
              <button
                key={level}
                onClick={() => setRiskFilter(riskFilter === level ? "all" : level)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all",
                  riskFilter === level ? "ring-1" : "hover:border-zinc-600"
                )}
                style={{
                  background: riskFilter === level ? `${riskHexColor(level)}15` : "var(--bg-secondary)",
                  borderColor: riskFilter === level ? riskHexColor(level) : "var(--border-primary)",
                  boxShadow: riskFilter === level ? `0 0 0 1px ${riskHexColor(level)}` : "none",
                }}
              >
                <p className="text-2xl font-bold" style={{ color: riskHexColor(level) }}>
                  {riskCounts[level]}
                </p>
                <p className="text-xs font-medium capitalize mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {level} risk
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Portfolio Intelligence Insights */}
        {portfolioInsights.length > 0 && (
          <div
            className="rounded-xl border p-4 mb-6"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4" style={{ color: "var(--accent-primary)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Portfolio Intelligence</h3>
            </div>
            <div className="space-y-1.5">
              {portfolioInsights.map((insight, i) => (
                <p key={i} className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--accent-primary)" }}>→</span> {insight}
                </p>
              ))}
            </div>
            {riskHotspots.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--border-primary)" }}>
                {riskHotspots.slice(0, 5).map((h) => (
                  <span
                    key={h.clause_type}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
                    style={{
                      background: h.avg_risk_score >= 0.7 ? "rgba(239,68,68,0.12)" : h.avg_risk_score >= 0.4 ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.12)",
                      color: h.avg_risk_score >= 0.7 ? "var(--risk-critical)" : h.avg_risk_score >= 0.4 ? "var(--risk-high)" : "var(--risk-low)",
                    }}
                  >
                    {h.clause_type.replace(/_/g, " ")} ({h.count})
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search + Filter */}
        {contracts.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <div
              className="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2.5"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
            >
              <Search className="h-4 w-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
              <input
                type="text"
                placeholder="Search contracts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "date" | "risk")}
              className="rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{
                background: "var(--bg-secondary)",
                borderColor: "var(--border-primary)",
                color: "var(--text-secondary)",
              }}
            >
              <option value="date">Newest first</option>
              <option value="risk">Highest risk first</option>
            </select>
          </div>
        )}

        {/* Contract grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 rounded-xl border animate-pulse"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            hasContracts={contracts.length > 0}
            onUpload={() => router.push("/upload")}
            onClearFilter={() => { setSearchQuery(""); setRiskFilter("all"); }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((contract, idx) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                cardIndex={idx}
                onClick={() => router.push(`/review/${contract.id}`)}
                onDelete={async () => {
                  try {
                    await contractsApi.delete(contract.id);
                    await loadAll();
                  } catch { /* silently fail */ }
                }}
              />
            ))}
          </div>
        )}
        {/* Semantic Search Section — search clause library across all contracts */}
        {contracts.some((c) => c.status === "analyzed") && (
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: "rgba(59,130,246,0.12)", color: "var(--accent-primary)" }}
              >
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                  Search Clause Library
                </h2>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  Semantic search across all your contracts using natural language
                </p>
              </div>
            </div>

            {/* Search input */}
            <div className="flex gap-2">
              <div
                className="flex flex-1 items-center gap-2 rounded-xl border px-4 py-3"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
              >
                <Search className="h-4 w-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                <input
                  type="text"
                  placeholder='e.g. "change of control termination clauses" or "one-sided indemnification"'
                  value={semanticQuery}
                  onChange={(e) => setSemanticQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") runSemanticSearch(); }}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
              <button
                onClick={() => runSemanticSearch()}
                disabled={!semanticQuery.trim() || semanticLoading}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                style={{ background: "var(--accent-primary)" }}
              >
                {semanticLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>Search <ArrowRight className="h-3.5 w-3.5" /></>
                )}
              </button>
            </div>

            {/* Example chips */}
            {!semanticSearched && (
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  "change of control termination",
                  "one-sided indemnification",
                  "non-compete restrictions",
                  "data privacy obligations",
                  "short notice period",
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => {
                      setSemanticQuery(chip);
                      runSemanticSearch(chip);
                    }}
                    className="rounded-full border px-3 py-1 text-xs transition-colors"
                    style={{
                      borderColor: "var(--border-secondary)",
                      color: "var(--text-secondary)",
                      background: "var(--bg-tertiary)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-primary)";
                      (e.currentTarget as HTMLElement).style.color = "var(--accent-primary)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border-secondary)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Search results */}
            {semanticSearched && !semanticLoading && (
              <div className="mt-4">
                {semanticResults.length === 0 ? (
                  <p className="text-sm py-6 text-center" style={{ color: "var(--text-tertiary)" }}>
                    No matching clauses found — try a broader term like &ldquo;indemnification&rdquo; or &ldquo;termination&rdquo;.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {semanticResults.length} relevant clause{semanticResults.length !== 1 ? "s" : ""} found
                    </p>
                    {semanticResults.map((result) => (
                      <SearchResultCard
                        key={result.clause_id}
                        result={result}
                        onClick={() => router.push(`/review/${result.contract_id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function ContractCard({ contract, cardIndex, onClick, onDelete }: { contract: Contract; cardIndex: number; onClick: () => void; onDelete: () => void }) {
  const riskScore = contract.overall_risk_score ?? 0;
  const riskPct = Math.round(riskScore * 100);
  const [visible, setVisible] = useState(false);
  const [barReady, setBarReady] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const parties = contract.parties
    ? ((contract.parties as { names?: string[] }).names ?? [])
    : [];

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(true);
      setTimeout(() => setBarReady(true), 120);
    }, cardIndex * 60);
    return () => clearTimeout(t);
  }, [cardIndex]);

  // Auto-cancel confirm state after 3s if user doesn't act
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  return (
    // div[role=button] instead of <button> to allow nested <button> for delete confirm
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className="group flex flex-col rounded-xl border p-5 text-left transition-all duration-200 cursor-pointer"
      style={{
        background: contract.status === "error" ? "rgba(239,68,68,0.04)" : "var(--bg-secondary)",
        borderColor: contract.status === "error" ? "rgba(239,68,68,0.3)" : "var(--border-primary)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.35s ease, transform 0.35s ease, border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = contract.status === "error" ? "rgba(239,68,68,0.6)" : "var(--border-secondary)";
        el.style.boxShadow = contract.status === "error" ? "0 4px 12px rgba(239,68,68,0.15)" : "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = contract.status === "error" ? "rgba(239,68,68,0.3)" : "var(--border-primary)";
        el.style.boxShadow = "none";
      }}
    >
      {/* Top row: icon + status + delete */}
      <div className="flex items-start justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{
            background: contract.status === "analyzed" && contract.risk_level
              ? `${riskHexColor(contract.risk_level)}18`
              : "var(--bg-tertiary)",
          }}
        >
          <FileText
            className="h-4 w-4"
            style={{
              color: contract.status === "analyzed" && contract.risk_level
                ? riskHexColor(contract.risk_level)
                : "var(--text-secondary)",
            }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge status={contract.status} />
          {contract.status !== "processing" && (
            confirmDelete ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="rounded px-1.5 py-0.5 text-xs font-semibold"
                  style={{ background: "var(--risk-critical-bg)", color: "var(--risk-critical)", border: "1px solid var(--risk-critical-border)" }}
                >
                  Delete
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                  className="rounded px-1.5 py-0.5 text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                className="rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--text-tertiary)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--risk-critical)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}
                title="Delete contract"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Name */}
      <h3
        className="mt-3 text-sm font-semibold leading-snug truncate"
        style={{ color: "var(--text-primary)" }}
        title={contract.title || contract.original_filename}
      >
        {contract.title || contract.original_filename}
      </h3>

      {/* Parties */}
      {parties.length > 0 && (
        <p className="mt-0.5 text-xs truncate" style={{ color: "var(--text-tertiary)" }} title={parties.join(" · ")}>
          {parties.slice(0, 2).join(" · ")}
        </p>
      )}

      {/* Type + size */}
      <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
        {contract.contract_type || contract.file_type.toUpperCase()}
        {contract.file_size_bytes ? ` · ${formatFileSize(contract.file_size_bytes)}` : ""}
      </p>

      {/* Risk score bar */}
      {contract.status === "analyzed" && contract.risk_level ? (
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: riskHexColor(contract.risk_level) }}
              />
              <span className="text-xs font-medium capitalize" style={{ color: riskHexColor(contract.risk_level) }}>
                {contract.risk_level} risk
              </span>
            </div>
            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              {riskPct}%
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: barReady ? `${riskPct}%` : "0%",
                background: riskHexColor(contract.risk_level),
                transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
              }}
            />
          </div>
        </div>
      ) : contract.status === "error" ? (
        <p className="mt-auto pt-4 text-xs" style={{ color: "var(--risk-critical)" }}>
          Analysis failed — delete and re-upload to retry
        </p>
      ) : (
        <p className="mt-auto pt-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
          {formatDate(contract.created_at)}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "analyzed") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border"
        style={{ color: "var(--risk-low)", background: "var(--risk-low-bg)", borderColor: "var(--risk-low-border)" }}
      >
        <CheckCircle2 className="h-3 w-3" />
        Analyzed
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border"
        style={{ color: "var(--accent-primary)", background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.3)" }}
      >
        <svg className="h-3 w-3 animate-spin" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.25" />
          <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Analyzing
      </span>
    );
  }
  if (status === "error") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border"
        style={{ color: "var(--risk-critical)", background: "var(--risk-critical-bg)", borderColor: "var(--risk-critical-border)" }}
      >
        <AlertCircle className="h-3 w-3" />
        Error
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border"
      style={{ color: "var(--text-tertiary)", background: "var(--bg-tertiary)", borderColor: "var(--border-primary)" }}
    >
      Uploaded
    </span>
  );
}

function EmptyState({
  hasContracts,
  onUpload,
  onClearFilter,
}: {
  hasContracts: boolean;
  onUpload: () => void;
  onClearFilter: () => void;
}) {
  if (hasContracts) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border py-16"
        style={{ borderColor: "var(--border-primary)", borderStyle: "dashed" }}>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No contracts match your search.</p>
        <button onClick={onClearFilter} className="mt-3 text-sm" style={{ color: "var(--accent-primary)" }}>
          Clear filters
        </button>
      </div>
    );
  }
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border py-20"
      style={{ borderColor: "var(--border-primary)", borderStyle: "dashed" }}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: "var(--bg-tertiary)" }}
      >
        <FileText className="h-8 w-8" style={{ color: "var(--text-tertiary)" }} />
      </div>
      <h3 className="mt-4 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
        No contracts yet
      </h3>
      <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
        Upload your first contract to see AI-powered risk analysis.
      </p>
      <button
        onClick={onUpload}
        className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
        style={{ background: "var(--accent-primary)" }}
      >
        <Plus className="h-4 w-4" />
        Upload Contract
      </button>
    </div>
  );
}

function SearchResultCard({
  result,
  onClick,
}: {
  result: SearchResult;
  onClick: () => void;
}) {
  const matchPct = Math.round(result.similarity_score * 100);
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border p-4 text-left transition-all"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-secondary)";
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-primary)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold truncate" style={{ color: "var(--text-secondary)" }}>
              {result.contract_title || "Unknown Contract"}
            </span>
            {result.section_heading && (
              <>
                <span style={{ color: "var(--border-secondary)" }}>·</span>
                <span className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                  {result.section_heading}
                </span>
              </>
            )}
          </div>
          <p className="text-sm leading-relaxed line-clamp-2" style={{ color: "var(--text-primary)" }}>
            {result.clause_text}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {result.risk_level && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium capitalize"
              style={{
                color: riskHexColor(result.risk_level),
                background: `${riskHexColor(result.risk_level)}15`,
              }}
            >
              {result.risk_level}
            </span>
          )}
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {matchPct}% match
          </span>
        </div>
      </div>
    </button>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  index = 0,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  index?: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 80);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div
      className="rounded-xl border p-4 flex items-center gap-3"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border-primary)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
      }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${accent}18`, color: accent }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>{label}</p>
        <p className="text-lg font-bold leading-tight" style={{ color: accent }}>{value}</p>
      </div>
    </div>
  );
}
