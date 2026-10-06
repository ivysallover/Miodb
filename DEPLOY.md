# 🚀 MIO // Guía de Despliegue en la Nube (Cloudflare Pages + FastAPI Render)

---

## 📌 1. Frontend (Cloudflare Pages)
* **Proyecto Oficial:** `miodb`
* **URL de Producción:** `https://miodb.pages.dev`
* **Framework Preset:** Vite
* **Directorio Raíz:** `./`
* **Build Command:** `npm run build`
* **Output Directory:** `dist`
* **SPA Fallback:** `200.html` y `404.html`
* **Rama de Producción Oficial:** `frontpro`

### Variables de Entorno en Cloudflare Pages:
* `VITE_API_URL`: URL del backend en Render (`https://dashboard-ia-1.onrender.com/api`)
* `VITE_FIREBASE_API_KEY`: Clave de API de Firebase
* `VITE_FIREBASE_AUTH_DOMAIN`: Dominio de Auth de Firebase
* `VITE_FIREBASE_PROJECT_ID`: ID del proyecto en Firebase
* `VITE_FIREBASE_STORAGE_BUCKET`: Storage bucket de Firebase
* `VITE_FIREBASE_MESSAGING_SENDER_ID`: Sender ID de Firebase
* `VITE_FIREBASE_APP_ID`: App ID de Firebase

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
