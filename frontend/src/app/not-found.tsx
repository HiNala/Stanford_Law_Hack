"use client";

import Link from "next/link";
import { ArrowLeft, FileSearch } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Icon */}
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl mb-6"
        style={{ background: "var(--bg-tertiary)" }}
      >
        <FileSearch className="h-7 w-7" style={{ color: "var(--text-tertiary)" }} />
      </div>

      <div className="mb-2">
        <Logo size="sm" />
      </div>

      <h1
        className="mt-2 font-display text-4xl"
        style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}
      >
        404
      </h1>
      <p className="text-sm mt-2 mb-8 text-center max-w-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
        This page doesn&apos;t exist. The contract you&apos;re looking for may have been moved or deleted.
      </p>

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-85 text-white"
        style={{ background: "var(--accent-primary)" }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
    </div>
  );
}
