import React from 'react';
import { BookOpen, UserRound, FileSpreadsheet, FolderOpen, Home, Layers, Loader2, Moon, Settings, Sun } from 'lucide-react';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { ActivePill } from './ActivePill';
import { fileName } from './desktop';
import { FOCUS, PRIMARY, slab, slabHover, slabText } from './ui';
import { originOf } from '@/lib/themeTransition';
import { MENU, type Phase, type Section } from './useDesktop';

const ICONS: Record<(typeof MENU)[number]['id'], React.FC<{ className?: string }>> = {
  inicio: Home,
  proyectos: Layers,
  guia: BookOpen,
  cuenta: UserRound,
  ajustes: Settings,
};

/** La planilla abierta (o abriéndose), para su lugar en el menú. */
const openedName = (phase: Phase) => {
  if (phase.kind === 'abriendo') return phase.name;
  if (phase.kind === 'uniendo') return `${phase.paths.length} planillas`;
  if (phase.kind !== 'listo') return null;
  if (phase.paths.length > 1) return phase.result.filename;
  return phase.opened.hoja ? `${fileName(phase.paths[0])} · ${phase.opened.hoja}` : fileName(phase.paths[0]);
};

/**
 * El menú de la izquierda: las pantallas (con su atajo), la planilla abierta, abrir otra y el cambio
 * rápido de tema claro / oscuro (se guarda; en Ajustes también está "como el sistema").
 */
export const Menu: React.FC<{
  section: Section;
  phase: Phase;
  busy: boolean;
  isDark: boolean;
  onSection: (s: Section) => void;
  onChoose: () => void;
  onToggleTheme: (from: { x: number; y: number }) => void;
}> = ({ section, phase, busy, isDark, onSection, onChoose, onToggleTheme }) => {
  const name = openedName(phase);
  const item = (active: boolean) =>
    `relative isolate flex w-full min-h-[44px] [@media(max-height:640px)]:min-h-[36px] items-center gap-3 rounded-mio-sm px-3 text-left text-[15px] font-bold transition-colors duration-150 cursor-pointer ${FOCUS} ${active ? 'text-white' : `${slabText(isDark)} ${slabHover(isDark)}`}`;
  return (
    <nav aria-label="Menú" className={`sticky top-3 flex h-[calc(100vh-1.5rem)] w-[232px] shrink-0 flex-col overflow-y-auto rounded-mio p-3 ${slab(isDark)}`}>
      {/* En una ventana baja (o con la app agrandada) todo se compacta; si igual no entra, el menú se desplaza por dentro. */}
      <div className="flex items-center justify-between px-3 pb-5 pt-2 [@media(max-height:640px)]:pb-2 [@media(max-height:640px)]:pt-0">
        <p className="font-climate text-2xl leading-none tracking-[0.06em]">MIO</p>
        {/* El MIO bot dice en qué anda la app: trabajando mientras analiza, en reposo si no. */}
        <MioPet2D mood={busy ? 'trabajando' : 'reposo'} size={40} showShadow={false} animated />
      </div>
      <ul className="space-y-1">
        {MENU.map((m, i) => {
          const Icon = ICONS[m.id];
          return (
            <li key={m.id}>
              <button type="button" onClick={() => onSection(m.id)} aria-current={section === m.id ? 'page' : undefined} className={item(section === m.id)}>
                {section === m.id && <ActivePill group="menu" className="rounded-mio-sm" />}
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                <span className="flex-1">{m.label}</span>
                <kbd className="font-mono text-[10px] font-medium opacity-60">⌘{i + 1}</kbd>
              </button>
            </li>
          );
        })}
      </ul>

      {name && (
        <div className="mt-6 [@media(max-height:640px)]:mt-2">
          <button type="button" onClick={() => onSection('analisis')} aria-current={section === 'analisis' ? 'page' : undefined} className={item(section === 'analisis')} title={name}>
            {section === 'analisis' && <ActivePill group="menu" className="rounded-mio-sm" />}
            {busy ? <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin" aria-hidden /> : <FileSpreadsheet className="h-[18px] w-[18px] shrink-0" aria-hidden />}
            <span className="min-w-0 flex-1 truncate">{name}</span>
          </button>
        </div>
      )}

      <div className="mt-auto space-y-2 pt-3 [@media(max-height:640px)]:space-y-1">
        <button
          type="button"
          onClick={onChoose}
          disabled={busy}
          className={`${PRIMARY} w-full justify-center [@media(max-height:640px)]:min-h-[44px]`}
        >
          <FolderOpen className="h-[18px] w-[18px]" aria-hidden /> Abrir planilla
        </button>
        <button
          type="button"
          onClick={(e) => onToggleTheme(originOf(e))}
          aria-label={isDark ? 'Pasar a tema claro' : 'Pasar a tema oscuro'}
          className={`flex w-full min-h-[44px] [@media(max-height:640px)]:min-h-[36px] items-center justify-center gap-2 rounded-full text-sm font-bold transition-colors duration-150 cursor-pointer ${slabText(isDark)} ${slabHover(isDark)} ${FOCUS}`}
        >
          {isDark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
          {isDark ? 'Tema claro' : 'Tema oscuro'}
        </button>
      </div>
    </nav>
  );
};
