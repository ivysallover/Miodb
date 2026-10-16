import { describe, it, expect } from 'vitest';
import { targetScore } from '../lib/targetScore';
import { getHighestWeightColumn } from '@/components/ColumnRoleSelector';

// La columna a analizar: la de ventas, no la de costos, la edad o el precio unitario.
describe('targetScore', () => {
  it('prefiere las ventas totales', () => {
    const pyme = ['cantidad', 'precio_unitario', 'monto_descuento', 'subtotal', 'total_venta', 'costo_total', 'ganancia', 'margen_porcentaje'];
    expect([...pyme].sort((a, b) => targetScore(b) - targetScore(a))[0]).toBe('total_venta');
    const shop = ['customer_age', 'gross_sales', 'discount_amount', 'tax_amount', 'net_sales', 'product_cost', 'profit', 'profit_margin_percentage'];
    expect([...shop].sort((a, b) => targetScore(b) - targetScore(a))[0]).toBe('net_sales');
  });

  it('la página propone esa columna antes de subir', () => {
    const cols = ['id_venta', 'cantidad', 'precio_unitario', 'total_venta', 'costo_total'].map((name) => ({ name, inferred_type: 'numérica', suggested_role: 'numeric' }));
    expect(getHighestWeightColumn({ columns: cols } as any)).toBe('total_venta');
  });
});
