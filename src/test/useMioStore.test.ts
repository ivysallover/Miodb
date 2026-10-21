import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMioStore } from '../utils/useMioStore';

describe('useMioStore Global State', () => {
  beforeEach(() => {
    // Reset to known state
    useMioStore.setState({
      theme: 'light',
      modeIndex: 0,
      forecastIdx: 0,
      anomalyIdx: 0,
      timeHorizon: '2026',
      isPoweredOn: true,
      pendingAnalysis: null,
    });
  });

  it('toggles theme between light and dark correctly', () => {
    expect(useMioStore.getState().theme).toBe('light');

    useMioStore.getState().toggleTheme();
    expect(useMioStore.getState().theme).toBe('dark');

    useMioStore.getState().toggleTheme();
    expect(useMioStore.getState().theme).toBe('light');
  });

  it('sets theme directly', () => {
    useMioStore.getState().setTheme('dark');
    expect(useMioStore.getState().theme).toBe('dark');

    useMioStore.getState().setTheme('light');
    expect(useMioStore.getState().theme).toBe('light');
  });

  it('cycles hardware modes', () => {
    useMioStore.getState().setModeIndex(2);
    expect(useMioStore.getState().modeIndex).toBe(2);
  });

  it('handles pending analysis consumption safely', () => {
    const mockAnalysis = { dataset_name: 'test.csv', rows: 100 };
    useMioStore.getState().setPendingAnalysis(mockAnalysis);
    expect(useMioStore.getState().pendingAnalysis).toEqual(mockAnalysis);

    const consumed = useMioStore.getState().consumePendingAnalysis();
    expect(consumed).toEqual(mockAnalysis);
    // After consumption, pendingAnalysis should be cleared
    expect(useMioStore.getState().pendingAnalysis).toBeNull();
  });
});

describe('theme across reloads', () => {
  it('remembers the chosen theme in the browser', () => {
    const box = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => box.get(k) ?? null, setItem: (k: string, v: string) => box.set(k, v), removeItem: (k: string) => box.delete(k) });
    useMioStore.getState().setTheme('dark');
    expect(localStorage.getItem('mio_theme')).toBe('dark');
    useMioStore.getState().toggleTheme();
    expect(localStorage.getItem('mio_theme')).toBe('light');
    vi.unstubAllGlobals();
  });
});

describe('confidential mode', () => {
  it('stays on across reloads and starts off', () => {
    const box = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => box.get(k) ?? null, setItem: (k: string, v: string) => box.set(k, v), removeItem: (k: string) => box.delete(k) });
    useMioStore.getState().setConfidential(true);
    expect(useMioStore.getState().confidential).toBe(true);
    expect(localStorage.getItem('mio_confidencial')).toBe('1');
    useMioStore.getState().setConfidential(false);
    expect(localStorage.getItem('mio_confidencial')).toBe('0');
    vi.unstubAllGlobals();
  });
});
