"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  File,
  FileCode,
} from "lucide-react";
import { contractsApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { cn, formatFileSize } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "@/components/ui/logo";

interface UploadedFile {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  contractId?: string;
  error?: string;
  progress?: number; // 0-100
}

export default function UploadPage() {
  const router = useRouter();
  const { isAuthenticated, hydrate } = useAuthStore();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [rejectedNames, setRejectedNames] = useState<string[]>([]);
  const autoUploadDone = useRef(false);

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  const onDrop = useCallback((accepted: File[], rejected: { file: File; errors: readonly { message: string }[] }[]) => {
    const newFiles = accepted.map((file) => ({ file, status: "pending" as const }));
    if (rejected.length > 0) {
      setRejectedNames(rejected.map((r) => r.file.name));
      setTimeout(() => setRejectedNames([]), 4000);
    }
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.file.name));
      return [...prev, ...newFiles.filter((f) => !existingNames.has(f.file.name))];
    });
    autoUploadDone.current = false;
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
    if (uploading) return;
    setUploading(true);
    const updated = [...files];

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status !== "pending") continue;
      updated[i] = { ...updated[i], status: "uploading", progress: 0 };
      setFiles([...updated]);

      // Fake progress while waiting for upload
      let fakeProgress = 0;
      const progressInterval = setInterval(() => {
        fakeProgress = Math.min(fakeProgress + Math.random() * 15, 85);
        updated[i] = { ...updated[i], progress: Math.round(fakeProgress) };
        setFiles([...updated]);
      }, 200);

      try {
        const res = await contractsApi.upload(updated[i].file);
        clearInterval(progressInterval);
        updated[i] = { ...updated[i], status: "success", contractId: res.data.id, progress: 100 };
      } catch (err: unknown) {
        clearInterval(progressInterval);
        const msg =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
            : null;
        updated[i] = { ...updated[i], status: "error", error: msg || "Upload failed", progress: undefined };
      }
      setFiles([...updated]);
    }
    setUploading(false);
  };

  // Auto-upload when files are dropped
  useEffect(() => {
    const hasPending = files.some((f) => f.status === "pending");
    if (hasPending && !uploading && !autoUploadDone.current) {
      autoUploadDone.current = true;
      handleUploadAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

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
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <header
        className="border-b h-14 flex items-center shrink-0"
        style={{ borderColor: "var(--border-primary)", background: "var(--bg-secondary)" }}
      >
        <div className="mx-auto flex w-full max-w-2xl items-center gap-4 px-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg p-1.5 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Logo size="sm" />
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Upload Contracts</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-6 py-10 flex-1">

        {/* Rejected files alert */}
        {rejectedNames.length > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border px-4 py-3" style={{ background: "var(--risk-critical-bg)", borderColor: "var(--risk-critical-border)" }}>
            <AlertCircle className="h-4 w-4 shrink-0" style={{ color: "var(--risk-critical)" }} />
            <p className="text-sm" style={{ color: "var(--risk-critical)" }}>
              <span className="font-semibold">{rejectedNames.join(", ")}</span> — unsupported. Use PDF, DOCX, or TXT.
            </p>
          </div>
        )}

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={cn("relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all cursor-pointer")}
          style={{
            minHeight: files.length === 0 ? "280px" : "140px",
            borderColor: isDragReject ? "var(--risk-critical)" : isDragActive ? "var(--accent-primary)" : "var(--border-secondary)",
            background: isDragActive ? "rgba(21,96,252,0.06)" : isDragReject ? "var(--risk-critical-bg)" : "var(--bg-secondary)",
          }}
        >
          <input {...getInputProps()} />
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4 transition-colors"
            style={{
              background: isDragActive ? "rgba(21,96,252,0.12)" : isDragReject ? "rgba(239,68,68,0.12)" : "var(--bg-tertiary)",
            }}
          >
            <Upload
              className="h-6 w-6 transition-colors"
              style={{ color: isDragActive ? "var(--accent-primary)" : isDragReject ? "var(--risk-critical)" : "var(--text-tertiary)" }}
            />
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            {isDragReject ? "Unsupported file" : isDragActive ? "Drop to start analysis" : "Drop contracts here"}
          </h3>
          <p className="text-sm mb-4" style={{ color: "var(--text-tertiary)" }}>
            {isDragReject ? "Use PDF, DOCX, or TXT files" : "PDF · DOCX · TXT — up to 50 MB each"}
          </p>
          {!isDragActive && !isDragReject && (
            <span
              className="rounded-lg border px-4 py-1.5 text-sm font-medium"
              style={{ borderColor: "var(--border-secondary)", color: "var(--text-secondary)" }}
            >
              Browse files
            </span>
          )}
        </div>

        {/* Auto-redirect countdown banner */}
        {redirectCountdown !== null && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border px-4 py-3" style={{ background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.25)" }}>
            <span className="h-2 w-2 rounded-full animate-pulse shrink-0" style={{ background: "var(--risk-low)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--risk-low)" }}>
              Opening review in {redirectCountdown}s…
            </p>
            <button
              onClick={() => router.push(`/review/${successFiles[0].contractId}`)}
              className="ml-auto rounded-lg px-3 py-1 text-xs font-semibold text-white"
              style={{ background: "var(--risk-low)" }}
            >
              Open now →
            </button>
          </div>
        )}

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-5 space-y-2">
            {files.map((f, i) => (
              <FileRow
                key={`${f.file.name}-${i}`}
                uploadedFile={f}
                onRemove={() => removeFile(i)}
                onViewContract={() => f.contractId && router.push(`/review/${f.contractId}`)}
              />
            ))}

            {/* Bottom action bar */}
            <div className="flex items-center justify-between pt-3">
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {successCount > 0 && <span style={{ color: "var(--risk-low)" }}>{successCount} ready</span>}
                {uploading && <span style={{ color: "var(--accent-primary)" }}> · uploading…</span>}
                {errorCount > 0 && <span style={{ color: "var(--risk-critical)" }}> · {errorCount} failed</span>}
              </p>
              <div className="flex gap-2">
                {successCount > 1 && (
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="rounded-lg border px-4 py-2 text-sm font-medium"
                    style={{ borderColor: "var(--border-secondary)", color: "var(--text-secondary)" }}
                  >
                    Go to Dashboard
                  </button>
                )}
                {pendingCount === 0 && successCount === 1 && successFiles[0]?.contractId && (
                  <button
                    onClick={() => router.push(`/review/${successFiles[0].contractId}`)}
                    className="rounded-lg px-5 py-2 text-sm font-semibold text-white"
                    style={{ background: "var(--accent-primary)" }}
                  >
                    Review Analysis →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contract type hints */}
        {files.length === 0 && (
          <div className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-tertiary)" }}>
              ClauseGuard excels at
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { title: "NDAs", desc: "Perpetual terms, broad scope, missing carve-outs" },
                { title: "MSAs", desc: "Liability caps, indemnification, termination triggers" },
                { title: "SaaS Agreements", desc: "Auto-renewal traps, data privacy, service levels" },
                { title: "Leases", desc: "Hidden obligations, renewal clauses, assignment restrictions" },
                { title: "Employment", desc: "Non-compete scope, IP ownership, severance terms" },
                { title: "M&A Docs", desc: "Reps & warranties, indemnification exposure, escrow" },
              ].map((tip) => (
                <div key={tip.title} className="rounded-xl border p-3.5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{tip.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>{tip.desc}</p>
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
  const { file, status, error, progress } = uploadedFile;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const Icon = ext === "pdf" ? FileText : ext === "txt" ? FileCode : File;
  const iconColor = ext === "pdf" ? "#EF4444" : ext === "txt" ? "#8B5CF6" : "var(--text-secondary)";

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: "var(--bg-secondary)",
        borderColor: status === "error" ? "var(--risk-critical-border)" : status === "success" ? "rgba(34,197,94,0.25)" : "var(--border-primary)",
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0" style={{ background: "var(--bg-tertiary)" }}>
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{file.name}</p>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {formatFileSize(file.size)}
            {status === "uploading" && progress !== undefined && (
              <span style={{ color: "var(--accent-primary)" }}> · {progress}%</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {status === "pending" && (
            <button onClick={onRemove} className="rounded-lg p-1 transition-colors" style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--risk-critical)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}
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
              <button onClick={onViewContract} className="text-xs font-semibold underline" style={{ color: "var(--accent-primary)" }}>
                Open →
              </button>
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" style={{ color: "var(--risk-critical)" }} />
              <span className="text-xs" style={{ color: "var(--risk-critical)" }}>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Upload progress bar */}
      {status === "uploading" && progress !== undefined && (
        <div className="h-0.5 w-full" style={{ background: "var(--bg-tertiary)" }}>
          <div
            className="h-full transition-all"
            style={{ width: `${progress}%`, background: "var(--accent-primary)", transition: "width 0.25s ease" }}
          />
        </div>
      )}
    </div>
  );
}
