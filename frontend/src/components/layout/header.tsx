"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Shield, LayoutDashboard, Upload, LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header
      className="h-14 border-b flex items-center px-6 shrink-0"
      style={{ borderColor: "var(--border-primary)", background: "var(--bg-primary)" }}
    >
      <Link href="/dashboard" className="flex items-center gap-2 mr-8">
        <Shield className="h-5 w-5" style={{ color: "var(--accent-primary)" }} />
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
          ClauseGuard
        </span>
      </Link>

      <nav className="flex items-center gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{
              background: pathname === href ? "var(--bg-tertiary)" : "transparent",
              color: pathname === href ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {user && (
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {user.full_name || user.email}
          </span>
        )}
        <button
          onClick={handleLogout}
          aria-label="Log out"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
          }}
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </button>
      </div>
    </header>
  );
}
