# habit.ar — Roadmap de Cambios

> Inspirado en la filosofía de diseño de Gastar. Monocromático, editorial, sin color.

---

## Fase 1 — Setup del proyecto ✅

- [x] README.md real (no boilerplate de Next.js)
- [x] CLAUDE.md con arquitectura, comandos, convenciones
- [x] AGENTS.md con reglas para agentes
- [x] .env.example documentado

---

## Fase 2 — Migración estética (gastar-style) ✅

### 2.1 Design tokens
- [x] Reemplazar globals.css con tokens de gastar (--bg, --surface, --ink, --mute, --faint, --whisper, --hairline)
- [x] Light mode por defecto (--bg: #F5F5F2, como gastar)
- [x] Dark mode vía [data-theme="dark"]
- [x] Tipografía: Inter (body), Inter Tight (display), JetBrains Mono (mono)
- [x] Scrollbar minimalista con --hairline2
- [x] Transiciones suaves (400ms background/color)

### 2.2 Layout
- [x] Sidebar monocromática estilo gastar (232px, surface-alt, border hairline)
- [x] SVG icons custom en sidebar (no lucide-react, no color)
- [x] Navegación: Inicio · Hábitos · Rutinas · Analytics · Ajustes
- [x] Animaciones de entrada con framer-motion (stagger children)
- [x] Footer sidebar: toggle dark mode + logout
- [x] Buscador/command palette (⌘K)

### 2.3 Componentes UI primitivos
- [x] Stat — número grande + label mono
- [x] Hairline — divisor 1px
- [x] Eyebrow — label mono uppercase
- [x] H2 — section header con right opcional
- [x] BarChart / LineChart — SVG charts inline
- [x] RadialRing — progreso circular SVG

### 2.4 Dashboard (refactor 1313 líneas)
- [x] Extraer en sub-componentes por sección
- [x] Hero con streak principal + radial ring
- [x] Sección Hábitos de hoy (checklist con swipe-to-complete)
- [x] Sección Rutinas del día (progreso visual)
- [x] Heatmap semanal/mensual
- [x] Métricas rápidas (adherencia, total checkins, mejor racha)
- [x] Sin colores — monocromático con tonos de --ink

### 2.5 Hábitos
- [x] HabitCard monocromática (sin colores de categoría)
- [x] Iconos SVG custom (o Tabler icons como gastar)
- [x] Check-in con animación sutil (no emoji, no color flash)
- [x] Formulario de creación limpio, editorial

### 2.6 Rutinas
- [x] RoutineCard con progreso visual (barra fina o radial)
- [x] Checklist diario con animación de completado
- [x] Días de semana como chips mono (no colores)

### 2.7 Grupos/Tags
- [x] GroupBadge monocromático (borde, no fondo de color)
- [x] GroupFilter como chips o select editorial

### 2.8 Landing page
- [x] Rediseño completo estilo gastar landing
- [x] Hero limpio: "Tus hábitos, sin ruido"
- [x] Sin gradientes, sin color, sin emoji
- [x] Footer "Hecho en Argentina"

### 2.9 Analytics
- [x] Gráficos SVG (no dependencias externas)
- [x] LineChart para tendencia de adherencia
- [x] BarChart para checkins por día/mes
- [x] Comparación de períodos con Stat components

---

## Fase 3 — Funcionalidad pendiente

- [ ] Reminders: implementar notificaciones (schema ya tiene campos)
- [ ] Joker policy: implementar días libres sin romper streak
- [ ] Settings page: preferencias de usuario
- [ ] Archive management: ver/restaurar hábitos archivados
- [ ] Export avanzado (PDF además de CSV)

---

## Fase 4 — Mobile (futuro)

- [ ] PWA con manifest.json
- [ ] Service worker para offline-first
- [ ] Notificaciones push nativas

---

## ✅ Reparación post-migración — 29 mayo 2026

> Build roto, funcionalidades perdidas, código duplicado tras migrar UI de Gastar.
> Commit: `369b8cb` en main. 31 files, -962/+283 net.

### Build fixes
- [x] GroupManager: corregir `updateGroupInCache` y `addToGroupsSyncQueue` signatures
- [x] primitives.tsx: `--hairline2` → `--hairline`
- [x] Toast.tsx: reemplazar lucide-react por SVGs inline
- [x] HabitDetailModal: props `darkMode`/`onHabitChange` → `onChange`/`onClose`
- [x] HabitForm: `cadence` type widened
- [x] HabitList: props huérfanas eliminadas
- [x] HabitSettings: `cadence` type widened
- [x] types/index.ts: agregar `jokerPolicy` a `Habit`

### API fixes
- [x] routines/[id]/progress: agregar handler POST (toggle habit en rutina)
- [x] jokerPolicy: conectar a handlers POST/PATCH de habits
- [x] Empty catch blocks: agregar console.error logging en rutinas/page.tsx

### Sync & offline
- [x] processGroupsSyncQueue: activar via SyncProvider en app shell
- [x] Dashboard: conectar useCheckin hook (debounce, optimistic, retry)
- [x] Eliminar checkinHelpers.ts (dead code)
- [x] Eliminar routinesSyncQueue.ts (dead code, 208 líneas)

### Limpieza de código
- [x] Eliminar TopNav (reemplazado por Sidebar)
- [x] Mover hexToRgb/isColorDark de iconUtils → colors.ts
- [x] Eliminar migrate-icons.ts (script one-shot)
- [x] Centralizar COLORS: GroupManager y RoutineForm importan de lib/colors
- [x] Centralizar hexToRgb: HabitDetailModal y HabitHeatmap importan de lib/colors

### Unificación
- [x] groupsCache.ts → delegar a CacheEntry<T> de localCache.ts
- [x] routinesCache.ts → mismo refactor
- [x] localCache.ts → limpiar 8 exports no usados (-148 líneas)

### Hotfixes post-build
- [x] dashboard: `textDecoration` → `textDecorationLine` (CSS shorthand conflict warning)
