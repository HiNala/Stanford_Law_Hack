/**
 * API client for communicating with the ClauseGuard backend.
 *
 * All requests go to /api/* which Next.js rewrites to the backend.
 * This eliminates any CORS issues for both regular requests and SSE streams.
 */

import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("clauseguard_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auth
export const authApi = {
  register: (email: string, password: string, fullName?: string) =>
    api.post("/auth/register", { email, password, full_name: fullName }),
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  me: () => api.get("/auth/me"),
};

// Contracts
export const contractsApi = {
  list: (page = 1, pageSize = 50) =>
    api.get("/contracts/", { params: { page, page_size: pageSize } }),
  get: (id: string) => api.get(`/contracts/${id}`),
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/contracts/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  delete: (id: string) => api.delete(`/contracts/${id}`),
};

// Clauses
export const clausesApi = {
  list: (contractId: string) => api.get(`/clauses/${contractId}`),
  summary: (contractId: string) => api.get(`/clauses/${contractId}/summary`),
};

// Analysis
export const analysisApi = {
  status: (contractId: string) => api.get(`/analysis/${contractId}/status`),
  report: (contractId: string) =>
    api.post(`/analysis/${contractId}/report`),
};

// Chat (SSE streaming — uses fetch for the stream, axios for history)
export type ChatStreamEvent =
  | { type: "context"; clause_ids: string[] }
  | { type: "token"; content: string }
  | { type: "error"; detail: string }
  | { type: "done" };

export const chatApi = {
  send: async function* (contractId: string, message: string): AsyncGenerator<ChatStreamEvent> {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("clauseguard_token")
        : null;

    const response = await fetch(`/api/chat/${contractId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, contract_id: contractId }),
    });

    if (!response.ok || !response.body) {
      throw new Error("Chat stream failed");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") return;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "context" && Array.isArray(parsed.clause_ids)) {
              yield { type: "context", clause_ids: parsed.clause_ids as string[] };
            } else if (parsed.type === "token" && parsed.content) {
              yield { type: "token", content: parsed.content as string };
            } else if (parsed.content) {
              // Backwards compat: events without explicit type but with content
              yield { type: "token", content: parsed.content as string };
            } else if (parsed.type === "error") {
              yield { type: "error", detail: (parsed.detail as string) ?? "Service error" };
            } else if (parsed.type === "done") {
              yield { type: "done" };
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    }
  },
  history: (contractId: string) => api.get(`/chat/${contractId}/history`),
};

// Search
export const searchApi = {
  search: (query: string, contractId?: string, topK = 10) =>
    api.post("/search/", { query, contract_id: contractId, top_k: topK }),
};

// Portfolio stats & analytics
export const statsApi = {
  get: () => api.get("/stats/"),
  patterns: (contractIds?: string[]) =>
    api.get("/stats/patterns", {
      params: contractIds?.length ? { contract_ids: contractIds.join(",") } : {},
    }),
};

export default api;
