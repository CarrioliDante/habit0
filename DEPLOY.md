# 🚀 Guía de Deploy - Habit0

## Pre-requisitos

1. Cuenta en [Vercel](https://vercel.com)
2. Cuenta en [Clerk](https://clerk.com) (autenticación)
3. Base de datos Postgres (recomendado: Vercel Postgres)

## 📝 Pasos para Deploy

### 1. Configurar Clerk

1. Ve a [Clerk Dashboard](https://dashboard.clerk.com)
2. Crea una nueva aplicación
3. Copia las API keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

### 2. Configurar Base de Datos

#### Opción A: Vercel Postgres (Recomendado)

1. Ve a tu proyecto en Vercel
2. Ve a "Storage" → "Create Database" → "Postgres"
3. Copia todas las variables de conexión que aparecen

#### Opción B: Otra base de datos Postgres

- Crea una base de datos Postgres (Neon, Supabase, Railway, etc.)
- Obtén la URL de conexión

### 3. Deploy en Vercel

#### Via GitHub (Recomendado):

```bash
# 1. Sube el código a GitHub
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main

# 2. Conecta en Vercel
# - Ve a vercel.com
# - Click "Import Project"
# - Selecciona tu repo de GitHub
# - Vercel detectará Next.js automáticamente
```

#### Via Vercel CLI:

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Seguir las instrucciones interactivas
```

### 4. Configurar Variables de Entorno en Vercel

En el dashboard de Vercel, ve a:
**Settings → Environment Variables**

Agrega todas estas variables:

```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx

# Database (de Vercel Postgres)
POSTGRES_URL=postgres://xxx
POSTGRES_PRISMA_URL=postgres://xxx
POSTGRES_URL_NO_SSL=postgres://xxx
POSTGRES_URL_NON_POOLING=postgres://xxx
POSTGRES_USER=xxx
POSTGRES_HOST=xxx
POSTGRES_PASSWORD=xxx
POSTGRES_DATABASE=xxx

# Clerk URLs (opcional, ya tienen defaults)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### 5. Ejecutar Migraciones de Base de Datos

```bash
# Opción A: Desde tu máquina local
npm install
npm run db:push

# Opción B: Desde Vercel CLI
vercel env pull .env.local
npm install
npm run db:push
```

Si no tienes el comando `db:push`, agrégalo al `package.json`:

```json
{
  "scripts": {
    "db:push": "drizzle-kit push"
  }
}
```

### 6. Verificar el Deploy

1. Ve a la URL que te dio Vercel (ej: `habit0.vercel.app`)
2. Prueba:
   - Sign in/Sign up
   - Crear un hábito
   - Hacer check-in
   - Verificar que funciona offline (desconecta internet)
   - Volver a conectar y verificar que sincroniza

## 🔧 Comandos Útiles

```bash
# Deploy a producción
vercel --prod

# Ver logs
vercel logs

# Ver el estado
vercel inspect

# Redeploy
vercel --force
```

## 🐛 Troubleshooting

### Error: "Clerk keys not found"

- Verifica que agregaste las variables `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY`
- Asegúrate de que sean las correctas del ambiente de producción en Clerk

### Error: "Database connection failed"

- Verifica todas las variables `POSTGRES_*`
- Asegúrate de que la base de datos esté activa
- Verifica que corriste las migraciones

### Error: "Build failed"

- Revisa los logs en Vercel
- Asegúrate de que no hay errores de TypeScript
- Verifica que todas las dependencias estén en `package.json`

### Las tablas no existen en la base de datos

```bash
# Corre las migraciones
npm run db:push

# O genera y aplica manualmente
npx drizzle-kit generate
npx drizzle-kit push
```

## 📊 Monitoreo Post-Deploy

1. **Performance**: Usa Vercel Analytics (gratis)
2. **Errores**: Revisa los logs en Vercel Dashboard
3. **Clerk**: Monitorea usuarios activos en Clerk Dashboard

## 🔄 Actualizaciones

Para actualizar tu app después del deploy inicial:

```bash
# 1. Haz cambios en el código
# 2. Commitea y pushea
git add .
git commit -m "Your changes"
git push

# Vercel automáticamente re-deployará
```

## ✅ Checklist Final

- [ ] Variables de entorno configuradas en Vercel
- [ ] Base de datos creada y conectada
- [ ] Migraciones ejecutadas
- [ ] Clerk configurado
- [ ] App funcionando en la URL de producción
- [ ] Sign in/Sign up funciona
- [ ] Crear hábitos funciona
- [ ] Check-ins funcionan
- [ ] Funcionalidad offline funciona
- [ ] Sincronización funciona

## 🎉 ¡Listo!

Tu app está en producción en: `https://your-app.vercel.app`

Para dominio personalizado:

1. Ve a Settings → Domains en Vercel
2. Agrega tu dominio
3. Configura los DNS según las instrucciones

---

**¿Problemas?** Revisa los logs en Vercel Dashboard o abre un issue en GitHub.
