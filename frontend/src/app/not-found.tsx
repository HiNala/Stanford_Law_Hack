"use client";

import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl mb-6"
        style={{ background: "var(--bg-tertiary)" }}
      >
        <Shield className="h-7 w-7" style={{ color: "var(--text-tertiary)" }} />
      </div>
      <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        404
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-tertiary)" }}>
        This page doesn&apos;t exist.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        style={{ color: "var(--accent-primary)" }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
    </div>
  );
}
