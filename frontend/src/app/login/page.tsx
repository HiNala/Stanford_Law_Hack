"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Flame, MessageSquare, Search } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

const DEMO_EMAIL = "demo@clauseguard.ai";
const DEMO_PASSWORD = "demo1234";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated, hydrate } = useAuthStore();
  const emailRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);
  useEffect(() => { emailRef.current?.focus(); }, []);

  const validate = () => {
    const errs: { email?: string; password?: string } = {};
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = "Enter a valid email";
    if (password.length < 8) errs.password = "At least 8 characters required";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;
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
      setError(msg || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError("");
    setLoading(true);
    try {
      let res;
      try {
        res = await authApi.login(DEMO_EMAIL, DEMO_PASSWORD);
      } catch {
        await authApi.register(DEMO_EMAIL, DEMO_PASSWORD, "Demo User");
        res = await authApi.login(DEMO_EMAIL, DEMO_PASSWORD);
      }
      setAuth(res.data.user, res.data.access_token);
      router.push("/dashboard");
    } catch {
      setError("Demo login failed. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="text-center">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "var(--accent-primary)" }}
          >
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1
            className="mt-5 text-3xl font-bold tracking-tight"
            style={{
              background: "linear-gradient(135deg, var(--text-primary) 0%, var(--accent-primary) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            ClauseGuard
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--text-tertiary)" }}>
            See risk before it sees you.
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl border p-8 space-y-5"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-primary)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {/* Demo CTA — primary action for hackathon */}
          <div>
            <Button
              type="button"
              onClick={handleDemoLogin}
              loading={loading}
              className="w-full"
            >
              Try Demo Login
            </Button>
            <p className="mt-2 text-center text-xs" style={{ color: "var(--text-tertiary)" }}>
              Instant access · no sign-up needed
            </p>
            {/* Feature chips */}
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              {[
                { icon: <Flame className="h-3 w-3" />, label: "Risk Heatmaps" },
                { icon: <MessageSquare className="h-3 w-3" />, label: "AI Clause Chat" },
                { icon: <Search className="h-3 w-3" />, label: "Semantic Search" },
              ].map(({ icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border"
                  style={{
                    background: "var(--bg-tertiary)",
                    borderColor: "var(--border-primary)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  {icon}
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t" style={{ borderColor: "var(--border-primary)" }} />
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>or sign in with email</span>
            <div className="flex-1 border-t" style={{ borderColor: "var(--border-primary)" }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
              />
            )}

            <Input
              ref={emailRef}
              id="email"
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldErrors((p) => ({ ...p, email: undefined }));
              }}
              placeholder="you@lawfirm.com"
              error={fieldErrors.email}
            />

            <Input
              id="password"
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((p) => ({ ...p, password: undefined }));
              }}
              placeholder="••••••••"
              error={fieldErrors.password}
            />

            {error && (
              <div
                className="rounded-lg px-3 py-2.5 text-xs"
                style={{
                  background: "var(--risk-critical-bg)",
                  color: "var(--risk-critical)",
                  border: "1px solid var(--risk-critical-border)",
                }}
              >
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} variant="secondary" className="w-full">
              {isRegister ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-xs" style={{ color: "var(--text-tertiary)" }}>
            {isRegister ? "Already have an account?" : "Need an account?"}{" "}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(""); setFieldErrors({}); }}
              className="font-medium transition-colors"
              style={{ color: "var(--accent-primary)" }}
            >
              {isRegister ? "Sign in" : "Register"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
