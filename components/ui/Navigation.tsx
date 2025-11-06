"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Moon, Sun, LayoutDashboard, ListChecks } from "lucide-react";

interface NavigationProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Navigation({ darkMode, onToggleDarkMode }: NavigationProps) {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Rutinas",
      path: "/rutinas",
      icon: ListChecks,
    },
  ];

  return (
    <div className="mb-6 sm:mb-8">
      {/* Header unificado - responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
        {/* Logo - centrado en móvil, izquierda en desktop */}
        <div className="flex items-center gap-3">
          <h1
            className={`text-xl sm:text-2xl font-bold ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Habit<span className="text-green-500">0</span>
          </h1>
        </div>

        {/* Tabs - stack en móvil, inline en desktop */}
        <div className="flex gap-1 w-full sm:w-auto justify-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.path;

            return (
              <Link
                key={tab.path}
                href={tab.path}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-lg transition-all font-medium text-sm sm:text-base flex-1 sm:flex-initial justify-center ${
                  isActive
                    ? "bg-green-500 text-white"
                    : darkMode
                    ? "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden xs:inline">{tab.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Controles a la derecha - centrados en móvil */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? "text-gray-300 hover:bg-gray-800/50"
                : "text-gray-700 hover:bg-gray-100"
            }`}
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* User Button from Clerk */}
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </div>
  );
}
