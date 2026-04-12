"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  X,
  Loader2,
} from "lucide-react";
import { contractsApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { cn, formatFileSize } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface UploadedFile {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  contractId?: string;
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const { isAuthenticated, hydrate } = useAuthStore();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  const onDrop = useCallback((accepted: File[], rejected: { file: File; errors: readonly { message: string }[] }[]) => {
    const newFiles = accepted.map((file) => ({ file, status: "pending" as const }));
    setFiles((prev) => {
      // Prevent duplicate files
      const existingNames = new Set(prev.map((f) => f.file.name));
      return [...prev, ...newFiles.filter((f) => !existingNames.has(f.file.name))];
    });
    if (rejected.length > 0) {
      // Show brief error for rejected files — ignored for now
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    setUploading(true);
    const updated = [...files];

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status !== "pending") continue;
      updated[i] = { ...updated[i], status: "uploading" };
      setFiles([...updated]);

      try {
        const res = await contractsApi.upload(updated[i].file);
        updated[i] = { ...updated[i], status: "success", contractId: res.data.id };
      } catch (err: unknown) {
        const msg =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
            : null;
        updated[i] = { ...updated[i], status: "error", error: msg || "Upload failed" };
      }
      setFiles([...updated]);
    }
    setUploading(false);
  };

  const successCount = files.filter((f) => f.status === "success").length;
  const pendingCount = files.filter((f) => f.status === "pending").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const successFiles = files.filter((f) => f.status === "success" && f.contractId);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  // Auto-redirect to review page when exactly one file finishes uploading successfully
  useEffect(() => {
    if (
      successFiles.length === 1 &&
      pendingCount === 0 &&
      errorCount === 0 &&
      !uploading
    ) {
      setRedirectCountdown(3);
      const interval = setInterval(() => {
        setRedirectCountdown((n) => {
          if (n === null || n <= 1) { clearInterval(interval); return null; }
          return n - 1;
        });
      }, 1000);
      const timer = setTimeout(() => {
        router.push(`/review/${successFiles[0].contractId}`);
      }, 3000);
      return () => { clearTimeout(timer); clearInterval(interval); };
    }
  }, [successFiles, pendingCount, errorCount, uploading, router]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <header
        className="border-b h-14 flex items-center"
        style={{ borderColor: "var(--border-primary)", background: "var(--bg-secondary)" }}
      >
        <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg p-1.5 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            Upload Contracts
          </h1>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 transition-all cursor-pointer"
          )}
          style={{
            borderColor: isDragReject
              ? "var(--risk-critical)"
              : isDragActive
              ? "var(--accent-primary)"
              : "var(--border-secondary)",
            background: isDragActive
              ? "rgba(21,96,252,0.05)"
              : isDragReject
              ? "var(--risk-critical-bg)"
              : "var(--bg-secondary)",
          }}
        >
          <input {...getInputProps()} />
          <div className="flex items-center gap-3 mb-2">
            <Upload
              className="h-5 w-5 shrink-0"
              style={{ color: isDragActive ? "var(--accent-primary)" : "var(--text-tertiary)" }}
            />
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              {isDragReject
                ? "Unsupported file type"
                : isDragActive
                ? "Drop to analyze"
                : "Drag & drop contracts here"}
            </h3>
          </div>
          <p className="mt-1.5 text-sm" style={{ color: "var(--text-tertiary)" }}>
            {isDragReject
              ? "Only PDF, DOCX, or TXT files are supported"
              : "Supports PDF, DOCX, TXT — up to 50MB each"}
          </p>
          {!isDragActive && (
            <button
              type="button"
              className="mt-5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
              style={{ borderColor: "var(--border-secondary)", color: "var(--text-secondary)" }}
            >
              Browse Files
            </button>
          )}
        </div>

        {/* Auto-redirect countdown banner */}
        {redirectCountdown !== null && (
          <div
            className="mt-5 flex items-center gap-3 rounded-xl border px-4 py-3"
            style={{ background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.25)" }}
          >
            <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: "var(--risk-low)", flexShrink: 0 }} />
            <p className="text-sm font-medium" style={{ color: "var(--risk-low)" }}>
              Opening analysis in {redirectCountdown}s…
            </p>
            <button
              onClick={() => router.push(`/review/${successFiles[0].contractId}`)}
              className="ml-auto text-xs font-semibold underline"
              style={{ color: "var(--risk-low)" }}
            >
              Go now
            </button>
          </div>
        )}

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-xs font-medium mb-3" style={{ color: "var(--text-tertiary)" }}>
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </p>
            {files.map((f, i) => (
              <FileRow
                key={`${f.file.name}-${i}`}
                uploadedFile={f}
                onRemove={() => removeFile(i)}
                onViewContract={() => f.contractId && router.push(`/review/${f.contractId}`)}
              />
            ))}

            <div className="flex items-center justify-between pt-4">
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                {successCount > 0 && `${successCount} uploaded`}
                {pendingCount > 0 && ` · ${pendingCount} pending`}
                {errorCount > 0 && (
                  <span style={{ color: "var(--risk-critical)" }}>
                    {` · ${errorCount} failed`}
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                {successCount > 0 && (
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                    style={{ borderColor: "var(--border-secondary)", color: "var(--text-secondary)" }}
                  >
                    Go to Dashboard
                  </button>
                )}
                {pendingCount > 0 && (
                  <button
                    onClick={handleUploadAll}
                    disabled={uploading}
                    className="rounded-lg px-6 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                    style={{ background: "var(--accent-primary)" }}
                  >
                    {uploading
                      ? "Uploading..."
                      : `Upload ${pendingCount} file${pendingCount !== 1 ? "s" : ""}`}
                  </button>
                )}
                {pendingCount === 0 && successCount > 0 && successFiles.length === 1 && (
                  <button
                    onClick={() => router.push(`/review/${successFiles[0].contractId}`)}
                    className="rounded-lg px-6 py-2 text-sm font-semibold text-white"
                    style={{ background: "var(--accent-primary)" }}
                  >
                    View Analysis →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Supported formats — simple list, no cards */}
        {files.length === 0 && (
          <div className="mt-8" style={{ borderTop: "1px solid var(--border-primary)", paddingTop: "1.5rem" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-tertiary)" }}>Works great with</p>
            <div className="grid grid-cols-3 gap-6">
              {[
                { title: "NDAs", desc: "Perpetual terms, broad scope, missing carve-outs" },
                { title: "MSAs", desc: "Liability caps, indemnification, termination triggers" },
                { title: "Leases", desc: "Hidden obligations, renewal traps, assignment clauses" },
              ].map((tip) => (
                <div key={tip.title}>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{tip.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)", maxWidth: "28ch" }}>{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function FileRow({
  uploadedFile,
  onRemove,
  onViewContract,
}: {
  uploadedFile: UploadedFile;
  onRemove: () => void;
  onViewContract: () => void;
}) {
  const { file, status, error } = uploadedFile;
  return (
    <div
      className="flex items-center justify-between rounded-xl border px-4 py-3"
      style={{
        background: "var(--bg-secondary)",
        borderColor: status === "error" ? "var(--risk-critical-border)" : "var(--border-primary)",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-4 w-4 shrink-0" style={{ color: "var(--text-secondary)" }} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {file.name}
          </p>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {formatFileSize(file.size)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3">
        {status === "pending" && (
          <button
            onClick={onRemove}
            className="rounded p-1 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {status === "uploading" && (
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--accent-primary)" }} />
        )}
        {status === "success" && (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" style={{ color: "var(--risk-low)" }} />
            <button
              onClick={onViewContract}
              className="text-xs font-medium"
              style={{ color: "var(--accent-primary)" }}
            >
              View →
            </button>
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" style={{ color: "var(--risk-critical)" }} />
            <span className="text-xs" style={{ color: "var(--risk-critical)" }}>
              {error}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
