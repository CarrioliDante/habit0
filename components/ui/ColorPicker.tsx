"use client";
import { useState } from "react";

// Paleta de colores para hábitos
const COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

/**
 * Selector de color para hábitos
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Botón que muestra el color actual */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 border-2 border-gray-300 rounded-lg hover:border-blue-500 transition-colors flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: value }}
      >
        <span className="sr-only">Seleccionar color</span>
      </button>

      {/* Dropdown con paleta de colores */}
      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer clic afuera */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Paleta de colores */}
          <div className="absolute top-14 left-0 z-20 bg-white border rounded-lg shadow-lg p-2 w-48">
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    onChange(color);
                    setIsOpen(false);
                  }}
                  className={`
                    w-10 h-10 rounded-lg transition-transform hover:scale-110
                    ${value === color ? "ring-2 ring-offset-2 ring-blue-500" : ""}
                  `}
                  style={{ backgroundColor: color }}
                >
                  <span className="sr-only">{color}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
