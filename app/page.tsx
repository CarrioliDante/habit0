"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { CheckCircle2, Calendar, TrendingUp, Zap, Moon, Sun } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  // Redirigir a dashboard si está logueado
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  // Estado para el tema con toggle manual
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) {
        return saved === "dark";
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  // Guardar preferencia del tema
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    }
  }, [isDark]);

  // Mostrar loading mientras verifica autenticación
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  // No mostrar nada si está logueado (ya redirigió)
  if (isSignedIn) {
    return null;
  }

  return (
    <main
      className={`min-h-screen flex flex-col items-center justify-center transition-colors ${
        isDark
          ? "bg-linear-to-br from-gray-900 via-slate-900 to-gray-900"
          : "bg-linear-to-br from-white via-gray-50 to-white"
      }`}
    >
      {/* Header */}
      <header className="absolute top-0 right-0 p-6 flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className={`p-2 rounded-lg transition-colors ${
            isDark
              ? "bg-gray-800 hover:bg-gray-700 text-yellow-400"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

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
              Habit<span className="text-green-500">0</span>
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
                    isDark ? "text-green-400" : "text-green-500"
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
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-green-500 hover:bg-green-600 text-white"
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
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-green-500 hover:bg-green-600 text-white"
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
