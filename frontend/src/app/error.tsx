"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

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
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Brand mark */}
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl mb-6"
        style={{ background: "rgba(220,38,38,0.10)" }}
      >
        <AlertTriangle className="h-7 w-7" style={{ color: "var(--risk-critical)" }} />
      </div>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="flex h-5 w-5 items-center justify-center rounded-md"
          style={{ background: "var(--accent-primary)" }}
        >
          <Shield className="h-3 w-3 text-white" />
        </div>
        <span className="text-xs font-semibold tracking-wide" style={{ color: "var(--text-tertiary)" }}>
          CLAUSEGUARD
        </span>
      </div>

      <h1
        className="mt-2 text-xl font-semibold font-display"
        style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
      >
        Something went wrong
      </h1>
      <p className="text-sm mt-2 mb-8 max-w-xs text-center leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
        {error.message || "An unexpected error occurred. Our team has been notified."}
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          style={{ borderColor: "var(--border-secondary)", color: "var(--text-secondary)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-secondary)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
          }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-85"
          style={{ background: "var(--accent-primary)" }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </button>
      </div>

      {error.digest && (
        <p className="mt-8 text-[10px] font-mono" style={{ color: "var(--text-tertiary)", opacity: 0.5 }}>
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
