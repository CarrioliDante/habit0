"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "@/components/providers/theme-provider";

const NAV = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/rutinas", label: "Rutinas" },
];

export function TopNav() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { signOut } = useAuth();

  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 20px",
      borderBottom: "1px solid var(--hairline)",
      background: "var(--bg)",
      transition: "background 400ms ease, border-color 400ms ease",
      position: "sticky", top: 0, zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <svg width="22" height="22" viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
            <rect width="32" height="32" rx="7" fill="var(--ink)" />
            <circle cx="14" cy="12" r="2" fill="var(--inverse)" />
            <path d="M14 15v6" stroke="var(--inverse)" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M24 13a5 5 0 1 1-3.5-4.8" stroke="var(--inverse)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", fontFamily: "'Inter Tight', sans-serif", letterSpacing: "-0.01em" }}>
            habit<span style={{ fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", letterSpacing: "-0.04em" }}>.ar</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", gap: 4 }}>
          {NAV.map(item => {
            const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className="row-hover" style={{
                padding: "5px 10px", borderRadius: 6,
                color: active ? "var(--ink)" : "var(--mute)",
                fontSize: 13, fontWeight: active ? 500 : 400,
                textDecoration: "none", transition: "color 150ms ease",
              }}>{item.label}</Link>
            );
          })}
        </div>
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button onClick={toggle} title={theme === "dark" ? "Modo día" : "Modo noche"}
          className="row-hover" style={{
            width: 32, height: 32, borderRadius: 6, border: "none",
            background: "transparent", cursor: "pointer", color: "var(--faint)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
            {theme === "dark" ? (
              <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.3" />
            ) : (
              <path d="M13 9.5A5 5 0 0 1 8 4a5 5 0 1 0 5 5.5z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            )}
          </svg>
        </button>
        <button onClick={() => signOut()} title="Salir"
          className="row-hover" style={{
            width: 32, height: 32, borderRadius: 6, border: "none",
            background: "transparent", cursor: "pointer", color: "var(--faint)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
            <path d="M11 9H3M6 6l-3 3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
