"use client";
import { useState, type FormEvent } from "react";

interface Props {
  onSubmit: (url: string, token?: string) => void;
  loading?: boolean;
}

export function GitHubUrlInput({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (url.trim()) onSubmit(url.trim(), token.trim() || undefined);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div>
        <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: "var(--space-2)" }}>
          GitHub Repository URL
        </label>
        <input
          type="url" value={url} onChange={e => setUrl(e.target.value)} required
          placeholder="https://github.com/owner/repo"
          style={{
            width: "100%", padding: "var(--space-3)", borderRadius: "var(--radius-md)",
            background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
            color: "var(--color-text)", fontSize: "var(--text-sm)", outline: "none"
          }}
        />
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
          <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>
            GitHub Token (optional, for private repos)
          </label>
          <button type="button" onClick={() => setShowToken(s => !s)} style={{ fontSize: "var(--text-xs)", color: "var(--color-primary)", background: "none", border: "none" }}>
            {showToken ? "Hide" : "Show"}
          </button>
        </div>
        <input
          type={showToken ? "text" : "password"} value={token} onChange={e => setToken(e.target.value)}
          placeholder="ghp_..."
          style={{
            width: "100%", padding: "var(--space-3)", borderRadius: "var(--radius-md)",
            background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
            color: "var(--color-text)", fontSize: "var(--text-sm)", outline: "none"
          }}
        />
      </div>
      <button type="submit" disabled={loading || !url.trim()} style={{
        padding: "var(--space-3)", borderRadius: "var(--radius-md)",
        background: "var(--color-primary)", color: "#000", fontWeight: 700,
        fontSize: "var(--text-sm)", cursor: loading ? "not-allowed" : "pointer",
        opacity: loading || !url.trim() ? 0.7 : 1
      }}>
        {loading ? "Starting..." : "Import Repository"}
      </button>
    </form>
  );
}
