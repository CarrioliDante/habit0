"use client";
import { useState } from "react";
import { HABIT_COLORS } from "@/lib/colors";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

/**
 * Selector de color para hábitos con paleta moderna
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Botón que muestra el color actual */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:scale-105 shadow-sm"
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
          <div className="absolute top-16 left-0 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-3 w-60">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
              Elegí un color
            </p>
            <div className="grid grid-cols-5 gap-2">
              {HABIT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    onChange(color);
                    setIsOpen(false);
                  }}
                  className={`
                    w-10 h-10 rounded-lg transition-all hover:scale-110 shadow-sm
                    ${value === color ? "ring-2 ring-offset-2 dark:ring-offset-gray-800 ring-blue-500 scale-110" : "hover:shadow-md"}
                  `}
                  style={{ backgroundColor: color }}
                  title={color}
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
