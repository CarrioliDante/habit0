"use client";
import { useState } from "react";
import * as LucideIcons from "lucide-react";
import { normalizeIconValue, ICON_CATALOG } from "@/lib/iconUtils";
import type { ComponentType } from "react";

const ICON_NAMES = ICON_CATALOG;

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  darkMode?: boolean;
}

export function IconPicker({ value, onChange, darkMode = false }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const Icons = LucideIcons as unknown as Record<string, unknown>;

  const selectedBg = darkMode ? 'bg-blue-600/20 ring-2 ring-blue-400' : 'bg-blue-50 ring-2 ring-blue-400';

  const renderIcon = (name: string, size = 18) => {
    const normalized = normalizeIconValue(name);
    const Comp = Icons[normalized] as unknown as ComponentType<{ size?: number }> | undefined;
    if (Comp) return <Comp size={size} />;
    return <LucideIcons.Star size={size} />;
  };

  const filtered = query
    ? ICON_NAMES.filter((n) => n.toLowerCase().includes(query.toLowerCase()))
    : ICON_NAMES;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 border-2 rounded-lg transition-colors flex items-center justify-center ${
          darkMode
            ? 'border-gray-700 hover:border-gray-600'
            : 'border-gray-300 hover:border-blue-500'
        }`}
      >
        {renderIcon(value || "Star", 20)}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown menu */}
          <div className={`absolute top-14 left-0 z-20 rounded-lg shadow-xl p-3 w-80 ${
            darkMode
              ? 'bg-gray-800 border border-gray-700 text-gray-200'
              : 'bg-white border border-gray-200'
          }`}>
            {/* Search input */}
            <input
              type="text"
              className={`w-full mb-3 px-3 py-2 rounded border text-sm ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                  : 'bg-white border-gray-300 placeholder-gray-500'
              }`}
              placeholder="Buscar icono..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />

            {/* Icon grid */}
            <div className="grid grid-cols-6 gap-2 max-h-72 overflow-y-auto pr-1">
              {filtered.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onChange(name);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  title={name}
                  className={`w-11 h-11 rounded flex items-center justify-center transition-all ${
                    value === name
                      ? selectedBg
                      : darkMode
                        ? 'hover:bg-gray-700'
                        : 'hover:bg-gray-100'
                  }`}
                >
                  {renderIcon(name)}
                </button>
              ))}
            </div>

            {/* Results count */}
            {query && (
              <div className={`mt-2 text-xs text-center ${
                darkMode ? 'text-gray-500' : 'text-gray-400'
              }`}>
                {filtered.length} {filtered.length === 1 ? 'icono encontrado' : 'iconos encontrados'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
