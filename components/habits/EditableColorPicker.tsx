"use client";
import { useState } from "react";
import { HABIT_COLORS, DEFAULT_HABIT_COLOR } from "@/lib/colors";

interface EditableColorPickerProps {
  color: string;
  darkMode: boolean;
  onColorChange: (color: string) => void;
}

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
              {HABIT_COLORS.map((c) => (
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
          style={{ backgroundColor: color || DEFAULT_HABIT_COLOR }}
          title="Clic para cambiar color"
        />
      )}
    </div>
  );
}
