import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata = {
  title: "Habit0",
  description: "Build gentle consistency",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es" suppressHydrationWarning>
        <body className="min-h-screen bg-background antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
