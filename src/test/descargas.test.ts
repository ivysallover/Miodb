import { describe, expect, it } from 'vitest';
import { DESCARGAS, plataforma } from '@/lib/descargas';

describe('la descarga de la app según la compu', () => {
  it('reconoce Windows y Mac, y en el celular no ofrece instalador', () => {
    expect(plataforma('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0')).toBe('windows');
    expect(plataforma('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15')).toBe('mac');
    expect(plataforma('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148')).toBeNull();
    expect(plataforma('Mozilla/5.0 (Linux; Android 15) Mobile Safari/537.36')).toBeNull();
    expect(plataforma('Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0')).toBeNull();
  });

  it('los links van a los instaladores de la última versión', () => {
    expect(DESCARGAS.windows.url).toMatch(/\/escritorio\/MIO-Windows\.exe$/);
    expect(DESCARGAS.mac.url).toMatch(/\.dmg$/);
  });
});
