"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/api";
import { useAppStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { setToken, setUser } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authAPI.login(email, password);
      setToken(res.data.access_token);
      const me = await authAPI.me();
      setUser(me.data);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "var(--space-4)", background: "var(--color-bg)"
    }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", textDecoration: "none" }}>
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="var(--color-primary)" fillOpacity="0.15"/>
              <path d="M8 10l4 4-4 4M14 18h6" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-lg)", color: "var(--color-text)" }}>CodeSage</span>
          </Link>
          <h1 style={{ marginTop: "var(--space-6)", fontSize: "var(--text-lg)", fontWeight: 700 }}>Welcome back</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)", padding: "var(--space-8)", display: "flex", flexDirection: "column", gap: "var(--space-4)"
        }}>
          {error && (
            <div style={{
              padding: "var(--space-3)", borderRadius: "var(--radius-md)",
              background: "var(--color-error-highlight)", color: "var(--color-error)",
              fontSize: "var(--text-sm)"
            }}>{error}</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <label style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-text-muted)" }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="you@example.com"
              style={{
                padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                color: "var(--color-text)", fontSize: "var(--text-sm)", outline: "none"
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <label style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-text-muted)" }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              style={{
                padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                color: "var(--color-text)", fontSize: "var(--text-sm)", outline: "none"
              }}
            />
          </div>
          <button
            type="submit" disabled={loading}
            style={{
              padding: "var(--space-3)", borderRadius: "var(--radius-md)",
              background: loading ? "var(--color-primary-hover)" : "var(--color-primary)",
              color: "#000", fontWeight: 700, fontSize: "var(--text-sm)",
              cursor: loading ? "not-allowed" : "pointer", marginTop: "var(--space-2)"
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
