"use client";

/**
 * Summary/Export page — generates and displays a due diligence report.
 */

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { contractsApi, analysisApi } from "@/lib/api";
import type { Contract } from "@/types";

export default function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [contract, setContract] = useState<Contract | null>(null);
  const [report, setReport] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const res = await contractsApi.get(id);
      setContract(res.data);
      if (res.data.summary) {
        setReport(res.data.summary);
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
    } catch {
      setReport("Failed to generate report. Please try again.");
    } finally {
      setGenerating(false);
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
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <header className="border-b border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-800">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/review/${id}`)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
              Report: {contract?.title || contract?.original_filename}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={generateReport}
              disabled={generating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
              {generating ? "Generating..." : "Generate Report"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {!report ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 py-20 dark:border-zinc-700">
            <Download className="h-12 w-12 text-gray-300 dark:text-zinc-600" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No report yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Generate an AI-powered due diligence report.</p>
            <button
              onClick={generateReport}
              disabled={generating}
              className="mt-6 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Report"}
            </button>
          </div>
        ) : (
          <article className="prose prose-sm max-w-none rounded-2xl bg-white p-8 shadow-sm border border-gray-100 dark:bg-zinc-900 dark:border-zinc-800 dark:prose-invert">
            <ReactMarkdown>{report}</ReactMarkdown>
          </article>
        )}
      </main>
    </div>
  );
}
