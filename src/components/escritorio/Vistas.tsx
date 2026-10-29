import React from 'react';
import { Crosshair, LayoutGrid, Presentation, Sparkles, Table2 } from 'lucide-react';
import { Segmented } from './Segmented';
import { soft, surface } from './ui';

/**
 * Lo que se mira de la planilla abierta: toda la tabla; con un análisis listo, ese análisis contado
 * (Presentación) o con todos los gráficos y números a la vista (Trabajo); antes del primer análisis,
 * elegir qué analizar (`elegir`).
 */
export type View = 'general' | 'elegir' | 'presentacion' | 'trabajo';

const OPTIONS: Record<View, { label: string; icon: React.FC<{ className?: string }> }> = {
  general: { label: 'Toda la planilla', icon: Table2 },
  elegir: { label: 'Elegir qué analizar', icon: Crosshair },
  presentacion: { label: 'Presentación', icon: Sparkles },
  trabajo: { label: 'Trabajo', icon: LayoutGrid },
};

/** Arriba de la planilla abierta: pasar de una vista a otra y, con un análisis listo, presentarlo en pantalla completa. */
export const Vistas: React.FC<{ views: View[]; value: View; onChange: (v: View) => void; onPresent?: () => void; isDark: boolean }> = ({ views, value, onChange, onPresent, isDark }) => (
  <div className={`flex flex-wrap items-center justify-between gap-2 rounded-mio p-2 ${surface(isDark)}`} data-no-print>
    <Segmented label="Qué mirar" group="vista" value={value} isDark={isDark} onChange={(v) => onChange(v)} options={views.map((id) => ({ id, ...OPTIONS[id] }))} />
    {onPresent && (
      <button type="button" onClick={onPresent} className={soft(isDark)} title="Una idea por pantalla, para una reunión (flechas para moverse, Esc para salir)">
        <Presentation className="h-4 w-4" aria-hidden /> Presentar
      </button>
    )}
  </div>
);
