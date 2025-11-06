import { X } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Group } from "@/types";

interface GroupBadgeProps {
  group: Group;
  darkMode?: boolean;
  size?: "sm" | "md";
  removable?: boolean;
  onRemove?: () => void;
}

export function GroupBadge({
  group,
  darkMode = false,
  size = "sm",
  removable = false,
  onRemove,
}: GroupBadgeProps) {
  const Icon = (LucideIcons[group.icon as keyof typeof LucideIcons] ||
    LucideIcons.Tag) as LucideIcon;

  const sizeClasses = {
    sm: "text-xs px-2 py-1 gap-1",
    md: "text-sm px-3 py-1.5 gap-1.5",
  };

  const iconSizes = {
    sm: 12,
    md: 14,
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${
        darkMode ? "text-white" : "text-white"
      }`}
      style={{
        backgroundColor: group.color || "#3b82f6",
      }}
    >
      <Icon size={iconSizes[size]} />
      <span>{group.name}</span>
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-black/20 rounded-full p-0.5 transition-colors"
          aria-label={`Quitar grupo ${group.name}`}
        >
          <X size={iconSizes[size]} />
        </button>
      )}
    </span>
  );
}
