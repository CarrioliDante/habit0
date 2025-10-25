"use client";
import { useState } from "react";

// Lista de emojis comunes para hábitos
const HABIT_EMOJIS = [
  "⭐", "🎯", "💪", "🏃", "📚", "✍️", "🧘", "💧", "🥗", "🛌",
  "🎵", "🎨", "💻", "📱", "🌱", "☕", "🍎", "🚴", "🏊", "⚡",
  "🔥", "✨", "🌟", "💎", "🎁", "🏆", "🥇", "🎓", "💡", "🧠"
];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

/**
 * Selector de emoji/icono para hábitos
 */
export function IconPicker({ value, onChange }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Botón que muestra el emoji actual */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 text-2xl border-2 border-gray-300 rounded-lg hover:border-blue-500 transition-colors flex items-center justify-center"
      >
        {value || "⭐"}
      </button>

      {/* Dropdown con grid de emojis */}
      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer clic afuera */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Grid de emojis */}
          <div className="absolute top-14 left-0 z-20 bg-white border rounded-lg shadow-lg p-2 w-64">
            <div className="grid grid-cols-6 gap-1">
              {HABIT_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onChange(emoji);
                    setIsOpen(false);
                  }}
                  className={`
                    w-10 h-10 text-2xl rounded hover:bg-blue-100 transition-colors
                    ${value === emoji ? "bg-blue-100 ring-2 ring-blue-500" : ""}
                  `}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
