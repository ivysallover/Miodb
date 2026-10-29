import React from 'react';
import { Crosshair, Table2 } from 'lucide-react';
import { Segmented } from './Segmented';
import { surface } from './ui';

/** Lo que se mira de la planilla abierta: toda la tabla, o el análisis de una columna (o elegirla). */
export type View = 'general' | 'detalle';

/** Arriba de la planilla abierta: pasar de la vista general a una columna y volver. */
export const Vistas: React.FC<{ value: View; onChange: (v: View) => void; detail: string; isDark: boolean }> = ({ value, onChange, detail, isDark }) => (
  <div className={`flex rounded-mio p-2 ${surface(isDark)}`} data-no-print>
    <Segmented
      label="Qué mirar"
      group="vista"
      value={value}
      isDark={isDark}
      onChange={(v) => onChange(v)}
      options={[
        { id: 'general', label: 'Toda la planilla', icon: Table2 },
        { id: 'detalle', label: detail, icon: Crosshair },
      ]}
    />
  </div>
);
