/**
 * Qué columna analizar, por su nombre: la misma regla que el motor (`target_score` en
 * core/data_profiler.py y en el motor de escritorio). Ventas primero; costos, descuentos, edades,
 * ratings y porcentajes al final. Mayor puntaje = más probable que sea lo que la persona quiere ver.
 */
const STRONG = ['venta', 'sales', 'revenue', 'ingreso', 'factur', 'importe', 'total'];
const MEDIUM = ['ganancia', 'profit', 'margen', 'beneficio', 'monto', 'valor', 'amount'];
const WEAK = ['precio', 'price', 'cantidad', 'quantity', 'units', 'unidades', 'churn', 'baja', 'cancelacion', 'score'];
const PENALTY_SUB = ['costo', 'cost', 'descuento', 'discount', 'impuesto', 'envio', 'envío', 'shipping', 'porcentaje', 'percentage', 'lifetime'];
const PENALTY_TOKENS = new Set(['age', 'edad', 'rate', 'tasa', 'pct', 'days', 'dias', 'días', 'dia', 'día', 'year', 'año', 'month', 'mes', 'points', 'puntos', 'stock', 'rating', 'tax']);
const SALES = ['venta', 'sales', 'revenue', 'ingreso', 'factur'];

export function targetScore(name: string): number {
  const n = name.toLowerCase();
  const tokens = n.split(/[^a-z0-9áéíóúñ]+/).filter(Boolean);
  const has = (list: string[]) => list.some((k) => n.includes(k));
  let score = has(STRONG) ? 100 : has(MEDIUM) ? 60 : has(WEAK) ? 30 : 0;
  if (has(SALES) && (n.includes('total') || n.includes('net') || n.includes('neto'))) score += 10;
  if (has(PENALTY_SUB) || tokens.some((t) => PENALTY_TOKENS.has(t))) score -= 80;
  return score;
}
