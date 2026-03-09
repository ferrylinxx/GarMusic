# GarMusicWebV2 - Full Stack con Supabase

Este proyecto usa:
- `Frontend`: React + Vite
- `Backend`: Express
- `Base de datos`: Supabase (Postgres)
- `Storage`: Supabase Storage (`garmusic-assets` y `garmusic-audio`)

## 1. Configuracion Supabase

1. Ejecuta el SQL de bootstrap en tu proyecto Supabase:
```sql
docs/supabase-schema.sql
```

2. Crea `.env` en la raiz (puedes copiar `.env.example`) y define:
```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_AUDIO_BUCKET=garmusic-audio
SUPABASE_ASSETS_BUCKET=garmusic-assets
```

Nota: el backend trae por defecto el proyecto GarMusic que compartiste, pero es mejor mantener tus claves en `.env`.

## 2. Desarrollo

1. API:
```bash
npm run dev:api
```

2. Frontend:
```bash
npm run dev:web
```

3. Todo junto:
```bash
npm run dev:full
```

Si el puerto `5173` ya esta ocupado, Vite usara automaticamente otro (`5174`, `5175`, etc.) y la API seguira en `3001`.

## 3. Produccion local

1. Build:
```bash
npm run build
```

2. Servidor:
```bash
npm run start
```

La app queda en `http://localhost:3001`.
