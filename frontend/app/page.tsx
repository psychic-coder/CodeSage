"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";



const COLORS = {
  bg: "#0A0E14",
  surface: "#0E131D",
  surfaceRaised: "#121929",
  border: "#1C2333",
  borderBright: "#2A3349",
  signal: "#7C9FFF",
  signalDim: "#3D4A7A",
  pulse: "#4ADE80",
  pulseDim: "#1F3A2A",
  text: "#E4E7EE",
  textMuted: "#8B92A8",
  textFaint: "#525B72",
};


function DependencyGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tick, setTick] = useState(0);

  type Node = { id: string; x: number; y: number; label: string; risk?: boolean };
  const nodes: Node[] = [
    { id: "auth", x: 90, y: 80, label: "auth.ts" },
    { id: "api", x: 260, y: 50, label: "api/route.ts" },
    { id: "db", x: 430, y: 90, label: "db.ts" },
    { id: "user", x: 160, y: 200, label: "user.model.ts", risk: true },
    { id: "session", x: 340, y: 220, label: "session.ts" },
    { id: "ui", x: 500, y: 200, label: "ProfileCard.tsx" },
    { id: "hooks", x: 80, y: 300, label: "useAuth.ts" },
    { id: "mw", x: 420, y: 300, label: "middleware.ts" },
  ];
  const edges: [string, string][] = [
    ["auth", "api"], ["api", "db"], ["auth", "user"], ["user", "session"],
    ["session", "ui"], ["api", "mw"], ["hooks", "auth"], ["mw", "db"],
    ["session", "mw"], ["hooks", "user"],
  ];

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2600);
    return () => clearInterval(id);
  }, []);

  const get = (id: string) => nodes.find((n) => n.id === id)!;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 560 360"
      width="100%"
      height="100%"
      style={{ overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="riskGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={COLORS.signal} stopOpacity="0.35" />
          <stop offset="100%" stopColor={COLORS.signal} stopOpacity="0" />
        </radialGradient>
      </defs>

      {edges.map(([a, b], i) => {
        const na = get(a);
        const nb = get(b);
        return (
          <line
            key={i}
            x1={na.x}
            y1={na.y}
            x2={nb.x}
            y2={nb.y}
            stroke={COLORS.borderBright}
            strokeWidth="1.5"
            strokeDasharray="3 4000"
            style={{
              animation: `drawEdge 1.6s ease-out forwards`,
              animationDelay: `${0.15 * i}s`,
            }}
          />
        );
      })}

      {nodes.map((n, i) => (
        <g
          key={n.id}
          style={{
            opacity: 0,
            animation: `popIn 0.5s ease-out forwards`,
            animationDelay: `${1.0 + i * 0.1}s`,
          }}
        >
          {n.risk && <circle cx={n.x} cy={n.y} r="34" fill="url(#riskGlow)" key={`glow-${tick}`} className="risk-ripple" />}
          <circle
            cx={n.x}
            cy={n.y}
            r={n.risk ? 7 : 5}
            fill={n.risk ? COLORS.signal : COLORS.surfaceRaised}
            stroke={n.risk ? COLORS.signal : COLORS.borderBright}
            strokeWidth="1.5"
          />
          <text
            x={n.x}
            y={n.y - 14}
            textAnchor="middle"
            fontSize="10.5"
            fontFamily="var(--font-mono, monospace)"
            fill={n.risk ? COLORS.signal : COLORS.textMuted}
            fontWeight={n.risk ? 600 : 400}
          >
            {n.label}
          </text>
        </g>
      ))}

      <style>{`
        @keyframes drawEdge {
          to { stroke-dasharray: 4000 0; }
        }
        @keyframes popIn {
          to { opacity: 1; }
        }
        .risk-ripple {
          animation: ripple 2.6s ease-out infinite;
          animation-delay: 2.4s;
        }
        @keyframes ripple {
          0% { r: 7; opacity: 0; }
          15% { opacity: 0.9; }
          100% { r: 60; opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          line, g, .risk-ripple { animation: none !important; opacity: 1 !important; stroke-dasharray: none !important; }
        }
      `}</style>
    </svg>
  );
}


function TerminalBlock() {
  const lines = [
    { prompt: true, text: "codesage import github.com/acme/checkout-service" },
    { prompt: false, text: "✓ parsed 1,204 files → AST → dependency graph", dim: true },
    { prompt: false, text: "✓ embeddings generated · graph stored in Neo4j", dim: true },
    { prompt: true, text: 'codesage ask "what breaks if I change refundOrder()?"' },
    { prompt: false, text: "→ 6 files affected, 2 high-risk", accent: true },
    { prompt: false, text: "  payments/refund.ts        (direct caller)", dim: true },
    { prompt: false, text: "  orders/orderState.ts      (state mutation)", dim: true },
    { prompt: false, text: "  webhooks/stripeSync.ts    ⚠ no test coverage", risk: true },
  ];

  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 30px 60px -30px rgba(0,0,0,0.6)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          borderBottom: `1px solid ${COLORS.border}`,
          background: COLORS.surfaceRaised,
        }}
      >
        {["#ef4444", "#eab308", "#22c55e"].map((c) => (
          <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.85 }} />
        ))}
        <span style={{ marginLeft: 8, fontSize: 12, color: COLORS.textFaint, fontFamily: "var(--font-mono)" }}>
          codesage — repository session
        </span>
      </div>
      <div style={{ padding: "18px 20px", fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: 1.9 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ display: "flex", gap: 10 }}>
            {l.prompt && <span style={{ color: COLORS.pulse, flexShrink: 0 }}>❯</span>}
            {!l.prompt && <span style={{ width: 14, flexShrink: 0 }} />}
            <span
              style={{
                color: l.risk ? "#F0B844" : l.accent ? COLORS.signal : l.dim ? COLORS.textMuted : COLORS.text,
                whiteSpace: "pre",
              }}
            >
              {l.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div
      style={{
        padding: "28px 26px",
        borderRadius: 14,
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        position: "relative",
        transition: "border-color 0.2s, transform 0.2s",
      }}
      className="feature-card"
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 9,
          background: COLORS.surfaceRaised,
          border: `1px solid ${COLORS.borderBright}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 17,
          marginBottom: 18,
        }}
      >
        {icon}
      </div>
      <h3 style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600, marginBottom: 8, color: COLORS.text, letterSpacing: "-0.01em" }}>
        {title}
      </h3>
      <p style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 1.65, margin: 0 }}>{desc}</p>
      <style>{`
        .feature-card:hover { border-color: ${COLORS.borderBright}; transform: translateY(-2px); }
      `}</style>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)",
        backgroundImage: `radial-gradient(circle at 20% 0%, ${COLORS.signalDim}1a 0%, transparent 45%)`,
      }}
    >
      {/* faint grid texture, like a graph canvas */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `linear-gradient(${COLORS.border}55 1px, transparent 1px), linear-gradient(90deg, ${COLORS.border}55 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          opacity: 0.4,
          pointerEvents: "none",
          maskImage: "radial-gradient(ellipse 80% 50% at 50% 0%, black 30%, transparent 70%)",
        }}
      />

      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 32px",
          borderBottom: `1px solid ${COLORS.border}`,
          position: "sticky",
          top: 0,
          background: `${COLORS.bg}cc`,
          zIndex: 50,
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-label="CodeSage logo">
            <rect width="28" height="28" rx="7" fill={COLORS.signal} fillOpacity="0.12" />
            <circle cx="8" cy="14" r="2.2" fill={COLORS.signal} />
            <circle cx="20" cy="8" r="2.2" fill={COLORS.signal} />
            <circle cx="20" cy="20" r="2.2" fill={COLORS.signal} />
            <path d="M10 14L18 8M10 14L18 20" stroke={COLORS.signal} strokeWidth="1.4" />
          </svg>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em" }}>
            CodeSage
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link
            href="/login"
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              color: COLORS.textMuted,
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              background: COLORS.text,
              color: COLORS.bg,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 40,
          padding: "clamp(3rem,8vw,6rem) 32px clamp(2rem,5vw,3rem)",
          maxWidth: 1280,
          marginInline: "auto",
          position: "relative",
        }}
        className="hero-grid"
      >
        <div style={{ maxWidth: 600 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              background: COLORS.pulseDim,
              border: `1px solid ${COLORS.pulse}33`,
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.pulse,
              marginBottom: 24,
              fontFamily: "var(--font-mono)",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.pulse, display: "inline-block" }} />
            Graph-augmented RAG for your repository
          </div>
          <h1
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(2.1rem, 4vw, 3.2rem)",
              fontWeight: 600,
              lineHeight: 1.12,
              marginBottom: 22,
              letterSpacing: "-0.02em",
            }}
          >
            See every consequence
            <br />
            <span style={{ color: COLORS.signal }}>before you ship it.</span>
          </h1>
          <p style={{ fontSize: 16.5, color: COLORS.textMuted, lineHeight: 1.7, marginBottom: 32, maxWidth: 480 }}>
            CodeSage parses your repository into a live dependency graph, so when you describe a
            change, it traces every file, function, and edge case that touches it — before you
            write a single line.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/register"
              style={{
                padding: "13px 26px",
                borderRadius: 9,
                background: COLORS.signal,
                color: "#0A0E14",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 14.5,
              }}
            >
              Map your first repo →
            </Link>
            <Link
              href="#how-it-works"
              style={{
                padding: "13px 26px",
                borderRadius: 9,
                border: `1px solid ${COLORS.border}`,
                color: COLORS.textMuted,
                textDecoration: "none",
                fontSize: 14.5,
                fontFamily: "var(--font-mono)",
              }}
            >
              See it run
            </Link>
          </div>
          <div style={{ display: "flex", gap: 28, marginTop: 44, fontFamily: "var(--font-mono)" }}>
            {[
              ["1.2k+", "files / sec parsed"],
              ["12", "languages supported"],
              ["0", "lines written for you"],
            ].map(([n, l]) => (
              <div key={l}>
                <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.text }}>{n}</div>
                <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: `linear-gradient(180deg, ${COLORS.surface} 0%, ${COLORS.bg} 100%)`,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            padding: 12,
            minHeight: 380,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <DependencyGraph />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: "clamp(3rem,7vw,5rem) 32px", maxWidth: 1280, marginInline: "auto" }}>
        <div style={{ marginBottom: 44, maxWidth: 560 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: COLORS.signal, letterSpacing: "0.04em" }}>
           {/*  */}
          </span>
          <h2
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
              fontWeight: 600,
              marginTop: 10,
              letterSpacing: "-0.01em",
            }}
          >
            Built on the graph, not on top of it
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <FeatureCard
            icon="⚡"
            title="Impact prediction"
            desc="Describe a feature in plain English. Get the exact files that need to change, ranked by risk, with suggested edits per file."
          />
          <FeatureCard
            icon="◆"
            title="Live dependency graph"
            desc="Every file is a node, every import is an edge. Click a node to walk its full upstream and downstream neighborhood."
          />
          <FeatureCard
            icon="▲"
            title="Architecture risk detection"
            desc="Circular dependencies, god files, tight coupling, and layer violations get surfaced automatically, not after the postmortem."
          />
          <FeatureCard
            icon="◷"
            title="Faster onboarding"
            desc="Ask any question about the codebase and get a structured answer: execution flow, relevant files, and a sane reading order."
          />
          <FeatureCard
            icon="✦"
            title="Standing recommendations"
            desc="Continuous analysis quietly flags security gaps, performance bottlenecks, and overdue refactors as the repo evolves."
          />
          <FeatureCard
            icon="◌"
            title="Any language, any source"
            desc="TypeScript, Python, Java, Go, Rust, and more. Import by GitHub URL, ZIP upload, or local path — same graph either way."
          />
        </div>
      </section>

      {/* ── HOW IT WORKS (terminal) ── */}
      <section
        id="how-it-works"
        style={{ padding: "clamp(3rem,7vw,5rem) 32px", borderTop: `1px solid ${COLORS.border}` }}
      >
        <div
          style={{
            maxWidth: 1280,
            marginInline: "auto",
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 48,
            alignItems: "center",
          }}
          className="howitworks-grid"
        >
          <div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: COLORS.signal, letterSpacing: "0.04em" }}>
             
            </span>
            <h2
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                fontWeight: 600,
                marginTop: 10,
                marginBottom: 18,
                letterSpacing: "-0.01em",
              }}
            >
              Three commands.
              <br />
              No new mental model.
            </h2>
            <p style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 1.7, maxWidth: 420, marginBottom: 24 }}>
              Import a repo, let CodeSage build the graph, then ask it anything — in the terminal,
              in your IDE, or through the dashboard. The graph updates as your code does.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                "Parses AST → builds dependency graph → generates embeddings",
                "Stores structure in Neo4j, semantics in a vector index",
                "Re-syncs incrementally on every push, not a full rebuild",
              ].map((t) => (
                <li key={t} style={{ display: "flex", gap: 10, fontSize: 13.5, color: COLORS.textMuted }}>
                  <span style={{ color: COLORS.pulse, flexShrink: 0 }}>—</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <TerminalBlock />
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ textAlign: "center", padding: "clamp(4rem,9vw,7rem) 32px", borderTop: `1px solid ${COLORS.border}` }}>
        <h2
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
            fontWeight: 600,
            marginBottom: 14,
            letterSpacing: "-0.01em",
          }}
        >
          Stop guessing what breaks.
        </h2>
        <p style={{ color: COLORS.textMuted, marginBottom: 32, fontSize: 15.5 }}>
          Import your first repository — the graph is ready in under a minute.
        </p>
        <Link
          href="/register"
          style={{
            padding: "15px 34px",
            borderRadius: 9,
            background: COLORS.signal,
            color: "#0A0E14",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 15,
            display: "inline-block",
          }}
        >
          Get started free →
        </Link>
      </section>

      <footer
        style={{
          borderTop: `1px solid ${COLORS.border}`,
          padding: "24px 32px",
          textAlign: "center",
          fontSize: 12.5,
          color: COLORS.textFaint,
          fontFamily: "var(--font-mono)",
        }}
      >
        CodeSage — repository intelligence, graph-first.
      </footer>

      <style>{`
        @media (min-width: 960px) {
          .hero-grid { grid-template-columns: 1fr 1fr !important; align-items: center; }
          .howitworks-grid { grid-template-columns: 1fr 1fr !important; }
        }
        a:focus-visible, button:focus-visible {
          outline: 2px solid ${COLORS.signal};
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}