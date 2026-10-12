import { describe, it, expect, vi, beforeEach } from 'vitest';

// The engine refuses requests without the Firebase session token of whoever is signed in.
// `getIdToken` is stubbed; nothing here signs anyone in.
const session = vi.hoisted(() => ({ user: null as null | { getIdToken: () => Promise<string> } }));
vi.mock('../lib/firebaseAuth', () => ({
  auth: {
    get currentUser() {
      return session.user;
    },
  },
}));

import { apiClient } from '../lib/apiClient';

const ok = () => new Response(JSON.stringify({ state: 'none', position: 0, waiting: 0, running: 0 }), {
  status: 200,
  headers: { 'content-type': 'application/json' },
});

describe('apiClient session', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    session.user = null;
  });

  it('sends the session token on every request when someone is signed in', async () => {
    session.user = { getIdToken: async () => 'token-de-prueba' };
    const fetchMock = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', fetchMock);

    await apiClient.queueStatus('ticket-1234567');

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-de-prueba');
  });

  it('sends no Authorization header when nobody is signed in', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', fetchMock);

    await apiClient.queueStatus('ticket-1234567');

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).has('Authorization')).toBe(false);
  });

  it('carries the ticket of an analysis so its place in the line can be asked', async () => {
    session.user = { getIdToken: async () => 'token-de-prueba' };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    );
    vi.stubGlobal('fetch', fetchMock);

    await apiClient.analyzeFile(new File(['a,b\n1,2'], 'x.csv'), 'b', undefined, 'ticket-abcdefgh');

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get('X-Request-Id')).toBe('ticket-abcdefgh');
    expect(headers.get('Authorization')).toBe('Bearer token-de-prueba');
  });

  it('does not wait for the line forever on a 401: it answers with the engine message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Necesitás iniciar sesión para usar el análisis.' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiClient.queueStatus('ticket-1234567')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
