"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Search, AlertCircle, CheckCircle2, TrendingUp, BarChart3, Trash2, Zap, ArrowRight, Clock, RefreshCw } from "lucide-react";
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
  const [sortBy, setSortBy] = useState<"date" | "risk">("risk");
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

  // Use a ref so the interval always reads the latest contracts without being in deps
  const contractsRef = useRef<typeof contracts>([]);
  contractsRef.current = contracts;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    loadAll();
    const interval = setInterval(() => {
      const hasPending = contractsRef.current.some(
        (c) => c.status === "processing" || c.status === "uploaded" || c.status === "pending"
      );
      if (hasPending) loadAll();
    }, 4000);
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

  // Contracts awaiting or currently in analysis — always shown, unfiltered
  const pendingContracts = useMemo(
    () => contracts.filter((c) => c.status !== "analyzed"),
    [contracts]
  );

  // Analyzed contracts — respect search/filter/sort
  const filtered = useMemo(() => {
    const list = contracts.filter((c) => {
      if (c.status !== "analyzed") return false;
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
            <h1 className="text-2xl font-display" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
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
                  background: "rgba(21,96,252,0.06)",
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

        {/* Dynamic status banner — shows only while analysis is in flight */}
        {processingCount > 0 && (
          <div
            className="flex items-center justify-between rounded-xl border px-5 py-3 mb-6"
            style={{
              background: "rgba(21,96,252,0.05)",
              borderColor: "rgba(21,96,252,0.18)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full animate-pulse shrink-0" style={{ background: "var(--accent-primary)" }} />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{processingCount} contract{processingCount !== 1 ? "s" : ""}</span>
                {" "}being analyzed by AI — results appear automatically
              </span>
            </div>
            <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--accent-primary)" }} />
          </div>
        )}

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
                  riskFilter === level ? "" : ""
                )}
                style={{
                  background: riskFilter === level ? `${riskHexColor(level)}12` : "var(--bg-secondary)",
                  borderColor: riskFilter === level ? `${riskHexColor(level)}70` : "var(--border-primary)",
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

        {/* Portfolio Hotspots — compact clause-type risk signal */}
        {riskHotspots.length > 0 && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="text-xs font-medium shrink-0" style={{ color: "var(--text-tertiary)" }}>
              Hotspot clauses:
            </span>
            {riskHotspots.slice(0, 6).map((h) => (
              <span
                key={h.clause_type}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
                style={{
                  background: h.avg_risk_score >= 0.7 ? "rgba(239,68,68,0.10)" : h.avg_risk_score >= 0.4 ? "rgba(245,158,11,0.10)" : "rgba(34,197,94,0.10)",
                  color: h.avg_risk_score >= 0.7 ? "var(--risk-critical)" : h.avg_risk_score >= 0.4 ? "var(--risk-high)" : "var(--risk-low)",
                }}
              >
                {h.clause_type.replace(/_/g, " ")} · {h.count}
              </span>
            ))}
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

        {/* ── In-Progress contracts ── */}
        {!loading && pendingContracts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            {pendingContracts.map((contract, idx) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                cardIndex={idx}
                onClick={() => router.push(`/review/${contract.id}`)}
                onDelete={async () => {
                  try { await contractsApi.delete(contract.id); await loadAll(); } catch { /* silent */ }
                }}
              />
            ))}
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
        ) : filtered.length === 0 && pendingContracts.length === 0 ? (
          <EmptyState
            hasContracts={contracts.length > 0}
            onUpload={() => router.push("/upload")}
            onClearFilter={() => { setSearchQuery(""); setRiskFilter("all"); }}
          />
        ) : filtered.length === 0 ? null : (
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
              <Zap className="h-4 w-4" style={{ color: "var(--accent-primary)" }} />
              <div>
                <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                  Search Clause Library
                </h2>
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mounted, setMounted] = useState(false);
  const parties = contract.parties
    ? ((contract.parties as { names?: string[] }).names ?? [])
    : [];

  // Staggered entrance animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), cardIndex * 60);
    return () => clearTimeout(t);
  }, [cardIndex]);

  // Auto-cancel confirm state after 3s if user doesn't act
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  const riskColor = riskHexColor(contract.risk_level ?? "low");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className="group flex flex-col rounded-xl border text-left cursor-pointer overflow-hidden"
      style={{
        background: contract.status === "error" ? "rgba(239,68,68,0.04)" : "var(--bg-secondary)",
        borderColor: contract.status === "analyzed" && contract.risk_level
          ? `${riskColor}35`
          : contract.status === "error" ? "rgba(239,68,68,0.3)" : "var(--border-primary)",
        transition: "border-color 0.15s, box-shadow 0.15s, opacity 0.4s ease, transform 0.4s ease",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(10px)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        if (contract.status === "analyzed" && contract.risk_level) {
          el.style.borderColor = `${riskColor}70`;
          el.style.boxShadow = `0 0 0 1px ${riskColor}30, 0 8px 28px ${riskColor}15`;
        } else {
          el.style.borderColor = contract.status === "error" ? "rgba(239,68,68,0.6)" : "var(--border-secondary)";
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        if (contract.status === "analyzed" && contract.risk_level) {
          el.style.borderColor = `${riskColor}35`;
          el.style.boxShadow = contract.risk_level === "critical" ? `0 0 0 1px ${riskColor}20, 0 4px 20px ${riskColor}10` : "none";
        } else {
          el.style.borderColor = contract.status === "error" ? "rgba(239,68,68,0.3)" : "var(--border-primary)";
          el.style.boxShadow = "none";
        }
      }}
    >
      {/* Risk color accent line across top */}
      {contract.status === "analyzed" && contract.risk_level && (
        <div
          className="h-0.5 w-full"
          style={{ background: `linear-gradient(90deg, ${riskColor}, ${riskColor}00)` }}
        />
      )}

      <div className="p-5 flex flex-col flex-1">
        {/* Top row: status + delete */}
        <div className="flex items-start justify-between">
          <StatusBadge status={contract.status} />
          <div className="flex items-center gap-1.5">
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
          className="mt-3 text-sm font-semibold leading-snug line-clamp-2"
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

        {/* Type */}
        <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
          {contract.contract_type || contract.file_type?.toUpperCase() || "Contract"}
        </p>

        {/* Risk score */}
        {contract.status === "analyzed" && contract.risk_level ? (
          <div className="mt-auto pt-4">
            <div className="flex items-end justify-between mb-2">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black tabular-nums leading-none" style={{ color: riskColor }}>
                  {riskPct}
                </span>
                <span className="text-sm font-medium" style={{ color: riskColor, opacity: 0.7 }}>%</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-md"
                  style={{ color: riskColor, background: `${riskColor}15` }}
                >
                  {contract.risk_level}
                </span>
                {contract.risk_distribution && (
                  <span className="text-[9px]" style={{ color: "var(--text-tertiary)" }}>
                    {contract.risk_distribution.critical > 0 && (
                      <span style={{ color: "#EF4444" }}>{contract.risk_distribution.critical}c </span>
                    )}
                    {contract.risk_distribution.high > 0 && (
                      <span style={{ color: "#F97316" }}>{contract.risk_distribution.high}h </span>
                    )}
                    {contract.risk_distribution.medium > 0 && (
                      <span style={{ color: "#EAB308" }}>{contract.risk_distribution.medium}m</span>
                    )}
                  </span>
                )}
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${riskPct}%`, background: `linear-gradient(90deg, ${riskColor}90, ${riskColor})` }}
              />
            </div>
          </div>
        ) : contract.status === "error" ? (
          <div className="mt-auto pt-4 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--risk-critical)" }} />
            <p className="text-xs" style={{ color: "var(--risk-critical)" }}>
              Analysis failed — click to retry
            </p>
          </div>
        ) : contract.status === "processing" ? (
          <div className="mt-auto pt-4">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="h-1.5 w-1.5 rounded-full animate-pulse shrink-0"
                style={{ background: "var(--accent-primary)" }}
              />
              <p className="text-xs" style={{ color: "var(--accent-primary)" }}>Analyzing…</p>
            </div>
            {/* Animated indeterminate bar */}
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  background: "var(--accent-primary)",
                  width: "40%",
                  animation: "shimmer-bar 1.4s ease-in-out infinite",
                }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-auto pt-4 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Waiting to analyze · {formatDate(contract.created_at)}
            </p>
          </div>
        )}
      </div>
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
        style={{ color: "var(--accent-primary)", background: "var(--accent-subtle)", borderColor: "rgba(21,96,252,0.3)" }}
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
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No analyzed contracts match your filter.</p>
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
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-5 w-5" style={{ color: "var(--text-tertiary)" }} />
        <h3 className="text-lg font-semibold font-display" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
          No contracts yet
        </h3>
      </div>
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
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  index?: number;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span style={{ color: accent }}>{icon}</span>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{label}</p>
      </div>
      <p className="text-xl font-bold leading-tight" style={{ color: accent }}>{value}</p>
    </div>
  );
}
