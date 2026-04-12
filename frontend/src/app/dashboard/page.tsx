"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Search, LogOut, Shield, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { contractsApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useContractStore } from "@/stores/contract-store";
import { cn, formatRiskPercent, riskColor, riskDotColor, riskHexColor, formatDate, formatFileSize } from "@/lib/utils";
import type { Contract } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user, logout, hydrate } = useAuthStore();
  const { contracts, setContracts } = useContractStore();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
      return;
    }
    loadContracts();
    // Poll for processing contracts
    const interval = setInterval(loadContracts, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const loadContracts = async () => {
    try {
      const res = await contractsApi.list();
      setContracts(res.data.contracts);
    } catch {
      // silently fail on refresh
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      const matchesSearch =
        !searchQuery ||
        (c.title || c.original_filename).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.contract_type || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = riskFilter === "all" || c.risk_level === riskFilter;
      return matchesSearch && matchesRisk;
    });
  }, [contracts, searchQuery, riskFilter]);

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
      {/* Header */}
      <header
        className="border-b h-14 flex items-center"
        style={{ borderColor: "var(--border-primary)", background: "var(--bg-secondary)" }}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: "var(--accent-primary)" }}
            >
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              ClauseGuard
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg p-1.5 transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-tertiary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Title + Upload CTA */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              Your Contracts
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
              {contracts.length} contract{contracts.length !== 1 ? "s" : ""} in portfolio
              {processingCount > 0 && (
                <span className="ml-2" style={{ color: "var(--accent-primary)" }}>
                  · {processingCount} analyzing...
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => router.push("/upload")}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--accent-primary)" }}
          >
            <Plus className="h-4 w-4" />
            Upload Contract
          </button>
        </div>

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
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{
                background: "var(--bg-secondary)",
                borderColor: "var(--border-primary)",
                color: "var(--text-secondary)",
              }}
            >
              <option value="all">All risk levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
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
            {filtered.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                onClick={() => router.push(`/review/${contract.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ContractCard({ contract, onClick }: { contract: Contract; onClick: () => void }) {
  const riskScore = contract.overall_risk_score ?? 0;
  const riskPct = Math.round(riskScore * 100);

  return (
    <button
      onClick={onClick}
      className="group flex flex-col rounded-xl border p-5 text-left transition-all duration-200"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border-primary)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-secondary)";
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-primary)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* Top row: icon + status */}
      <div className="flex items-start justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: "var(--bg-tertiary)" }}
        >
          <FileText className="h-4 w-4" style={{ color: "var(--text-secondary)" }} />
        </div>
        <StatusBadge status={contract.status} />
      </div>

      {/* Name */}
      <h3
        className="mt-3 text-sm font-semibold leading-snug truncate"
        style={{ color: "var(--text-primary)" }}
        title={contract.title || contract.original_filename}
      >
        {contract.title || contract.original_filename}
      </h3>

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
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${riskPct}%`,
                background: riskHexColor(contract.risk_level),
              }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-auto pt-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
          {formatDate(contract.created_at)}
        </p>
      )}
    </button>
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
        <Clock className="h-3 w-3 animate-spin" />
        Processing
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
