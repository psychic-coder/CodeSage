"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

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

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-[var(--color-bg)]">
      <div className="w-full max-w-[420px] animate-fadeIn">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 decoration-transparent transition-opacity hover:opacity-80">
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="var(--color-primary)" fillOpacity="0.15"/>
              <path d="M8 10l4 4-4 4M14 18h6" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-display font-bold text-[var(--text-lg)] text-[var(--color-text)]">CodeSage</span>
          </Link>
          <h1 className="mt-6 text-[var(--text-lg)] font-bold">Create your account</h1>
          <p className="text-[var(--color-text-muted)] text-[var(--text-sm)] mt-1">Start understanding your codebase</p>
        </div>
        <form onSubmit={handleSubmit} className="glass border border-[var(--color-border)] rounded-2xl p-8 flex flex-col gap-4">
          {error && (
            <div className="p-3 rounded-md bg-[var(--color-error-highlight)] text-[var(--color-error)] text-[var(--text-sm)]">
              {error}
            </div>
          )}
          {[
            { key: "name", label: "Name (optional)", type: "text", placeholder: "Your name" },
            { key: "email", label: "Email", type: "email", placeholder: "you@example.com" },
            { key: "password", label: "Password", type: "password", placeholder: "Min. 8 characters" },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key} className="flex flex-col gap-2">
              <label className="text-[var(--text-sm)] font-semibold text-[var(--color-text-muted)]">{label}</label>
              <input
                type={type} placeholder={placeholder}
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                required={key !== "name"}
                className="w-full p-3 rounded-md bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] text-[var(--text-sm)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] transition-shadow"
              />
            </div>
          ))}
          <button type="submit" disabled={loading} className={cn(
            "mt-2 p-3 rounded-md font-bold text-[var(--text-sm)] text-black transition-colors duration-200",
            loading ? "bg-[var(--color-primary-hover)] cursor-not-allowed opacity-80" : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] cursor-pointer"
          )}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="text-center mt-6 text-[var(--text-sm)] text-[var(--color-text-muted)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--color-primary)] no-underline font-semibold hover:text-[var(--color-primary-hover)] transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
