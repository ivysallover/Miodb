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
  * `REQUIRE_AUTH`: `true` por defecto. El motor solo atiende pedidos con el token de Firebase de alguien ingresado (`Authorization: Bearer ...`). **Orden de despliegue:** si el sitio publicado todavía es una versión que no manda el token, ponelo en `false` hasta publicar el frontend nuevo; si no, todos los análisis dan 401.
  * `FIREBASE_PROJECT_ID`: id del proyecto de Firebase con el que se valida el token (por defecto `analitica-dashboar-y-ml`).
  * `MAX_CONCURRENT_ANALYSES`: análisis que corren a la vez (por defecto `1`, por la RAM). Los demás esperan en cola y la página avisa "estamos teniendo breves demoras".
  * `MAX_QUEUE_LENGTH`: cuántos pueden esperar (por defecto `10`); más allá, el motor responde 429 pidiendo probar en un rato.
  * `QUEUE_MAX_MB`: cuánto pueden pesar juntos los archivos de los análisis que corren o esperan (por defecto `120`); el primero siempre entra. Cada pedido espera con su archivo en RAM, así que sin este tope 10 pedidos grandes tiraban el servidor.
  * `EPHEMERAL_STORE_MAX_MB`: tope en MB para las copias de archivos subidos que quedan 15 min en RAM (por defecto `48`). Antes el tope era de 25 archivos, sin importar el tamaño. Un archivo más grande que el tope no se guarda: la página manda el archivo de nuevo al exportar.

## 📌 3. App de escritorio (instaladores y actualizaciones)

Se descarga como cualquier programa (sin tiendas): un `.dmg` para Mac y un `.msi` o `.exe` para Windows.

### En tu compu (solo Mac)
* `npm run instalador` arma la app y el `.dmg` en `desktop/target.nosync/release/bundle/dmg/`. Firma la actualización con la clave de `~/.tauri/mio-escritorio.key`.
* La clave **no está en el repositorio**. Si se pierde, las apps ya instaladas no aceptan versiones nuevas: guardala también en otro lugar seguro (por ejemplo, el gestor de contraseñas).

### Una versión para todos (Mac y Windows)
1. Una sola vez: en GitHub → Settings → Secrets and variables → Actions, crear `TAURI_SIGNING_PRIVATE_KEY` con el contenido de `~/.tauri/mio-escritorio.key`.
2. Subir el número de versión en `desktop/src-tauri/tauri.conf.json` (`version`). Escribir en `desktop/novedades.md` qué trae, una línea por cosa empezando con "- ": va en la página de la versión y la app lo muestra al avisar que hay una nueva.
3. **Antes de gastar el número, probar el armado**: GitHub → Actions → "App de escritorio" → Run workflow (en la rama que sea). Arma los tres instaladores sin crear versión; quedan para bajar en Artifacts. Si alguno falla, se arregla y se vuelve a correr así. Recién cuando salen los tres:
4. Subir una etiqueta con ese número: `git tag escritorio-v0.2.0 && git push fork escritorio-v0.2.0`. El flujo `.github/workflows/escritorio.yml` arma Mac (Apple Silicon e Intel) y Windows y deja un **borrador** de versión en GitHub con los instaladores.
5. Revisar el borrador y publicarlo. Desde ahí, las apps instaladas avisan "Hay una versión nueva" y se actualizan solas (comprueban la firma antes de instalar).

### Dónde quedan las descargas (Cloudflare R2)
* Espacio público `mio-descargas` (`https://pub-21e06231ebb5439a9d49a06fcb08b70a.r2.dev`), solo con instaladores: `escritorio/<versión>/…` (cada versión), `escritorio/latest.json` (lo que mira la app para actualizarse, con los links a R2) y los links fijos de la landing: `escritorio/MIO-Windows.exe`, `MIO-Mac-Apple-Silicon.dmg`, `MIO-Mac-Intel.dmg` (siempre la última).
* La app busca versiones nuevas primero ahí y, si no, en GitHub (`plugins.updater.endpoints`).
* Al publicar una versión, subir sus archivos ahí con `npx wrangler r2 object put mio-descargas/<ruta> --file <archivo> --remote` y reemplazar `latest.json` y los tres links fijos.

### La primera vez que se abre en otra compu
* **Mac**: sin la firma de Apple (cuenta de desarrollador, US$ 99 por año), la Mac avisa que no puede verificar al desarrollador. Se abre con clic derecho → Abrir, o en Ajustes del Sistema → Privacidad y seguridad → "Abrir igualmente". Con la cuenta de Apple, se firma y se notariza en el mismo flujo y abre sin aviso.
* **Windows**: SmartScreen puede avisar "Windows protegió tu PC": Más información → Ejecutar de todas formas. Un certificado de firma de código lo saca.
