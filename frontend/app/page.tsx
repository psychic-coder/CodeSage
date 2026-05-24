import Link from "next/link";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100dvh", background: "var(--color-bg)", color: "var(--color-text)" }}>
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "var(--space-4) var(--space-8)", borderBottom: "1px solid var(--color-border)",
        position: "sticky", top: 0, background: "var(--color-bg)", zIndex: 50,
        backdropFilter: "blur(12px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="CodeSage logo">
            <rect width="28" height="28" rx="6" fill="var(--color-primary)" fillOpacity="0.15"/>
            <path d="M8 10l4 4-4 4M14 18h6" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-lg)" }}>CodeSage</span>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <Link href="/login" style={{
            padding: "var(--space-2) var(--space-4)", borderRadius: "var(--radius-md)",
            color: "var(--color-text-muted)", textDecoration: "none", fontSize: "var(--text-sm)"
          }}>Sign in</Link>
          <Link href="/register" style={{
            padding: "var(--space-2) var(--space-4)", borderRadius: "var(--radius-md)",
            background: "var(--color-primary)", color: "#000", textDecoration: "none",
            fontWeight: 600, fontSize: "var(--text-sm)"
          }}>Get Started</Link>
        </div>
      </nav>

      <section style={{ textAlign: "center", padding: "clamp(4rem, 10vw, 8rem) var(--space-8)" }}>
        <div style={{
          display: "inline-block", padding: "var(--space-1) var(--space-3)",
          background: "var(--color-primary-highlight)", borderRadius: "var(--radius-full)",
          color: "var(--color-primary)", fontSize: "var(--text-xs)", fontWeight: 600,
          marginBottom: "var(--space-6)", letterSpacing: "0.05em", textTransform: "uppercase"
        }}>
          AI-Powered Repository Intelligence
        </div>
        <h1 style={{
          fontFamily: "var(--font-display)", fontSize: "clamp(2.5rem, 5vw, 4rem)",
          fontWeight: 700, lineHeight: 1.1, marginBottom: "var(--space-6)",
          maxWidth: "820px", marginInline: "auto"
        }}>
          Understand Your Codebase<br />
          <span style={{ color: "var(--color-primary)" }}>Before You Change It</span>
        </h1>
        <p style={{
          fontSize: "var(--text-lg)", color: "var(--color-text-muted)",
          maxWidth: "600px", marginInline: "auto", marginBottom: "var(--space-8)"
        }}>
          CodeSage maps your entire repository into an intelligent dependency graph — so you can predict the impact of every change before a single line of code is written.
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/register" style={{
            padding: "var(--space-3) var(--space-8)", borderRadius: "var(--radius-md)",
            background: "var(--color-primary)", color: "#000", textDecoration: "none",
            fontWeight: 700, fontSize: "var(--text-base)"
          }}>Start for Free</Link>
          <Link href="#how-it-works" style={{
            padding: "var(--space-3) var(--space-8)", borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)", color: "var(--color-text-muted)",
            textDecoration: "none", fontSize: "var(--text-base)"
          }}>See How It Works</Link>
        </div>
      </section>

      <section style={{ padding: "clamp(3rem,8vw,6rem) var(--space-8)", maxWidth: "var(--content-wide)", marginInline: "auto" }}>
        <h2 style={{ textAlign: "center", fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", marginBottom: "var(--space-12)" }}>
          Everything you need to ship with confidence
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
          {[
            { icon: "⚡", title: "Feature Impact Prediction", desc: "Describe a feature in plain English. Get a precise list of every file that needs to change, with priority levels and suggested edits." },
            { icon: "🔗", title: "Dependency Chain Visualization", desc: "Interactive graph showing how every file in your codebase is connected. Click any node to see its full dependency neighborhood." },
            { icon: "🏗️", title: "Architecture Risk Detection", desc: "Automatically detect circular dependencies, god files, tight coupling, and layer violations before they become technical debt." },
            { icon: "🚀", title: "Onboarding Acceleration", desc: "Ask any question about the codebase in natural language. Get a structured explanation with execution flows and reading order." },
            { icon: "💡", title: "Improvement Recommendations", desc: "Continuous analysis surfaces security vulnerabilities, performance bottlenecks, and refactoring opportunities." },
            { icon: "🌐", title: "Any Language, Any Repo", desc: "Supports JavaScript, TypeScript, Python, Java, Go, Rust and more. Import via GitHub URL, ZIP upload, or local path." },
          ].map((f) => (
            <div key={f.title} style={{
              padding: "var(--space-6)", borderRadius: "var(--radius-lg)",
              background: "var(--color-surface)", border: "1px solid var(--color-border)"
            }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "var(--space-3)" }}>{f.icon}</div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-2)" }}>{f.title}</h3>
              <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" style={{ padding: "clamp(3rem,8vw,6rem) var(--space-8)", background: "var(--color-surface)" }}>
        <div style={{ maxWidth: "var(--content-default)", marginInline: "auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", marginBottom: "var(--space-12)" }}>How It Works</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-8)" }}>
            {[
              { step: "01", title: "Import Your Repo", desc: "Connect via GitHub URL, upload a ZIP, or mount a local path." },
              { step: "02", title: "AI Analysis", desc: "CodeSage parses your AST, builds a dependency graph, and generates semantic embeddings." },
              { step: "03", title: "Ask & Understand", desc: "Query in natural language. Visualize impacts. Ship changes with full confidence." },
            ].map((s) => (
              <div key={s.step}>
                <div style={{ fontSize: "2.5rem", fontFamily: "var(--font-display)", fontWeight: 900, color: "var(--color-primary)", marginBottom: "var(--space-3)" }}>{s.step}</div>
                <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-2)" }}>{s.title}</h3>
                <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ textAlign: "center", padding: "clamp(4rem,10vw,8rem) var(--space-8)" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", marginBottom: "var(--space-4)" }}>
          Ready to understand your codebase?
        </h2>
        <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-8)" }}>Import your first repository in under 60 seconds.</p>
        <Link href="/register" style={{
          padding: "var(--space-4) var(--space-10)", borderRadius: "var(--radius-md)",
          background: "var(--color-primary)", color: "#000", textDecoration: "none",
          fontWeight: 700, fontSize: "var(--text-base)"
        }}>Get Started Free →</Link>
      </section>
    </div>
  );
}
