"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = isRegister
        ? await authApi.register(email, password, name)
        : await authApi.login(email, password);
      setAuth(res.data.user, res.data.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      setError(msg || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            ClauseGuard
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
            See risk before it sees you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-white p-8 shadow-xl dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
          {isRegister && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                placeholder="Jane Doe"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              placeholder="you@lawfirm.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-zinc-400">
            {isRegister ? "Already have an account?" : "Need an account?"}{" "}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              {isRegister ? "Sign in" : "Register"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
