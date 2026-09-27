/**
 * src/lib/apiClient.ts
 * Cliente HTTP para comunicación con el backend FastAPI de MIO.
 * El backend NO SE TOCA: se consumen estrictamente los endpoints existentes.
 */

export class ApiError extends Error {
  public status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const getCandidateBases = (): string[] => {
  // Entorno de producción o dominio remoto
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      const clean = envUrl.replace(/\/+$/, '');
      const primary = clean.endsWith('/api/v1') || clean.endsWith('/api') ? clean : `${clean}/api`;
      return [primary, 'https://dashboard-ia-1.onrender.com/api'];
    }
    return ['https://dashboard-ia-1.onrender.com/api'];
  }

  // Entorno local de desarrollo:
  // 1. Conexión directa a FastAPI IPv4 (127.0.0.1:10000/api) - más rápido y evita proxies caídos
  // 2. Conexión a localhost:10000/api
  // 3. Proxy de Vite (/api)
  // 4. Cloud Fallback en Render
  return [
    'http://127.0.0.1:10000/api',
    'http://localhost:10000/api',
    '/api',
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
          // ignorar y seguir
        }
      }

      // Si responde OK o un error de validación de cliente (400, 422), retornarlo inmediatamente
      if (response.ok || (response.status < 500 && response.status !== 404)) {
        return response;
      }

      // Si responde 502, 503, 504 o 404 y hay más candidatos, probar el siguiente
      if (i < candidates.length - 1 && (response.status >= 500 || response.status === 404)) {
        console.warn(`[MIO API] ${url} respondió HTTP ${response.status}. Reintentando con siguiente servidor...`);
        continue;
      }

      return response;
    } catch (err: any) {
      lastError = err;
      console.warn(`[MIO API] Fallo al conectar con ${url}:`, err?.message || err);
      // Falla de red: probar siguiente candidato
      if (i < candidates.length - 1) {
        continue;
      }
    }
  }

  if (lastError) {
    throw new ApiError(
      'No se pudo conectar con el servidor backend de MIO (FastAPI). Por favor verificá que esté ejecutándose en http://127.0.0.1:10000 o reintentá.',
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
  },

  // Helper específico para análisis de planilla
  analyzeFile: async (file: File, targetCol?: string): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    if (targetCol) {
      formData.append('target_col', targetCol);
    }
    return apiClient.post<any>('/analyze', formData);
  },

  // Helper para verificar estado del servidor
  checkHealth: async (): Promise<{ status: string; service?: string }> => {
    return apiClient.get<{ status: string; service?: string }>('/health');
  },

  // Helper para telemetría y logs de admin
  getLogs: async (limit: number = 50): Promise<any> => {
    return apiClient.get<any>(`/logs?limit=${limit}`);
  },

  // Exportar reporte ejecutivo a PDF
  exportPDF: async (data: any): Promise<Blob> => {
    return apiClient.postBlob('/export/pdf', data);
  },

  // Exportar reporte a presentación PowerPoint (PPTX)
  exportPPTX: async (data: any): Promise<Blob> => {
    return apiClient.postBlob('/export/pptx', data);
  },

  // Exportar dataset limpio normalizado (CSV o XLSX)
  exportCleanedDataset: async (params: {
    file?: File;
    uploadId?: string;
    format?: 'csv' | 'xlsx';
    locale?: string;
    outlierAction?: 'flag' | 'cap' | 'drop';
    precisionMode?: 'float64' | 'decimal';
  }): Promise<Blob> => {
    const formData = new FormData();
    if (params.file) formData.append('file', params.file);
    if (params.uploadId) formData.append('upload_id', params.uploadId);
    formData.append('export_format', params.format || 'csv');
    formData.append('locale', params.locale || 'auto');
    formData.append('outlier_action', params.outlierAction || 'flag');
    formData.append('precision_mode', params.precisionMode || 'float64');
    return apiClient.postBlob('/export/cleaned-dataset', formData);
  },
};
