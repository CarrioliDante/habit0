"use client";
import { useState } from "react";

interface EditableColorPickerProps {
  color: string;
  darkMode: boolean;
  onColorChange: (color: string) => void;
}

const AVAILABLE_COLORS = [
  "#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF",
  "#E0BBE4", "#FFE5D9", "#D4F1F4", "#C9F0DD", "#FFC8DD",
  "#FF6B9D", "#FFA94D", "#FFD93D", "#6BCF7F", "#4ECDC4",
  "#A7C7E7", "#C77DFF", "#457B9D", "#E63946", "#06D6A0"
];

export function EditableColorPicker({ color, darkMode, onColorChange }: EditableColorPickerProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="flex items-center gap-2 relative">
      <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
        Color:
      </span>
      {isEditing ? (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsEditing(false)}
          />
          <div className={`absolute top-8 left-0 z-20 rounded-xl shadow-2xl p-3 w-60 ${
            darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
          }`}>
            <p className={`text-xs mb-2 font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Elegí un color
            </p>
            <div className="grid grid-cols-5 gap-2">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onColorChange(c);
                    setIsEditing(false);
                  }}
                  className={`w-10 h-10 rounded-lg transition-all hover:scale-110 shadow-sm ${
                    color === c ? "ring-2 ring-offset-2 ring-blue-500 scale-110" : "hover:shadow-md"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="w-6 h-6 rounded-lg hover:ring-2 hover:ring-white/50 transition-all"
          style={{ backgroundColor: color || "#BAE1FF" }}
          title="Clic para cambiar color"
        />
      )}
    </div>
  );
}
