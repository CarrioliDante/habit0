"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { IconPicker } from "@/components/ui/IconPicker";
import { ColorPicker } from "@/components/ui/ColorPicker";
import type { Group, CreateGroupRequest } from "@/types";
import { HABIT_COLORS } from "@/lib/colors";
import { addToGroupsSyncQueue } from "@/lib/groupsSyncQueue";
import { addGroupToCache, updateGroupInCache } from "@/lib/groupsCache";

interface GroupManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  darkMode: boolean;
  group?: Group; // Si se pasa, es edición; si no, es creación
}

export function GroupManager({
  isOpen,
  onClose,
  onSuccess,
  darkMode,
  group,
}: GroupManagerProps) {
  const [name, setName] = useState(group?.name || "");
  const [color, setColor] = useState(group?.color || HABIT_COLORS[0]);
  const [icon, setIcon] = useState(group?.icon || "Tag");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("El nombre del grupo es obligatorio");
      return;
    }

    setLoading(true);

    try {
      const body: CreateGroupRequest = {
        name: name.trim(),
        color,
        icon,
      };

      if (group) {
        // Editar grupo existente
        // 1) Actualizar optimistamente en caché
        updateGroupInCache(group.id, body);

        // 2) Agregar a cola de sincronización
        addToGroupsSyncQueue({
          type: "update",
          groupId: group.id,
          data: body,
        });

        // 3) Intentar sincronizar inmediatamente en background
        fetch(`/api/groups/${group.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).catch(err => {
          console.error("Background sync failed, will retry later:", err);
        });

        // 4) Notificar éxito inmediatamente
        onSuccess();
        handleClose();
      } else {
        // Crear nuevo grupo
        const tempId = `temp-${Date.now()}`;
        const tempGroup: Group = {
          id: -Date.now(), // ID temporal negativo
          userId: -1, // Se llenará en el servidor
          name: body.name,
          color: body.color || HABIT_COLORS[0],
          icon: body.icon || "Tag",
          createdAt: new Date().toISOString(),
        };

        // 1) Agregar optimistamente al caché
        addGroupToCache(tempGroup);

        // 2) Agregar a cola de sincronización
        addToGroupsSyncQueue({
          type: "create",
          data: { ...body, tempId },
        });

        // 3) Cerrar modal y notificar éxito inmediatamente (sin recargar)
        onSuccess();
        handleClose();

        // 4) Intentar crear en background (sin esperar)
        fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).catch(err => {
          console.error("Background sync failed, will retry later:", err);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar grupo");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName(group?.name || "");
    setColor(group?.color || HABIT_COLORS[0]);
    setIcon(group?.icon || "Tag");
    setError("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={group ? "Editar Grupo" : "Nuevo Grupo"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre */}
        <div>
          <label
            htmlFor="group-name"
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Nombre del grupo
          </label>
          <input
            id="group-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Salud, Trabajo, Fitness..."
            className={`w-full px-3 py-2 border rounded-lg ${
              darkMode
                ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
            }`}
            autoFocus
          />
        </div>

        {/* Color */}
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Color
          </label>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        {/* Icono */}
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Icono
          </label>
          <IconPicker value={icon} onChange={setIcon} darkMode={darkMode} />
        </div>

        {/* Error */}
        {error && (
          <div
            className={`p-3 rounded-lg text-sm ${
              darkMode
                ? "bg-red-900/20 border border-red-800 text-red-300"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {error}
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            onClick={handleClose}
            variant="secondary"
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "Guardando..." : group ? "Guardar" : "Crear Grupo"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
