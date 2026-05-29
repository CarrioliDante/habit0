"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "@/components/providers/theme-provider";
import { useAuth } from "@clerk/nextjs";

const NAV = [
  {
    label: null,
    items: [
      { href: "/dashboard", id: "dashboard", label: "Inicio" },
      { href: "/rutinas", id: "routines", label: "Rutinas" },
    ],
  },
  {
    label: "Herramientas",
    items: [
      { href: "/analytics", id: "analytics", label: "Analytics" },
    ],
  },
];

function NavIcon({ id, active }: { id: string; active: boolean }) {
  const c = active ? "var(--ink)" : "var(--faint)";
  const w = 1.3;
  const p = { width: 16, height: 16, viewBox: "0 0 18 18", fill: "none" as const };

  switch (id) {
    case "dashboard":
      return (
        <svg {...p}>
          <rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1" fill={active ? c : "none"} stroke={c} strokeWidth={w} />
          <rect x="10" y="2.5" width="5.5" height="5.5" rx="1" fill="none" stroke={c} strokeWidth={w} />
          <rect x="2.5" y="10" width="5.5" height="5.5" rx="1" fill="none" stroke={c} strokeWidth={w} />
          <rect x="10" y="10" width="5.5" height="5.5" rx="1" fill="none" stroke={c} strokeWidth={w} />
        </svg>
      );
    case "routines":
      return (
        <svg {...p}>
          <rect x="3" y="3" width="5" height="7" rx="1" fill={active ? c : "none"} stroke={c} strokeWidth={w} />
          <rect x="10" y="3" width="5" height="7" rx="1" fill={active ? c : "none"} stroke={c} strokeWidth={w} />
          <rect x="3" y="11.5" width="5" height="3.5" rx="1" fill="none" stroke={c} strokeWidth={w} />
          <rect x="10" y="11.5" width="5" height="3.5" rx="1" fill="none" stroke={c} strokeWidth={w} />
        </svg>
      );
    case "analytics":
      return (
        <svg {...p}>
          <rect x="3" y={15 - 8} width="3" height="8" rx="0.5" fill={active ? c : "none"} stroke={c} strokeWidth={active ? 0 : w} />
          <rect x="8" y={15 - 13} width="3" height="13" rx="0.5" fill={active ? c : "none"} stroke={c} strokeWidth={active ? 0 : w} />
          <rect x="13" y={15 - 10} width="3" height="10" rx="0.5" fill={active ? c : "none"} stroke={c} strokeWidth={active ? 0 : w} />
        </svg>
      );
    default:
      return null;
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { signOut } = useAuth();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <motion.aside
      initial={{ x: -24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
      style={{
        width: 232, flexShrink: 0,
        background: "var(--surface-alt)",
        borderRight: "1px solid var(--hairline)",
        display: "flex", flexDirection: "column",
        paddingTop: 14,
        transition: "background 400ms ease, border-color 400ms ease",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "6px 14px 12px" }}>
        <div style={{
          width: "100%", padding: "8px 10px", borderRadius: 8,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <svg width="22" height="22" viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
            <rect width="32" height="32" rx="7" fill="var(--ink)" />
            <path d="M10 12h3l2 6h-3l-2-6z" fill="var(--inverse)" />
            <circle cx="21" cy="16" r="4" fill="none" stroke="var(--inverse)" strokeWidth="1.5" />
            <path d="M21 14v2l1.5 1.5" stroke="var(--inverse)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: "-0.005em", color: "var(--ink)", whiteSpace: "nowrap", fontFamily: "'Inter Tight', sans-serif" }}>
              habit
            </span>
            <em style={{ fontSize: 12, fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.04em", color: "var(--ink)", whiteSpace: "nowrap", fontFamily: "'Newsreader', Georgia, serif" }}>
              .0
            </em>
            <div className="mono" style={{ fontSize: 9, color: "var(--faint)", letterSpacing: "0.06em", marginTop: 1, whiteSpace: "nowrap" }}>
              tracker
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
        {NAV.map((section, si) => (
          <motion.div
            key={si}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.03, delayChildren: 0.12 + si * 0.06 } },
            }}
            style={{ marginBottom: 8 }}
          >
            {section.label && (
              <div className="mono" style={{
                padding: "12px 8px 6px",
                fontSize: 9, color: "var(--faint)",
                letterSpacing: "0.16em", textTransform: "uppercase",
              }}>
                {section.label}
              </div>
            )}
            {section.items.map(item => {
              const active = isActive(item.href);
              return (
                <motion.div
                  key={item.href}
                  variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0 } }}
                  style={{ position: "relative" }}
                >
                  <Link href={item.href}
                    className="row-hover"
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "7px 8px", borderRadius: 7, marginBottom: 1,
                      background: "transparent",
                      color: active ? "var(--ink)" : "var(--mute)",
                      fontSize: 13, fontWeight: active ? 500 : 400,
                      letterSpacing: "-0.005em",
                      textDecoration: "none",
                      transition: "color 200ms ease",
                    }}>
                    <NavIcon id={item.id} active={active} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: "10px 12px 14px", borderTop: "1px solid var(--hairline)",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <button onClick={toggle} title={theme === "dark" ? "Modo día" : "Modo noche"}
          style={{
            width: 32, height: 32, borderRadius: 7, border: "none",
            background: "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--faint)",
          }}
          className="row-hover">
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
            {theme === "dark" ? (
              <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.3" />
            ) : (
              <path d="M13 9.5A5 5 0 0 1 8 4a5 5 0 1 0 5 5.5z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            )}
          </svg>
        </button>

        <button onClick={() => signOut()} title="Salir"
          style={{
            width: 32, height: 32, borderRadius: 7, border: "none",
            background: "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--faint)",
          }}
          className="row-hover">
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
            <path d="M11 9H3M6 6l-3 3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </motion.aside>
  );
}
