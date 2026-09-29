# 🚀 Guía de Despliegue en la Nube (100% Gratuito)

Tu aplicación está compuesta por 2 servicios:
1. **Backend (Python FastAPI + ML)** ➔ Se despliega en **Render.com** (Gratis).
2. **Frontend (Next.js + Tailwind + Firebase)** ➔ Se despliega en **Vercel.com** (Gratis).

---

## 📌 Paso 1: Subir el proyecto a GitHub

Abre una terminal PowerShell en la carpeta `dashboard-ia-web`:

```powershell
cd "c:\Users\adolf\OneDrive\Documents\Facultad\2026\Proyecto millonario\dashboard-ia-web"
git init
git add .
git commit -m "Initial commit: Dashboard IA Web SaaS"
git branch -M main
git remote add origin https://github.com/TU_USUARIO_GITHUB/dashboard.ia.git
git push -u origin main
```
*(Reemplaza `TU_USUARIO_GITHUB` con tu usuario real de GitHub)*.

---

## 📌 Paso 2: Desplegar el Backend en Render

1. Entra a **[render.com](https://render.com)** e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"New +"** ➔ **"Web Service"**.
3. Selecciona tu repositorio `dashboard.ia`.
4. Configura estos campos:
   - **Name:** `dashboard-ia-api`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3` (o `Docker`)
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`
5. En la sección **Environment Variables**, agrega:
   - `GEMINI_API_KEY`: *(Tu clave de Gemini)*
   - `BACKEND_CORS_ORIGINS`: `https://tu-frontend.vercel.app` (agregá el origen local sólo para desarrollo)
   - `MAX_UPLOAD_BYTES`: `104857600`
   - `MAX_CONCURRENT_ANALYSES`: `2`
6. Clic en **"Create Web Service"**.
7. Al terminar, Render te dará una URL (ej: `https://dashboard-ia-api.onrender.com`). **Copia esa URL**.

---

## 📌 Paso 3: Desplegar el Frontend en Vercel

1. Entra a **[vercel.com](https://vercel.com)** e inicia sesión con GitHub.
2. Clic en **"Add New..."** ➔ **"Project"**.
3. Importa el repositorio `dashboard.ia`.
4. En **Root Directory**, selecciona `frontend`.
5. En la sección **Environment Variables**, pega las siguientes variables:
   - `NEXT_PUBLIC_API_URL`: `https://dashboard-ia-api.onrender.com` *(la URL que te dio Render)*
   - `NEXT_PUBLIC_FIREBASE_API_KEY`: *(apiKey de Firebase)*
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: *(authDomain de Firebase)*
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: *(projectId de Firebase)*
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: *(storageBucket de Firebase)*
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: *(messagingSenderId de Firebase)*
   - `NEXT_PUBLIC_FIREBASE_APP_ID`: *(appId de Firebase)*
6. Clic en **"Deploy"**.

---

## 🎉 ¡Listo!
Vercel te dará tu link público definitivo (ej: `https://dashboard-ia.vercel.app`), accesible para cualquier usuario en el mundo desde PC o celular.

## Seguridad de Firebase

Desplegá `firestore.rules` antes de habilitar producción. El panel de administración requiere el custom claim `admin: true`; asignalo desde un entorno de administración confiable con Firebase Admin SDK. Una lista de emails en el frontend no es una medida de autorización.
