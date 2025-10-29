"use client";
// note: no local state here; IconPicker handles open/close
import { IconPicker } from "@/components/ui/IconPicker";

interface EditableIconProps {
  icon: string;
  color: string;
  darkMode: boolean;
  onIconChange: (icon: string) => void;
}

export function EditableIcon({ icon, /* color, */ darkMode, onIconChange }: EditableIconProps) {
  // Reuse IconPicker for consistent UI and behavior
  return <IconPicker value={icon} onChange={onIconChange} darkMode={darkMode} />;
}
