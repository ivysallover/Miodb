export function formatNumber(value: number): string {
  if (value === null || value === undefined) return '';
  
  if (Math.abs(value) >= 1_000_000) {
    return (value / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + 'M';
  }
  if (Math.abs(value) >= 1_000) {
    return (value / 1_000).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + 'K';
  }
  return value.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}
