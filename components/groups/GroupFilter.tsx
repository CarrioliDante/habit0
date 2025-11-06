"use client";
import { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Group } from "@/types";

interface GroupFilterProps {
  groups: Group[];
  selectedGroupId: number | null;
  onSelectGroup: (groupId: number | null) => void;
  onDeleteGroup?: (groupId: number) => void;
  darkMode: boolean;
}

export function GroupFilter({
  groups,
  selectedGroupId,
  onSelectGroup,
  onDeleteGroup,
  darkMode,
}: GroupFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = () => setIsOpen(false);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOpen]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          selectedGroupId !== null
            ? darkMode
              ? "bg-white/15 text-white"
              : "bg-white text-slate-900 shadow-sm"
            : darkMode
            ? "text-gray-400 hover:text-white hover:bg-white/10"
            : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
        }`}
      >
        {selectedGroup ? (
          <>
            {(() => {
              const Icon = (LucideIcons[
                selectedGroup.icon as keyof typeof LucideIcons
              ] || LucideIcons.Tag) as LucideIcon;
              return <Icon size={15} />;
            })()}
            <span>{selectedGroup.name}</span>
          </>
        ) : (
          <>
            <LucideIcons.Filter size={15} />
            <span>Grupo</span>
          </>
        )}
        <LucideIcons.ChevronDown
          size={13}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full left-0 mt-2 w-56 rounded-xl border shadow-xl z-100 overflow-hidden ${
            darkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="p-1.5 max-h-80 overflow-y-auto">
            {/* Opción "Todos" */}
            <button
              onClick={() => {
                onSelectGroup(null);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedGroupId === null
                  ? darkMode
                    ? "bg-gray-700 text-white"
                    : "bg-gray-100 text-gray-900"
                  : darkMode
                  ? "text-gray-300 hover:bg-gray-700/50"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <LucideIcons.ListFilter className="w-4 h-4" />
              <span className="font-medium">Todos</span>
            </button>

            {groups.length > 0 && (
              <>
                <div
                  className={`my-1.5 border-t ${
                    darkMode ? "border-gray-700" : "border-gray-200"
                  }`}
                />

                {/* Lista de grupos */}
                {groups.map((group) => {
                  const Icon = (LucideIcons[
                    group.icon as keyof typeof LucideIcons
                  ] || LucideIcons.Tag) as LucideIcon;

                  return (
                    <div
                      key={group.id}
                      className={`flex items-center gap-1 rounded-lg transition-colors ${
                        selectedGroupId === group.id
                          ? darkMode
                            ? "bg-gray-700"
                            : "bg-gray-100"
                          : darkMode
                          ? "hover:bg-gray-700/50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <button
                        onClick={() => {
                          onSelectGroup(group.id);
                          setIsOpen(false);
                        }}
                        className={`flex-1 flex items-center gap-2 px-3 py-2 text-sm ${
                          selectedGroupId === group.id
                            ? darkMode
                              ? "text-white"
                              : "text-gray-900"
                            : darkMode
                            ? "text-gray-300"
                            : "text-gray-700"
                        }`}
                      >
                        <Icon className="w-4 h-4" style={{ color: group.color }} />
                        <span className="font-medium">{group.name}</span>
                      </button>

                      {onDeleteGroup && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`¿Eliminar el grupo "${group.name}"?`)) {
                              onDeleteGroup(group.id);
                              if (selectedGroupId === group.id) {
                                onSelectGroup(null);
                              }
                            }
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            darkMode
                              ? "text-gray-400 hover:text-red-400 hover:bg-red-900/20"
                              : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                          }`}
                          title="Eliminar grupo"
                        >
                          <LucideIcons.Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
