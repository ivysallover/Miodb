import { beforeEach, describe, expect, it, vi } from 'vitest';

// Firestore de mentira: un documento por cuenta, o una falla (sin conexión).
const store = new Map<string, Record<string, any>>();
let offline = false;
vi.mock('../lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, col: string, id: string) => `${col}/${id}`,
  serverTimestamp: () => 'ahora',
  getDoc: async (ref: string) => {
    if (offline) throw new Error('sin conexión');
    const data = store.get(ref);
    return { get: (path: string) => path.split('.').reduce((v: any, k) => v?.[k], data) };
  },
  setDoc: async (ref: string, data: Record<string, any>) => {
    if (offline) throw new Error('sin conexión');
    store.set(ref, { ...store.get(ref), ...data });
  },
}));

// Lo recordado en esta compu (las pruebas corren sin navegador).
const saved = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => saved.get(k) ?? null,
  setItem: (k: string, v: string) => saved.set(k, v),
  clear: () => saved.clear(),
});

const { TERMS_VERSION, acceptTerms, hasAcceptedTerms } = await import('../lib/terms');
const { authMessage } = await import('../lib/authErrors');

describe('términos aceptados por cuenta', () => {
  beforeEach(() => {
    store.clear();
    localStorage.clear();
    offline = false;
  });

  it('una cuenta nueva no los aceptó; al aceptarlos queda la versión vigente, desde qué app y la hora del servidor', async () => {
    expect(await hasAcceptedTerms('ana')).toBe(false);
    await acceptTerms('ana', 'escritorio');
    expect(store.get('users/ana')).toEqual({ terminos: { version: TERMS_VERSION, aceptados: true, desde: 'ahora', app: 'escritorio' } });
    expect(await hasAcceptedTerms('ana')).toBe(true);
    expect(await hasAcceptedTerms('beto')).toBe(false);
  });

  it('si cambia la versión, se vuelven a pedir', async () => {
    store.set('users/ana', { terminos: { version: 'Marzo 2026', aceptados: true } });
    expect(await hasAcceptedTerms('ana')).toBe(false);
  });

  it('sin conexión vale lo aceptado en esta compu, y solo eso', async () => {
    await acceptTerms('ana', 'web');
    offline = true;
    expect(await hasAcceptedTerms('ana')).toBe(true);
    expect(await hasAcceptedTerms('beto')).toBe(false);
    await expect(acceptTerms('beto', 'web')).rejects.toThrow();
  });
});

describe('mensajes de ingreso', () => {
  it('dice qué pasó en palabras, y algo general si el error es otro', () => {
    expect(authMessage({ code: 'auth/invalid-credential' })).toBe('El mail o la contraseña no coinciden.');
    expect(authMessage({ code: 'auth/email-already-in-use' })).toMatch(/ya tiene cuenta/);
    expect(authMessage({ code: 'auth/network-request-failed' })).toMatch(/conexión/);
    expect(authMessage(new Error('x'))).toBe('No pudimos ingresar. Probá de nuevo en un momento.');
  });
});
