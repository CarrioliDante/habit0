export function Footer() {
  return (
    <footer style={{
      padding: "16px 40px",
      borderTop: "1px solid var(--hairline)",
      textAlign: "center",
      userSelect: "none",
    }}>
      <p style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        textTransform: "uppercase",
        letterSpacing: "0.22em",
        color: "var(--faint)",
      }}>
        Hecho en Argentina
      </p>
    </footer>
  );
}
