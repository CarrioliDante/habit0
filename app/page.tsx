"use client";
import { useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { CheckCircle2, Calendar, TrendingUp, Zap } from "lucide-react";

export default function Home() {
  // Detectar preferencia del sistema (solo en cliente)
  const [isDark] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  return (
    <main
      className={`min-h-screen transition-colors duration-200 ${
        isDark
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900"
          : "bg-gradient-to-br from-white via-gray-50 to-white"
      }`}
    >
      {/* Header */}
      <header className="absolute top-0 right-0 p-6">
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </header>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo/Title */}
          <div className="mb-8">
            <h1
              className={`text-6xl md:text-7xl font-bold mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Habit<span className="text-blue-500">0</span>
            </h1>
            <p
              className={`text-xl md:text-2xl ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Construye consistencia sin esfuerzo
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {[
              {
                icon: CheckCircle2,
                title: "Simple",
                description: "Check-ins rápidos sin fricción",
              },
              {
                icon: Calendar,
                title: "Visual",
                description: "Heatmaps estilo GitHub",
              },
              {
                icon: TrendingUp,
                title: "Insights",
                description: "Estadísticas y rachas",
              },
              {
                icon: Zap,
                title: "Offline",
                description: "Funciona sin conexión",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className={`p-6 rounded-xl backdrop-blur-sm border ${
                  isDark
                    ? "bg-gray-800/50 border-gray-700/50"
                    : "bg-white/50 border-gray-200/50"
                }`}
              >
                <feature.icon
                  className={`w-8 h-8 mx-auto mb-3 ${
                    isDark ? "text-blue-400" : "text-blue-600"
                  }`}
                />
                <h3
                  className={`font-semibold mb-2 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {feature.title}
                </h3>
                <p
                  className={`text-sm ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <SignedOut>
              <SignInButton mode="modal">
                <button
                  className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
                    isDark
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  } shadow-lg hover:shadow-xl hover:scale-105`}
                >
                  Comenzar gratis
                </button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <Link
                href="/dashboard"
                className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
                  isDark
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                } shadow-lg hover:shadow-xl hover:scale-105`}
              >
                Ir al Dashboard
              </Link>
            </SignedIn>
          </div>

          {/* Footer tagline */}
          <p
            className={`mt-12 text-sm ${
              isDark ? "text-gray-500" : "text-gray-400"
            }`}
          >
            Offline-first • Open source • Respeta tu privacidad
          </p>
        </div>
      </div>
    </main>
  );
}
