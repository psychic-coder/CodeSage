"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { authAPI } from "@/lib/api";
import { useAppStore } from "@/lib/store";

export default function GitHubCallbackPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { setToken, setUser } = useAppStore();
  const [error, setError] = useState("");
  const exchanged = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || exchanged.current || !session?.accessToken) return;
    exchanged.current = true;

    authAPI.github(session.accessToken)
      .then((res) => {
        setToken(res.data.access_token);
        return authAPI.me();
      })
      .then((res) => {
        setUser(res.data);
        router.replace("/dashboard");
      })
      .catch((err) => {
        exchanged.current = false;
        setError(err.response?.data?.detail || "GitHub sign-in failed.");
      });
  }, [status, session, router, setToken, setUser]);

  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "var(--space-6)" }}>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-8)" }}>
        <h1 style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: "var(--space-2)" }}>Completing GitHub sign-in</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
          We are exchanging your GitHub session for a CodeSage session.
        </p>
        {error && (
          <p style={{ marginTop: "var(--space-4)", color: "var(--color-error)", fontSize: "var(--text-sm)" }}>{error}</p>
        )}
      </div>
    </div>
  );
}