"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { authAPI } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

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
          <h1 className="mt-6 text-[var(--text-lg)] font-bold">Welcome back</h1>
          <p className="text-[var(--color-text-muted)] text-[var(--text-sm)] mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="glass border border-[var(--color-border)] rounded-2xl p-8 flex flex-col gap-4">
          {error && (
            <div className="p-3 rounded-md bg-[var(--color-error-highlight)] text-[var(--color-error)] text-[var(--text-sm)]">
              {error}
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <label className="text-[var(--text-sm)] font-semibold text-[var(--color-text-muted)]">Email</label>
            <input
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required
              placeholder="you@example.com"
              className="p-3 rounded-md bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] text-[var(--text-sm)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] transition-shadow"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-[var(--text-sm)] font-semibold text-[var(--color-text-muted)]">Password</label>
            <input
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required
              placeholder="••••••••"
              className="p-3 rounded-md bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] text-[var(--text-sm)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] transition-shadow"
            />
          </div>
          
          <button
            type="submit" 
            disabled={loading}
            className={cn(
              "mt-2 p-3 rounded-md font-bold text-[var(--text-sm)] text-black transition-colors duration-200",
              loading ? "bg-[var(--color-primary-hover)] cursor-not-allowed opacity-80" : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] cursor-pointer"
            )}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <div className="flex items-center gap-3 text-[var(--color-text-muted)] text-[var(--text-xs)] my-2">
            <span className="flex-1 h-[1px] bg-[var(--color-border)]" />
            <span>or</span>
            <span className="flex-1 h-[1px] bg-[var(--color-border)]" />
          </div>

          <button
            type="button"
            onClick={() => signIn("github", { callbackUrl: "/auth/github/callback" })}
            className="p-3 rounded-md bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] font-bold text-[var(--text-sm)] cursor-pointer hover:bg-[var(--color-surface-offset)] transition-colors duration-200"
          >
            Continue with GitHub
          </button>
        </form>

        <p className="text-center mt-6 text-[var(--text-sm)] text-[var(--color-text-muted)]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[var(--color-primary)] no-underline font-semibold hover:text-[var(--color-primary-hover)] transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
