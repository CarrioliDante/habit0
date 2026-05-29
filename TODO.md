# Habit0 — Roadmap de Cambios

> Inspirado en la filosofía de diseño de Gastar. Monocromático, editorial, sin color.

---

## Fase 1 — Setup del proyecto ✅

- [ ] README.md real (no boilerplate de Next.js)
- [ ] CLAUDE.md con arquitectura, comandos, convenciones
- [ ] AGENTS.md con reglas para agentes
- [ ] .env.example documentado

---

## Fase 2 — Migración estética (gastar-style)

### 2.1 Design tokens
- [ ] Reemplazar globals.css con tokens de gastar (--bg, --surface, --ink, --mute, --faint, --whisper, --hairline, --hairline2)
- [ ] Light mode por defecto (--bg: #F5F5F2, como gastar)
- [ ] Dark mode vía [data-theme="dark"]
- [ ] Tipografía: Inter (body), Inter Tight (display), JetBrains Mono (mono)
- [ ] Scrollbar minimalista con --hairline2
- [ ] Transiciones suaves (400ms background/color)

### 2.2 Layout
- [ ] Sidebar monocromática estilo gastar (232px, surface-alt, border hairline)
- [ ] SVG icons custom en sidebar (no lucide-react, no color)
- [ ] Navegación: Inicio · Hábitos · Rutinas · Analytics · Ajustes
- [ ] Animaciones de entrada con framer-motion (stagger children)
- [ ] Footer sidebar: toggle dark mode + logout
- [ ] Buscador/command palette (⌘K)

### 2.3 Componentes UI primitivos
- [ ] Stat — número grande + label mono
- [ ] Hairline — divisor 1px
- [ ] Eyebrow — label mono uppercase
- [ ] H2 — section header con right opcional
- [ ] BarChart / LineChart — SVG charts inline
- [ ] RadialRing — progreso circular SVG

### 2.4 Dashboard (refactor 1313 líneas)
- [ ] Extraer en sub-componentes por sección
- [ ] Hero con streak principal + radial ring
- [ ] Sección Hábitos de hoy (checklist con swipe-to-complete)
- [ ] Sección Rutinas del día (progreso visual)
- [ ] Heatmap semanal/mensual
- [ ] Métricas rápidas (adherencia, total checkins, mejor racha)
- [ ] Sin colores — monocromático con tonos de --ink

### 2.5 Hábitos
- [ ] HabitCard monocromática (sin colores de categoría)
- [ ] Iconos SVG custom (o Tabler icons como gastar)
- [ ] Check-in con animación sutil (no emoji, no color flash)
- [ ] Formulario de creación limpio, editorial

### 2.6 Rutinas
- [ ] RoutineCard con progreso visual (barra fina o radial)
- [ ] Checklist diario con animación de completado
- [ ] Días de semana como chips mono (no colores)

### 2.7 Grupos/Tags
- [ ] GroupBadge monocromático (borde, no fondo de color)
- [ ] GroupFilter como chips o select editorial

### 2.8 Landing page
- [ ] Rediseño completo estilo gastar landing
- [ ] Hero limpio: "Tus hábitos, sin ruido"
- [ ] Sin gradientes, sin color, sin emoji
- [ ] Footer "Hecho en Argentina"

### 2.9 Analytics
- [ ] Gráficos SVG (no dependencias externas)
- [ ] LineChart para tendencia de adherencia
- [ ] BarChart para checkins por día/mes
- [ ] Comparación de períodos con Stat components

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
