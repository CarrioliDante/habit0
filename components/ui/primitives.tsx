"use client";

import type { ReactNode } from "react";

// ─── Hairline — 1px horizontal rule ───────────────────────────
export function Hairline({ inset = 0 }: { inset?: number }) {
  return (
    <div style={{
      height: 1, background: "var(--hairline)",
      marginLeft: inset, marginRight: inset,
    }} />
  );
}

// ─── Eyebrow — tiny mono uppercase label ──────────────────────
export function Eyebrow({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mono" style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      fontSize: 10, color: "var(--mute)",
      letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 400,
    }}>
      <span>{children}</span>
      {right && <span style={{ color: "var(--faint)", letterSpacing: "0.08em" }}>{right}</span>}
    </div>
  );
}

// ─── Stat — big number + mono label ───────────────────────────
export function Stat({
  value,
  label,
  size = 22,
  suffix,
}: {
  value: number | string;
  label?: string;
  size?: number;
  suffix?: string;
}) {
  return (
    <div>
      <div className="display tnum" style={{
        fontSize: size, fontWeight: 500,
        letterSpacing: size > 30 ? "-0.04em" : "-0.025em",
        color: "var(--ink)", lineHeight: 1,
        display: "flex", alignItems: "baseline", gap: size * 0.1,
      }}>
        {typeof value === "number" ? value.toLocaleString("es-AR") : value}
        {suffix && (
          <span style={{ color: "var(--faint)", fontSize: size * 0.45, fontWeight: 400 }}>{suffix}</span>
        )}
      </div>
      {label && (
        <div className="mono" style={{
          fontSize: 9, color: "var(--mute)", letterSpacing: "0.16em",
          textTransform: "uppercase", marginTop: 8, fontWeight: 400,
        }}>
          {label}
        </div>
      )}
    </div>
  );
}

// ─── RadialRing — SVG radial progress ring ────────────────────
export function RadialRing({
  value = 0.6,
  size = 84,
  stroke = 1.5,
  label,
  sub,
}: {
  value?: number;
  size?: number;
  stroke?: number;
  label?: string;
  sub?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--hairline2)" strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke="var(--ink)" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.2,.7,.1,1)" }}
        />
      </svg>
      {(label || sub) && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", gap: 2,
        }}>
          {label && (
            <div className="display tnum" style={{
              fontSize: size * 0.24, fontWeight: 500, letterSpacing: "-0.03em",
              color: "var(--ink)", lineHeight: 1,
            }}>{label}</div>
          )}
          {sub && (
            <div className="mono" style={{
              fontSize: 9, color: "var(--mute)", letterSpacing: "0.1em", textTransform: "uppercase",
            }}>{sub}</div>
          )}
        </div>
      )}
    </div>
  );
}
