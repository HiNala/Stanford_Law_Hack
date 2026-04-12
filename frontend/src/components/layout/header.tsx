"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Shield, LayoutDashboard, Upload, LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

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
    router.push("/");
  };

  return (
    <header className="h-14 border-b border-(--border-primary) bg-(--bg-primary) flex items-center px-6 shrink-0">
      <Link href="/dashboard" className="flex items-center gap-2 mr-8">
        <Shield className="h-5 w-5 text-(--accent-primary)" />
        <span
          className="font-semibold"
          style={{
            background: "linear-gradient(90deg, var(--text-primary) 0%, var(--accent-primary) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          ClauseGuard
        </span>
      </Link>

      <nav className="flex items-center gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
              pathname === href
                ? "bg-(--bg-tertiary) text-(--text-primary)"
                : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-tertiary)"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {user && (
          <span className="text-xs text-(--text-tertiary)">{user.email}</span>
        )}
        <button
          onClick={handleLogout}
          aria-label="Log out"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-tertiary) transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </button>
      </div>
    </header>
  );
}
