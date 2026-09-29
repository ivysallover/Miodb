# Dashboard IA

Dashboard de análisis de datos con Next.js, FastAPI y Firebase. Acepta CSV, JSON y archivos Excel para generar perfilado, gráficos, modelos de predicción, anomalías, segmentación y reportes.

## Desarrollo local

1. Copiá `backend/.env.example` a `backend/.env` y configurá las variables necesarias.
2. En `backend`, creá un entorno virtual e instalá `pip install -r requirements.txt`.
3. Ejecutá `uvicorn main:app --reload --port 10000` desde `backend`.
4. Copiá `frontend/.env.local.example` a `frontend/.env.local`, configurá Firebase y ejecutá `npm ci && npm run dev` desde `frontend`.

## Controles incluidos

- Las cargas se almacenan bajo identificadores opacos, no nombres proporcionados por clientes.
- El máximo por defecto es 100 MB y sólo se admiten CSV, JSON, XLSX y XLS.
- CORS se limita a `BACKEND_CORS_ORIGINS`; no se debe usar `*` en producción.
- `firestore.rules` protege análisis por usuario y exige el claim `admin: true` para leer o borrar logs.

Antes de desplegar, aplicá las reglas con Firebase CLI y asigná los custom claims administrativos desde un entorno con Firebase Admin SDK.
