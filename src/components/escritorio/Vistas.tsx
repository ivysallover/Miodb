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
    <div className={`flex items-center gap-2 rounded-mio p-2 ${surface(isDark)}`} data-no-print>
      {/* Las vistas no se parten en dos renglones: si no entran, se deslizan de costado (el borde derecho se desvanece para que se note). */}
      <div className="min-w-0 flex-1 overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Segmented bare nowrap label="Qué mirar" group="vista" value={value} isDark={isDark} onChange={(v) => onChange(v)} options={views.map((id) => ({ id, ...OPTIONS[id] }))} />
      </div>
      {/* Con la ventana angosta, solo los íconos (el nombre, al pasar el mouse). */}
      <span className="flex shrink-0 items-center gap-1">
        {onFilter && (
          <button type="button" onClick={onFilter} aria-label="Filtrar" className={`${tool(isDark)} max-xl:!px-3`} title="Mirar solo una parte de la planilla y volver a analizarla">
            <Filter className="h-4 w-4" aria-hidden /> <span className="hidden xl:inline">Filtrar</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => onPalette(sober ? 'marca' : 'sobria')}
          aria-pressed={sober}
          aria-label="Colores sobrios"
          className={`${tool(isDark, sober)} max-xl:!px-3`}
          title="Cambia toda la app, los gráficos y el PDF a la paleta sobria elegida en Ajustes, para mostrar en una reunión"
        >
          <Briefcase className="h-4 w-4" aria-hidden /> <span className="hidden xl:inline">Colores sobrios</span>
        </button>
      </span>
    </div>
  );
};
