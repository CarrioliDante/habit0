"use client";
import { useState, useEffect } from "react";
import type { Cadence, Habit, Group } from "@/types";
import { Button } from "@/components/ui/Button";
import { IconPicker } from "@/components/ui/IconPicker";
import * as LucideIcons from "lucide-react";
import { normalizeIconValue } from "@/lib/iconUtils";
import type { ComponentType } from "react";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { DEFAULT_HABIT_COLOR } from "@/lib/colors";

interface HabitFormProps {
  habit?: Habit;
  onSubmit: (data: {
    title: string;
    description?: string;
    cadence: Cadence;
    targetPerDay: number;
    icon?: string;
    color?: string;
    allowMultiplePerDay?: boolean;
    groupIds?: number[];
  }) => Promise<void> | void;
  onCancel?: () => void;
  loading: boolean;
  darkMode: boolean;
  isModal?: boolean;
  groups?: Group[]; // Grupos pre-cargados desde el padre
}

/**
 * Formulario reutilizable para crear/editar hábitos
 */
export function HabitForm({
  habit,
  onSubmit,
  onCancel,
  loading,
  darkMode,
  isModal = false,
  groups: propGroups,
}: HabitFormProps) {
  const [title, setTitle] = useState(habit?.title || "");
  const [description, setDescription] = useState(habit?.description || "");
  const [cadence, setCadence] = useState<Cadence>(habit?.cadence || "daily");
  const [icon, setIcon] = useState(habit?.icon || "Star");
  const [color, setColor] = useState(habit?.color || DEFAULT_HABIT_COLOR);
  const [allowMultiplePerDay, setAllowMultiplePerDay] = useState(habit?.allowMultiplePerDay || false);
  const [targetPerDay, setTargetPerDay] = useState(habit?.targetPerDay || 1);

  // Estado para grupos
  const [groups, setGroups] = useState<Group[]>(propGroups || []);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(!propGroups);

  // Cargar grupos disponibles solo si no se pasaron como prop
  useEffect(() => {
    if (propGroups) {
      setGroups(propGroups);
      setLoadingGroups(false);
      return;
    }

    const loadGroups = async () => {
      try {
        setLoadingGroups(true);
        const response = await fetch("/api/groups");
        if (response.ok) {
          const json = await response.json();
          if (json.success && json.data) {
            setGroups(json.data);
          }
        }
      } catch (error) {
        console.error("Error loading groups:", error);
      } finally {
        setLoadingGroups(false);
      }
    };
    loadGroups();
  }, [propGroups]);

  // Cargar grupos del hábito si estamos editando
  useEffect(() => {
    if (habit?.id) {
      const loadHabitGroups = async () => {
        try {
          const response = await fetch(`/api/habits/${habit.id}/groups`);
          if (response.ok) {
            const json = await response.json();
            if (json.success && json.data) {
              const groupIds = (json.data as Group[]).map(g => g.id);
              setSelectedGroupIds(groupIds);
            }
          }
        } catch (error) {
          console.error("Error loading habit groups:", error);
        }
      };
      loadHabitGroups();
    }
  }, [habit?.id]);

  const toggleGroup = (groupId: number) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      cadence,
      targetPerDay,
      icon,
      color,
      allowMultiplePerDay,
      groupIds: selectedGroupIds,
    });

    // Limpiar form solo si no es modal (es creación)
    if (!isModal) {
      setTitle("");
      setDescription("");
      setCadence("daily");
      setIcon("Star");
      setColor(DEFAULT_HABIT_COLOR);
      setAllowMultiplePerDay(false);
      setTargetPerDay(1);
      setSelectedGroupIds([]);
    }
  };

  const content = (
    <div className="space-y-4">
      {/* Selector de icono y color */}
      <div className="flex gap-4 items-center">
          <div>
          <label
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Icono
          </label>
          <IconPicker value={icon} onChange={setIcon} darkMode={darkMode} />
        </div>

        <div>
          <label
            className={`block text-sm  font-medium mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Color
          </label>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        {/* Preview (icon only) */}
        <div className="flex-1 ml-4">
          <label
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Vista previa
          </label>
          <div className="flex items-center">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
              style={{ backgroundColor: color }}
            >
              {
                (() => {
                  const Icons = LucideIcons as unknown as Record<string, unknown>;
                  const normalized = normalizeIconValue(icon || "");
                  const Comp = Icons[normalized || "Star"] as unknown as ComponentType<{ size?: number; className?: string }> | undefined;
                  if (Comp) return <Comp size={20} className="text-white" />;
                  return <span className="text-white text-xl">{icon}</span>;
                })()
              }
            </div>
          </div>
        </div>
      </div>

      {/* Título */}
      <div>
        <label
          className={`block text-sm font-medium mb-2 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          Título *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Beber agua, Hacer ejercicio..."
          className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            darkMode
              ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400"
              : "bg-white border-gray-300 text-gray-900"
          }`}
          disabled={loading}
        />
      </div>

      {/* Descripción */}
      <div>
        <label
          className={`block text-sm font-medium mb-2 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          Descripción (opcional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Agrega detalles sobre este hábito..."
          rows={2}
          className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            darkMode
              ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400"
              : "bg-white border-gray-300 text-gray-900"
          }`}
          disabled={loading}
        />
      </div>

      {/* Cadencia */}
      <div>
        <label
          className={`block text-sm font-medium mb-2 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          Cadencia
        </label>
        <select
          value={cadence}
          onChange={(e) => {
            const newCadence = e.target.value as Cadence;
            setCadence(newCadence);
            // Si cambia a semanal o mensual, deshabilitar múltiples check-ins
            if (newCadence === 'weekly' || newCadence === 'custom') {
              setAllowMultiplePerDay(false);
            }
          }}
          className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            darkMode
              ? "bg-gray-700 border-gray-600 text-gray-100"
              : "bg-white border-gray-300 text-gray-900"
          }`}
          disabled={loading}
        >
          <option value="daily">Diario</option>
          <option value="weekly">Semanal</option>
          <option value="custom">Personalizado</option>
        </select>
      </div>

      {/* Checkbox: múltiples check-ins por día - SOLO para hábitos diarios */}
      {cadence === 'daily' && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allowMultiple"
            checked={allowMultiplePerDay}
            onChange={(e) => setAllowMultiplePerDay(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            disabled={loading}
          />
          <label
            htmlFor="allowMultiple"
            className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          >
            Permitir múltiples check-ins por día
          </label>
        </div>
      )}

      {/* Meta diaria (solo si allowMultiplePerDay está activo) */}
      {allowMultiplePerDay && (
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Meta diaria
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              max="99"
              value={targetPerDay}
              onChange={(e) => setTargetPerDay(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
              className={`w-20 border rounded-lg px-4 py-2 text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-gray-100"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
              disabled={loading}
            />
            <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              veces por día (al llegar a esta meta, se reinicia a 0)
            </span>
          </div>
        </div>
      )}

      {/* Selector de grupos */}
      {groups.length > 0 && (
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Grupos (opcional)
          </label>
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => {
              const isSelected = selectedGroupIds.includes(group.id);
              const Icons = LucideIcons as unknown as Record<string, unknown>;
              const IconComponent = Icons[normalizeIconValue(group.icon || "Tag")] as ComponentType<{ size?: number; className?: string }> | undefined;
              const Icon = IconComponent || LucideIcons.Tag;

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? darkMode
                        ? "bg-white/20 text-white ring-2 ring-white/30"
                        : "bg-gray-900/10 text-gray-900 ring-2 ring-gray-900/20"
                      : darkMode
                      ? "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  style={isSelected ? { backgroundColor: `${group.color}30`, borderColor: group.color } : undefined}
                >
                  <Icon size={14} style={{ color: group.color }} />
                  <span>{group.name}</span>
                </button>
              );
            })}
          </div>
          {selectedGroupIds.length > 0 && (
            <p className={`mt-2 text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              {selectedGroupIds.length} {selectedGroupIds.length === 1 ? "grupo seleccionado" : "grupos seleccionados"}
            </p>
          )}
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={loading || !title.trim()}
          variant="primary"
          className="flex-1"
        >
          {loading ? "Guardando..." : (habit ? "Actualizar" : "Crear hábito")}
        </Button>
        {isModal && onCancel && (
          <Button onClick={onCancel} disabled={loading} variant="secondary">
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div
          className={`rounded-xl p-6 max-w-md w-full ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          <h3
            className={`text-xl font-semibold mb-4 ${
              darkMode ? "text-gray-100" : "text-gray-900"
            }`}
          >
            {habit ? "Editar hábito" : "Crear hábito"}
          </h3>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-6 ${
        darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"
      }`}
    >
      <h2
        className={`text-xl font-semibold mb-4 ${
          darkMode ? "text-gray-100" : "text-gray-900"
        }`}
      >
        Crear nuevo hábito
      </h2>
      {content}
    </div>
  );
}
