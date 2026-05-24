"use client";
import { useEffect } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { authAPI } from "@/lib/api";

const navItems = [
  { href: "/dashboard", label: "Projects", icon: "⊞" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, token, setUser, setToken, logout } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const saved = sessionStorage.getItem("codesage_token");
    if (saved && !token) {
      setToken(saved);
      authAPI.me().then(r => setUser(r.data)).catch(() => { logout(); router.push("/login"); });
    } else if (!saved && !token) {
      router.push("/login");
    }
  }, [token, setToken, setUser, logout, router]);

  if (typeof window === "undefined") return null;
  if (!token && !sessionStorage.getItem("codesage_token")) return null;

  return (
    <div style={{ display: "flex", minHeight: "100dvh" }}>
      <aside style={{
        width: "220px", flexShrink: 0,
        background: "var(--color-surface)", borderRight: "1px solid var(--color-border)",
        display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100dvh",
        overflowY: "auto"
      }}>
        <div style={{ padding: "var(--space-4) var(--space-4)", borderBottom: "1px solid var(--color-border)" }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", textDecoration: "none" }}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="var(--color-primary)" fillOpacity="0.15"/>
              <path d="M8 10l4 4-4 4M14 18h6" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-sm)", color: "var(--color-text)" }}>CodeSage</span>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: "var(--space-3)" }}>
          {navItems.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", gap: "var(--space-3)",
                padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)",
                marginBottom: "var(--space-1)", textDecoration: "none", fontSize: "var(--text-sm)",
                color: active ? "var(--color-text)" : "var(--color-text-muted)",
                background: active ? "var(--color-surface-offset)" : "transparent",
                fontWeight: active ? 600 : 400,
                transition: "all var(--transition-interactive)"
              }}>
                <span>{item.icon}</span> {item.label}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "var(--color-primary-highlight)", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--color-primary)"
              }}>
                {(user.name || user.email)[0].toUpperCase()}
              </div>
              <div style={{ overflow: "hidden" }}>
                <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user.name || user.email}
                </p>
                <p style={{ fontSize: "10px", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user.email}
                </p>
              </div>
            </div>
            <button onClick={() => { logout(); router.push("/login"); }} style={{
              width: "100%", padding: "var(--space-2)", borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-xs)", color: "var(--color-text-muted)",
              border: "1px solid var(--color-border)", background: "none",
              transition: "all var(--transition-interactive)"
            }}>
              Sign out
            </button>
          </div>
        )}
      </aside>

      <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
    </div>
  );
}
