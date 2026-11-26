# Atempo — Catálogo Musical, Mapa Interactivo y Asistente IA

Sistema web full-stack para gestionar tiendas de instrumentos musicales, estudios de grabación y escuelas de música con persistencia en **Supabase**, visualización geográfica en **Google Maps Platform** y un **asistente inteligente con Gemini API** capaz de consultar en tiempo real los registros del catálogo.

## Arquitectura y tecnologías

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, `@vis.gl/react-google-maps` (`AdvancedMarker` + `InfoWindow`).
- **Backend:** Express + Node.js (`server.ts`) con endpoints REST para CRUD completo (`/api/venues`, `/api/items`) y chat con Function Calling (`/api/assistant`).
- **Base de datos:** Supabase (PostgreSQL) mediante `@supabase/supabase-js`.
- **Inteligencia Artificial:** `@google/genai` (`gemini-4-hydrogen`) ejecutado exclusivamente del lado del servidor.

## Variables de entorno

Copia `.env.example` a `.env` para desarrollo local y configura las siguientes variables (nunca las publiques en el repositorio):

| Variable | Uso | Dónde se ejecuta |
| --- | --- | --- |
| `GEMINI_API_KEY` | Clave de Google AI Studio / Gemini API | Servidor |
| `VITE_GOOGLE_MAPS_API_KEY` | Clave de Google Maps JavaScript API (restringida por HTTP referrer) | Cliente |
| `SUPABASE_URL` | URL del proyecto en Supabase | Servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave privada `service_role` de Supabase (o `SUPABASE_ANON_KEY` con políticas adecuadas) | Servidor |

## Configuración de Supabase

1. Crea un proyecto en [Supabase](https://supabase.com).
2. Abre **SQL Editor** y ejecuta el contenido completo de `supabase/schema.sql`.
3. Esto creará las tablas `venues` y `catalog_items` junto con 6 locales iniciales (tiendas, estudios y escuelas) y 20 registros de instrumentos, clases y servicios.
4. Copia tu `Project URL` y `service_role` key a `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.

## Publicación en GitHub y Render

1. Sube este proyecto a tu repositorio de **GitHub** (el archivo `.gitignore` excluye `.env`, `node_modules` y `dist`).
2. En **Render**, crea un nuevo **Web Service** conectado al repositorio (o usa **New > Blueprint** con `render.yaml`).
3. Configura:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Agrega las variables de entorno secretas en el panel **Environment** de Render (`GEMINI_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) y despliega.
