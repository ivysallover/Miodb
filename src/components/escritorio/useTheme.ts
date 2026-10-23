import { useEffect, useState } from 'react';
import { useMioStore } from '@/utils/useMioStore';
import { keepPref, readPref } from '@/utils/prefs';
import { switchTheme } from '@/lib/themeTransition';
import { inDesktop } from './desktop';

/** El tema elegido en la app de escritorio: como el sistema, claro u oscuro (se guarda). */
export type ThemeMode = 'sistema' | 'claro' | 'oscuro';

const THEME_KEY = 'mio_escritorio_tema';
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)');
/** El tema que corresponde a lo elegido. */
const resolve = (mode: ThemeMode) => (mode === 'sistema' ? (systemDark().matches ? 'dark' : 'light') : mode === 'oscuro' ? 'dark' : 'light');
const savedMode = (): ThemeMode => {
  const v = readPref(THEME_KEY);
  return v === 'claro' || v === 'oscuro' ? v : 'sistema';
};

/** El tema de la app de escritorio: el elegido o, si es "como el sistema", el de la compu (y sigue sus cambios). */
export function useTheme() {
  const setTheme = useMioStore((s) => s.setTheme);
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const [themeMode, setThemeModeState] = useState<ThemeMode>(savedMode);

  useEffect(() => {
    if (!inDesktop()) return;
    setTheme(resolve(themeMode));
    if (themeMode !== 'sistema') return;
    const dark = systemDark();
    const follow = () => switchTheme(() => setTheme(resolve('sistema')));
    dark.addEventListener('change', follow);
    return () => dark.removeEventListener('change', follow);
  }, [themeMode, setTheme]);

  /** Elige el tema; el cambio se ve de una vez, abriéndose desde `from` (lo que se tocó). */
  const setThemeMode = (mode: ThemeMode, from?: { x: number; y: number }) => {
    keepPref(THEME_KEY, mode);
    switchTheme(() => {
      setThemeModeState(mode);
      setTheme(resolve(mode));
    }, from);
  };

  return { isDark, themeMode, setThemeMode };
}
