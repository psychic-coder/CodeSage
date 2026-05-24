"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/api";
import { useAppStore } from "@/lib/store";

export default function RegisterPage() {
  const router = useRouter();
  const { setToken, setUser } = useAppStore();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const res = await authAPI.register(form.email, form.password, form.name);
      setToken(res.data.access_token);
      const me = await authAPI.me();
      setUser(me.data);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    padding: "var(--space-3)", borderRadius: "var(--radius-md)",
    background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
    color: "var(--color-text)", fontSize: "var(--text-sm)", outline: "none", width: "100%"
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-4)", background: "var(--color-bg)" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", textDecoration: "none" }}>
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="var(--color-primary)" fillOpacity="0.15"/>
              <path d="M8 10l4 4-4 4M14 18h6" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-lg)", color: "var(--color-text)" }}>CodeSage</span>
          </Link>
          <h1 style={{ marginTop: "var(--space-6)", fontSize: "var(--text-lg)", fontWeight: 700 }}>Create your account</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}>Start understanding your codebase</p>
        </div>
        <form onSubmit={handleSubmit} style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)", padding: "var(--space-8)", display: "flex", flexDirection: "column", gap: "var(--space-4)"
        }}>
          {error && <div style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)", background: "var(--color-error-highlight)", color: "var(--color-error)", fontSize: "var(--text-sm)" }}>{error}</div>}
          {[
            { key: "name", label: "Name (optional)", type: "text", placeholder: "Your name" },
            { key: "email", label: "Email", type: "email", placeholder: "you@example.com" },
            { key: "password", label: "Password", type: "password", placeholder: "Min. 8 characters" },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <label style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-text-muted)" }}>{label}</label>
              <input
                type={type} placeholder={placeholder}
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                required={key !== "name"}
                style={inputStyle}
              />
            </div>
          ))}
          <button type="submit" disabled={loading} style={{
            padding: "var(--space-3)", borderRadius: "var(--radius-md)",
            background: "var(--color-primary)", color: "#000", fontWeight: 700,
            fontSize: "var(--text-sm)", cursor: loading ? "not-allowed" : "pointer", marginTop: "var(--space-2)"
          }}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
