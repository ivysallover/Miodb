import React from 'react';
import { Briefcase, Crosshair, Filter, Grid3x3, LayoutGrid, Scale, Sparkles, Table2 } from 'lucide-react';
import { Segmented } from './Segmented';
import type { Palette } from './usePreferences';
import { surface, tool } from './ui';

/**
 * Lo que se mira de la planilla abierta: toda la tabla; con un análisis listo, ese análisis contado
 * (Presentación) o con todos los gráficos y números a la vista (Trabajo); antes del primer análisis,
 * elegir qué analizar (`elegir`); y siempre, cruzar los datos (`tabla`) o poner dos grupos lado a lado
 * (`comparar`).
 */
export type View = 'general' | 'elegir' | 'presentacion' | 'trabajo' | 'tabla' | 'comparar';

const OPTIONS: Record<View, { label: string; icon: React.FC<{ className?: string }> }> = {
  general: { label: 'Toda la planilla', icon: Table2 },
  elegir: { label: 'Elegir qué analizar', icon: Crosshair },
  presentacion: { label: 'Presentación', icon: Sparkles },
  trabajo: { label: 'Trabajo', icon: LayoutGrid },
  tabla: { label: 'Tabla dinámica', icon: Grid3x3 },
  comparar: { label: 'Comparar', icon: Scale },
};

/**
 * La barra de la planilla abierta, en una sola línea: a la izquierda, qué mirar; a la derecha, filtrar y
 * prender o apagar los colores sobrios (cuál paleta, en Ajustes). Todo a la misma altura.
 */
export const Vistas: React.FC<{ views: View[]; value: View; onChange: (v: View) => void; onFilter?: () => void; palette: Palette; onPalette: (p: Palette) => void; isDark: boolean }> = ({ views, value, onChange, onFilter, palette, onPalette, isDark }) => {
  const sober = palette === 'sobria';
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-mio p-2 ${surface(isDark)}`} data-no-print>
      <Segmented bare label="Qué mirar" group="vista" value={value} isDark={isDark} onChange={(v) => onChange(v)} options={views.map((id) => ({ id, ...OPTIONS[id] }))} />
      <span className="ml-auto flex items-center gap-1">
        {onFilter && (
          <button type="button" onClick={onFilter} className={tool(isDark)} title="Mirar solo una parte de la planilla y volver a analizarla">
            <Filter className="h-4 w-4" aria-hidden /> Filtrar
          </button>
        )}
        <button
          type="button"
          onClick={() => onPalette(sober ? 'marca' : 'sobria')}
          aria-pressed={sober}
          className={tool(isDark, sober)}
          title="Cambia toda la app, los gráficos y el PDF a la paleta sobria elegida en Ajustes, para mostrar en una reunión"
        >
          <Briefcase className="h-4 w-4" aria-hidden /> Colores sobrios
        </button>
      </span>
    </div>
  );
};
