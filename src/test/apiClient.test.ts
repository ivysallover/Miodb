import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCandidateBases, getBaseUrl, warmUpBackend } from '../lib/apiClient';

describe('apiClient Candidate Bases', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('provides fallback candidate base URLs', () => {
    const bases = getCandidateBases();
    expect(Array.isArray(bases)).toBe(true);
    expect(bases.length).toBeGreaterThan(0);
    // Render URL should always be in the list of candidates
    const hasRender = bases.some((b) => b.includes('dashboard-ia-1.onrender.com'));
    expect(hasRender).toBe(true);
  });

  it('getBaseUrl returns the primary candidate', () => {
    const primary = getBaseUrl();
    expect(typeof primary).toBe('string');
    expect(primary.length).toBeGreaterThan(0);
  });

  it('warmUpBackend executes silently without throwing exceptions', () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('OK', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { location: { hostname: 'miodb.pages.dev' } });

    expect(() => warmUpBackend()).not.toThrow();
    expect(fetchMock).toHaveBeenCalled();
  });
});
