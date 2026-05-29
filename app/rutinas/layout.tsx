import { TopNav } from "@/components/ui/top-nav";

export default function RutinasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", transition: "background 400ms ease" }}>
      <TopNav />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px 80px" }}>
        {children}
      </main>
      <footer style={{ padding: "16px 20px", borderTop: "1px solid var(--hairline)", textAlign: "center", userSelect: "none" }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.22em", color: "var(--faint)", margin: 0 }}>Hecho en Argentina</p>
      </footer>
    </div>
  );
}
