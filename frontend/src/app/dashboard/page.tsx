"use client";

/**
 * Dashboard — displays the user's contract portfolio with risk badges.
 * Stub page ready for full implementation.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Search, LogOut } from "lucide-react";
import { contractsApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useContractStore } from "@/stores/contract-store";
import { cn, formatRiskPercent, riskColor, formatDate, formatFileSize } from "@/lib/utils";
import type { Contract } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user, logout, hydrate } = useAuthStore();
  const { contracts, setContracts } = useContractStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
      return;
    }
    loadContracts();
  }, [isAuthenticated]);

  const loadContracts = async () => {
    try {
      const res = await contractsApi.list();
      setContracts(res.data.contracts);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-800">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">ClauseGuard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-zinc-400">{user?.email}</span>
            <button onClick={handleLogout} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contracts</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
              {contracts.length} contract{contracts.length !== 1 ? "s" : ""} in your portfolio
            </p>
          </div>
          <button
            onClick={() => router.push("/upload")}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Upload Contract
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 py-20 dark:border-zinc-700">
            <FileText className="h-12 w-12 text-gray-300 dark:text-zinc-600" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No contracts yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Upload your first contract to get started.</p>
            <button
              onClick={() => router.push("/upload")}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Upload Contract
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contracts.map((contract) => (
              <ContractCard key={contract.id} contract={contract} onClick={() => router.push(`/review/${contract.id}`)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ContractCard({ contract, onClick }: { contract: Contract; onClick: () => void }) {
  const risk = contract.risk_level;
  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm hover:shadow-md transition-shadow dark:bg-zinc-900 dark:border-zinc-800"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-800">
          <FileText className="h-5 w-5 text-slate-600 dark:text-zinc-400" />
        </div>
        {risk && (
          <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", riskColor(risk))}>
            {risk}
          </span>
        )}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white truncate">
        {contract.title || contract.original_filename}
      </h3>
      <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
        {contract.contract_type || contract.file_type.toUpperCase()} &middot; {formatFileSize(contract.file_size_bytes)}
      </p>
      <div className="mt-4 flex items-center justify-between text-xs text-gray-400 dark:text-zinc-500">
        <span>{formatDate(contract.created_at)}</span>
        {contract.overall_risk_score != null && (
          <span className="font-medium">Risk: {formatRiskPercent(contract.overall_risk_score)}</span>
        )}
        {contract.status === "processing" && (
          <span className="text-indigo-500 font-medium">Processing...</span>
        )}
      </div>
    </button>
  );
}
