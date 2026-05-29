"use client";
import { useState } from "react";
import type { Group } from "@/types";
import { ICON_LIST } from "@/lib/icons";
import { HabitIcon } from "@/components/ui/habit-icon";
import { addToGroupsSyncQueue } from "@/lib/groupsSyncQueue";
import { addGroupToCache, updateGroupInCache } from "@/lib/groupsCache";
import { COLORS } from "@/lib/colors";

interface GroupManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  group?: Group;
}

export function GroupManager({ isOpen, onClose, onSuccess, group }: GroupManagerProps) {
  const [name, setName] = useState(group?.name || "");
  const [color, setColor] = useState(group?.color || COLORS[0]);
  const [icon, setIcon] = useState(group?.icon || "tag");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    setLoading(true);
    try {
      const body = { name: name.trim(), color, icon };
      const method = group ? "PATCH" : "POST";
      const url = group ? `/api/groups/${group.id}` : "/api/groups";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Error al guardar");
      const data = await res.json();
      const saved = data?.data || data;
      if (group) { updateGroupInCache(saved.id, saved); } else { addGroupToCache(saved); }
      addToGroupsSyncQueue(
        group
          ? { type: "update", groupId: saved.id, data: saved }
          : { type: "create", data: { ...saved, tempId: crypto.randomUUID() } }
      );
      onSuccess();
      onClose();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!group) return;
    setLoading(true);
    try {
      await fetch(`/api/groups/${group.id}`, { method: "DELETE" });
      addToGroupsSyncQueue({ type: "delete", groupId: group.id });
      onSuccess();
      onClose();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.2)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 12, border: "1px solid var(--hairline)", padding: 24, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
        <h2 className="display" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", margin: "0 0 20px" }}>{group ? "Editar grupo" : "Nuevo grupo"}</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {error && <p style={{ fontSize: 12, color: "var(--mute)", margin: 0 }}>{error}</p>}
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del grupo"
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--hairline)", background: "var(--bg)", fontSize: 14, color: "var(--ink)", outline: "none", fontFamily: "inherit" }} />
          {/* Color */}
          <div>
            <div className="mono" style={{ fontSize: 9, color: "var(--faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Color</div>
            <div style={{ display: "flex", gap: 6 }}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: color === c ? "2px solid var(--ink)" : "2px solid transparent", cursor: "pointer", transition: "all 120ms ease", outline: "none" }} />
              ))}
            </div>
          </div>
          {/* Icon */}
          <div>
            <div className="mono" style={{ fontSize: 9, color: "var(--faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Ícono</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {ICON_LIST.map(name => (
                <button key={name} type="button" onClick={() => setIcon(name)} style={{ width: 32, height: 32, borderRadius: 6, border: icon === name ? "1.5px solid var(--ink)" : "1px solid var(--hairline)", background: icon === name ? "var(--whisper)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <HabitIcon name={name} size={14} color={icon === name ? "var(--ink)" : "var(--faint)"} />
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            {group && (
              <button type="button" onClick={handleDelete} disabled={loading}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hairline)", background: "transparent", color: "var(--mute)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.5 : 1 }}>Eliminar</button>
            )}
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button type="button" onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hairline)", background: "transparent", color: "var(--mute)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button type="submit" disabled={loading || !name.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--ink)", color: "var(--inverse)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.5 : 1 }}>{loading ? "Guardando..." : group ? "Guardar" : "Crear"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
