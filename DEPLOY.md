# 🚀 MIO // Guía de Despliegue en la Nube (Cloudflare Pages + FastAPI Render)

---

## 📌 1. Frontend (Cloudflare Pages)
* **Proyecto:** `miodb` (Cloudflare Pages), conectado al repo `ivysallover/Miodb`.
* **URL de producción:** `https://miodb.pages.dev`
* **Rama de producción:** la que esté elegida en Cloudflare → Settings → Build → Branch control (al 6/10/2026: `pruebas-front3`). **Cada push a esa rama se publica solo.**
* **Build command:** `npm run build` · **Build output directory:** `dist`. Si alguno de los dos queda vacío, Cloudflare publica el repo sin compilar y el sitio queda en blanco.
* **Rutas:** no se genera `404.html`, así Pages trata el sitio como aplicación de una sola página y `/dashboard`, `/projects`, etc. responden 200. Las rutas que no existen las resuelve la app (pantalla 404 propia).
* **`wrangler.jsonc`:** es de un Worker que ya no existe; Pages lo ignora.

### Variables de entorno (opcionales)
El código trae valores por defecto para todas, así que el sitio funciona sin cargar ninguna. Sirven para apuntar a otro backend u otro proyecto de Firebase:
* `VITE_API_URL` (por defecto, el backend en Render: `https://dashboard-ia-1.onrender.com/api`)
* `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`

### Inicio de sesión
El dominio publicado tiene que estar en Firebase → Authentication → Settings → Dominios autorizados; si no, Google responde `auth/unauthorized-domain`.

---

## 📌 2. Backend (Render)
* **Runtime:** Python 3 (FastAPI)
* **Directorio Backend:** `dashboard-ia/backend`
* **Build Command:** `pip install -r requirements.txt`
* **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
* **Estado:** Zero-Disk Retention (cero persistencia en disco, solo memoria RAM volátil).
* **Environment Variables:**
  * `GEMINI_API_KEY`: API Key de Google Gemini
  * `CORS_ORIGINS`: `*` (o dominios autorizados de Cloudflare)
