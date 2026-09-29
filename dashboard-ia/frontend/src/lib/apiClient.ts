export class ApiError extends Error {
  public status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const getCandidateBases = (): string[] => {
  // En el navegador de producción (dashboard-mio.vercel.app o cualquier dominio que no sea localhost)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      const clean = envUrl.replace(/\/+$/, '');
      const primary = clean.endsWith('/api/v1') || clean.endsWith('/api') ? clean : `${clean}/api`;
      return [primary, 'https://dashboard-ia-1.onrender.com/api'];
    }
    return ['https://dashboard-ia-1.onrender.com/api'];
  }

  // En entorno local de desarrollo:
  // 1. Conexión directa a FastAPI IPv4 (127.0.0.1:10000/api)
  // 2. Conexión a localhost:10000/api
  // 3. Fallback a Render en la nube
  return [
    'http://127.0.0.1:10000/api',
    'http://localhost:10000/api',
    'https://dashboard-ia-1.onrender.com/api',
  ];
};

export const getBaseUrl = (): string => {
  return getCandidateBases()[0];
};

function cloneRequestInit(init?: RequestInit): RequestInit | undefined {
  if (!init) return undefined;
  const cloned: RequestInit = { ...init };
  if (init.body && typeof FormData !== 'undefined' && init.body instanceof FormData) {
    const freshFormData = new FormData();
    init.body.forEach((val, key) => {
      if (val instanceof File) {
        freshFormData.append(key, val, val.name);
      } else {
        freshFormData.append(key, val);
      }
    });
    cloned.body = freshFormData;
  }
  return cloned;
}

async function fetchWithFallback(endpoint: string, init?: RequestInit): Promise<Response> {
  const candidates = getCandidateBases();
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  let lastError: any = null;

  for (let i = 0; i < candidates.length; i++) {
    const candidateBase = candidates[i].replace(/\/+$/, '');
    let targetPath = cleanEndpoint;
    if (candidateBase.endsWith('/api') && targetPath.startsWith('/api/')) {
      targetPath = targetPath.replace(/^\/api/, '');
    }
    const url = `${candidateBase}${targetPath}`;

    try {
      const response = await fetch(url, cloneRequestInit(init));

      // Si la ruta v1 responde 404, reintento transparente con ruta legacy /api/
      if (response.status === 404 && url.includes('/api/v1/')) {
        const legacyUrl = url.replace('/api/v1/', '/api/');
        try {
          const legacyRes = await fetch(legacyUrl, cloneRequestInit(init));
          if (legacyRes.ok || legacyRes.status < 500) {
            return legacyRes;
          }
        } catch {
          // Fallback falló, continuar
        }
      }

      // Si responde OK o error de cliente (400, 422), retornarlo de inmediato
      if (response.ok || (response.status < 500 && response.status !== 404)) {
        return response;
      }

      // Si responde 502, 503, 504 o 404 y hay más servidores candidatos, probar el siguiente
      if (i < candidates.length - 1 && (response.status >= 500 || response.status === 404)) {
        console.warn(`[MIO Frontend API] ${url} respondió HTTP ${response.status}. Reintentando con siguiente servidor...`);
        continue;
      }

      return response;
    } catch (err: any) {
      lastError = err;
      console.warn(`[MIO Frontend API] Fallo al conectar con ${url}:`, err?.message || err);
      if (i < candidates.length - 1) {
        continue;
      }
    }
  }

  if (lastError) {
    throw new ApiError(
      'No se pudo conectar con el servidor backend. Verificá tu conexión o aguardá unos segundos si el servidor se está iniciando.',
      503
    );
  }

  throw new ApiError('Error al comunicarse con el backend FastAPI.', 500);
}

async function handleResponse<T>(response: Response, isBlob: boolean = false): Promise<T> {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  
  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`;
    if (response.status === 502) {
      errorMessage = 'El servidor de Render se reinició o agotó temporalmente su memoria. Por favor reintentá en unos momentos.';
    } else if (response.status === 503 || response.headers.get('x-render-routing')?.includes('hibernate')) {
      errorMessage = 'El servidor en la nube de Render está despertando (plan gratuito). Por favor aguardá 30-60 segundos e intentá nuevamente.';
    } else if (response.status === 504) {
      errorMessage = 'El procesamiento excedió el tiempo límite del servidor. Por favor seleccioná un archivo más liviano.';
    } else if (response.status === 413) {
      errorMessage = 'El archivo supera el límite permitido por la red (máximo 100 MB). Por favor seleccioná un archivo más liviano.';
    } else if (isJson) {
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch (e) {
      }
    } else {
      errorMessage = await response.text();
    }
    throw new ApiError(errorMessage, response.status);
  }

  if (isBlob) {
    return (await response.blob()) as unknown as Promise<T>;
  }
  if (isJson) {
    return (await response.json()) as Promise<T>;
  }
  
  return (await response.text()) as unknown as Promise<T>;
}

export const apiClient = {
  get: async <T>(endpoint: string, init?: RequestInit): Promise<T> => {
    const response = await fetchWithFallback(endpoint, {
      ...init,
      method: 'GET',
    });
    return handleResponse<T>(response);
  },

  post: async <T>(endpoint: string, body?: any, init?: RequestInit): Promise<T> => {
    const isFormData = body instanceof FormData;
    const headers = new Headers(init?.headers);
    if (!isFormData && body) {
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetchWithFallback(endpoint, {
      ...init,
      method: 'POST',
      headers,
      body: isFormData ? body : JSON.stringify(body),
    });
    return handleResponse<T>(response);
  },
  
  postBlob: async (endpoint: string, body?: any, init?: RequestInit): Promise<Blob> => {
    const isFormData = body instanceof FormData;
    const headers = new Headers(init?.headers);
    if (!isFormData && body) {
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetchWithFallback(endpoint, {
      ...init,
      method: 'POST',
      headers,
      body: isFormData ? body : JSON.stringify(body),
    });
    return handleResponse<Blob>(response, true);
  }
};
