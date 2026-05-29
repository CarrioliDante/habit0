"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";

export default function Home() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn) router.push("/dashboard");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>Cargando...</div>
      </div>
    );
  }

  if (isSignedIn) return null;

  return (
    <main style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: "40px 20px",
      transition: "background 400ms ease",
    }}>
      <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
        {/* Logo */}
        <div style={{ marginBottom: 48 }}>
          <svg width="48" height="48" viewBox="0 0 48 48" style={{ margin: "0 auto 20px", display: "block" }}>
            <rect width="48" height="48" rx="11" fill="var(--ink)" />
            <circle cx="22" cy="18" r="2.5" fill="var(--inverse)" />
            <path d="M22 21.5v9" stroke="var(--inverse)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M35 20a8 8 0 1 1-5.5-7.6" stroke="var(--inverse)" strokeWidth="2" fill="none" strokeLinecap="round" />
            <circle cx="35" cy="18" r="1.5" fill="var(--inverse)" />
          </svg>
          <h1 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 28, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.03em", margin: 0 }}>
            habit<span style={{ fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", letterSpacing: "-0.04em" }}>.0</span>
          </h1>
        </div>

        {/* Tagline */}
        <div className="display" style={{ fontSize: 36, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.035em", lineHeight: 1.15, marginBottom: 16 }}>
          Tus hábitos,<br />sin ruido.
        </div>
        <p style={{ fontSize: 15, color: "var(--mute)", marginBottom: 48, lineHeight: 1.6, maxWidth: 380, margin: "0 auto 48px" }}>
          Check-ins rápidos, rutinas diarias y métricas limpias. Sin colores, sin distracciones.
        </p>

        {/* Features — minimal list */}
        <div style={{ marginBottom: 48, display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { icon: "check", label: "Check-ins rápidos sin fricción" },
            { icon: "grid", label: "Heatmap de actividad estilo GitHub" },
            { icon: "chart", label: "Estadísticas y rachas en tiempo real" },
            { icon: "wifi", label: "Funciona offline, sincroniza después" },
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <span style={{ color: "var(--faint)", fontSize: 14 }}>
                {f.icon === "check" && "✓"}
                {f.icon === "grid" && "⊞"}
                {f.icon === "chart" && "▤"}
                {f.icon === "wifi" && "⬡"}
              </span>
              <span style={{ fontSize: 14, color: "var(--mute)" }}>{f.label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginBottom: 48 }}>
          <SignedOut>
            <SignInButton mode="modal">
              <button style={{
                padding: "12px 32px", borderRadius: 10,
                background: "var(--ink)", color: "var(--inverse)",
                border: "none", cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 15, fontWeight: 500,
                letterSpacing: "-0.01em",
                transition: "transform 150ms ease, opacity 150ms ease",
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                Comenzar gratis
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <a href="/dashboard" style={{
              padding: "12px 32px", borderRadius: 10,
              background: "var(--ink)", color: "var(--inverse)",
              border: "none", cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 15, fontWeight: 500, textDecoration: "none",
              letterSpacing: "-0.01em",
              display: "inline-block",
            }}>
              Ir al Dashboard
            </a>
          </SignedIn>
        </div>

        {/* Footer */}
        <p className="mono" style={{
          fontSize: 9, color: "var(--faint)",
          letterSpacing: "0.22em", textTransform: "uppercase",
        }}>
          Hecho en Argentina
        </p>
      </div>
    </main>
  );
}
