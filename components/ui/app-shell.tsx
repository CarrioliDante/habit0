"use client";

import { Sidebar } from "@/components/ui/sidebar";
import { Footer } from "@/components/ui/footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main style={{
        flex: 1, overflow: "auto",
        display: "flex", flexDirection: "column",
        background: "var(--bg)",
        transition: "background 400ms ease",
      }}>
        <div style={{ flex: 1, padding: "32px 40px", maxWidth: 960 }}>
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}
