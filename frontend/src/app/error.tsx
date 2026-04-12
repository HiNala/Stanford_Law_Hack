"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl mb-6"
        style={{ background: "var(--risk-critical-bg)" }}
      >
        <AlertTriangle className="h-7 w-7" style={{ color: "var(--risk-critical)" }} />
      </div>
      <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        Something went wrong
      </h1>
      <p className="text-sm mb-8 max-w-xs text-center" style={{ color: "var(--text-tertiary)" }}>
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard")}
          className="rounded-lg border px-4 py-2 text-sm font-medium"
          style={{ borderColor: "var(--border-secondary)", color: "var(--text-secondary)" }}
        >
          Dashboard
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--accent-primary)" }}
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
