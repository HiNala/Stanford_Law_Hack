"use client";

/**
 * Upload page — drag-and-drop contract upload with progress feedback.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { contractsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface UploadedFile {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  contractId?: string;
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles = accepted.map((file) => ({
      file,
      status: "pending" as const,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    maxSize: 50 * 1024 * 1024,
  });

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <header className="border-b border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-800">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-4 px-6">
          <button onClick={() => router.push("/dashboard")} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Upload Contracts</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 transition-colors cursor-pointer",
            isDragActive
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20"
              : "border-gray-300 bg-white hover:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-900"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 text-gray-300 dark:text-zinc-600" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            {isDragActive ? "Drop files here" : "Drag & drop contracts"}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            PDF, DOCX, or TXT — up to 50MB each
          </p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-8 space-y-3">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3 dark:bg-zinc-900 dark:border-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{f.file.name}</p>
                    <p className="text-xs text-gray-400">{(f.file.size / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
                <div>
                  {f.status === "pending" && <span className="text-xs text-gray-400">Ready</span>}
                  {f.status === "uploading" && (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                  )}
                  {f.status === "success" && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {f.status === "error" && (
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <span className="text-xs text-red-500">{f.error}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500">
                {successCount} uploaded, {pendingCount} pending
              </p>
              <div className="flex gap-3">
                {successCount > 0 && (
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Go to Dashboard
                  </button>
                )}
                {pendingCount > 0 && (
                  <button
                    onClick={handleUploadAll}
                    disabled={uploading}
                    className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                  >
                    {uploading ? "Uploading..." : `Upload ${pendingCount} file${pendingCount > 1 ? "s" : ""}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
