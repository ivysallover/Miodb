# 🚀 Guía de Despliegue en la Nube (Vite + FastAPI + Vercel + Render)

## 📌 1. Frontend (Vercel)
* **Framework Preset:** Vite
* **Root Directory:** `./` (Directorio raíz vacío)
* **Build Command:** `vite build` (configurado en `vercel.json` y `package.json`)
* **Output Directory:** `dist`

### Variables de Entorno en Vercel:
* `VITE_API_URL`: URL del backend en Render (ej: `https://dashboard-ia-api.onrender.com/api`)
* `VITE_FIREBASE_API_KEY`: Clave de API de Firebase
* `VITE_FIREBASE_AUTH_DOMAIN`: Dominio de Auth de Firebase
* `VITE_FIREBASE_PROJECT_ID`: ID del proyecto en Firebase
* `VITE_FIREBASE_STORAGE_BUCKET`: Storage bucket de Firebase
* `VITE_FIREBASE_MESSAGING_SENDER_ID`: Sender ID de Firebase
* `VITE_FIREBASE_APP_ID`: App ID de Firebase

---

## 📌 2. Backend (Render)
* **Runtime:** Python 3 (o Docker)
* **Root Directory:** `dashboard-ia/backend`
* **Build Command:** `pip install -r requirements.txt`
* **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
* **Environment Variables:**
  * `GEMINI_API_KEY`: API Key de Google Gemini
  * `CORS_ORIGINS`: Dominio de Vercel (o `*`)
