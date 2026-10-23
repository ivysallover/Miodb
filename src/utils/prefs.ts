/**
 * Preferencias que sobreviven a recargar (tema, modo confidencial, si ya se vio la guía): se guardan
 * en el navegador. Sin almacenamiento (ventana privada, datos bloqueados) simplemente no se recuerdan.
 */
export const readPref = (key: string): string | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
};

export const keepPref = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento: no se recuerda */
  }
};
