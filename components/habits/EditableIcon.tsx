"use client";
import { useState } from "react";

interface EditableIconProps {
  icon: string;
  color: string;
  darkMode: boolean;
  onIconChange: (icon: string) => void;
}

const AVAILABLE_ICONS = [
  "⭐", "🎯", "💪", "🏃", "📚", "✍️", "🧘", "💧", "🥗", "🛌",
  "🎵", "🎨", "💻", "📱", "🌱", "☕", "🍎", "🚴", "🏊", "⚡",
  "🔥", "✨", "🌟", "💎", "🎁", "🏆", "🥇", "🎓", "💡", "🧠"
];

export function EditableIcon({ icon, color, darkMode, onIconChange }: EditableIconProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="relative">
      {isEditing ? (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsEditing(false)}
          />
          <div className={`absolute top-0 left-0 z-20 rounded-lg shadow-lg p-2 w-64 ${
            darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
          }`}>
            <div className="grid grid-cols-6 gap-1">
              {AVAILABLE_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onIconChange(emoji);
                    setIsEditing(false);
                  }}
                  className={`w-10 h-10 text-2xl rounded hover:bg-blue-100 transition-colors ${
                    icon === emoji ? "bg-blue-100 ring-2 ring-blue-500" : ""
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl hover:ring-2 hover:ring-white/50 transition-all"
          style={{ backgroundColor: color || "#BAE1FF" }}
          title="Clic para cambiar icono"
        >
          {icon || "⭐"}
        </button>
      )}
    </div>
  );
}
