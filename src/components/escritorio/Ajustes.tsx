import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, FolderSearch, Home, Monitor, Moon, Play, ShieldCheck, Sun, Trash2, Waves } from 'lucide-react';
import { originOf } from '@/lib/themeTransition';
import { FONDOS, type FondoKind } from '@/components/canvas/Fondo';
import { Segmented } from './Segmented';
import { desktop, size } from './desktop';
import { ZOOMS, type Motion, type OnOpen, type Zoom } from './usePreferences';
import type { ThemeMode } from './useTheme';
import { DANGER, LINK, muted, soft, surface } from './ui';

/** Un grupo de ajustes: su nombre a la izquierda y sus ajustes a la derecha, en un solo bloque. */
const Group: React.FC<{ title: string; text: string; isDark: boolean; children: React.ReactNode }> = ({ title, text, isDark, children }) => (
  <section className={`grid grid-cols-1 gap-6 rounded-mio p-6 sm:p-8 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-10 ${surface(isDark)}`}>
    <div>
      <h2 className="text-xl font-extrabold tracking-[-0.02em]">{title}</h2>
      <p className={`mt-1.5 text-[14px] leading-relaxed ${muted(isDark)}`}>{text}</p>
    </div>
    <div className="space-y-7">{children}</div>
  </section>
);

/** Un ajuste: qué es y, al lado o debajo, cómo cambiarlo. */
const Setting: React.FC<{ title: string; text?: React.ReactNode; isDark: boolean; children?: React.ReactNode }> = ({ title, text, isDark, children }) => (
  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between xl:gap-8">
    <div className="min-w-0">
      <h3 className="text-[16px] font-bold">{title}</h3>
      {text && <div className={`mt-1 max-w-xl text-[14px] leading-relaxed ${muted(isDark)}`}>{text}</div>}
    </div>
    {children && <div className="shrink-0">{children}</div>}
  </div>
);

/**
 * Ajustes de la app de escritorio: cómo se ve (tema, tamaño, movimiento), qué abre al arrancar, los
 * proyectos guardados (dónde están, cuánto ocupan, borrarlos), ir a "Tus datos", la ayuda y la
 * versión. Cada cambio se guarda al tocarlo.
 */
export const Ajustes: React.FC<{
  isDark: boolean;
  themeMode: ThemeMode;
  onThemeMode: (m: ThemeMode, from: { x: number; y: number }) => void;
  zoom: Zoom;
  onZoom: (z: Zoom) => void;
  motion: Motion;
  fondo: FondoKind;
  onFondo: (f: FondoKind) => void;
  onMotion: (m: Motion) => void;
  onOpen: OnOpen;
  onOnOpen: (o: OnOpen) => void;
  projects: number;
  onClearProjects: () => Promise<void>;
  onTour: () => void;
  onGuide: () => void;
  /** Ir a "Tus datos". */
  onData: () => void;
}> = (p) => {
  const { isDark } = p;
  const [folder, setFolder] = useState('');
  const [version, setVersion] = useState('');
  const [bytes, setBytes] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    desktop.projectsFolder().then(setFolder).catch(() => setFolder(''));
    desktop.version().then(setVersion).catch(() => setVersion(''));
  }, []);
  useEffect(() => {
    desktop.projectsSize().then(setBytes).catch(() => setBytes(null));
  }, [p.projects]);

  const clear = async () => {
    await p.onClearProjects();
    setConfirming(false);
  };

  return (
    <div className="space-y-2.5 sm:space-y-3">
      <h1 className={`rounded-mio p-6 text-4xl font-extrabold tracking-[-0.04em] sm:px-8 ${surface(isDark)}`}>Ajustes</h1>

      <Group title="Apariencia" text="Cómo se ve la app. Se guarda en esta compu." isDark={isDark}>
        <Setting title="Tema" text="Como la compu sigue el modo claro u oscuro del sistema." isDark={isDark}>
          <Segmented
            label="Tema"
            group="tema"
            value={p.themeMode}
            isDark={isDark}
            onChange={(m, e) => p.onThemeMode(m, originOf(e))}
            options={[{ id: 'claro', label: 'Claro', icon: Sun }, { id: 'oscuro', label: 'Oscuro', icon: Moon }, { id: 'sistema', label: 'Como la compu', icon: Monitor }]}
          />
        </Setting>
        <Setting title="Tamaño" text={<>Todo lo de la ventana, texto y gráficos. También con <kbd className="font-mono">⌘+</kbd>, <kbd className="font-mono">⌘−</kbd> y <kbd className="font-mono">⌘0</kbd>.</>} isDark={isDark}>
          <Segmented label="Tamaño" group="zoom" value={p.zoom} isDark={isDark} onChange={p.onZoom} options={ZOOMS.map((z) => ({ id: z, label: `${Math.round(z * 100)} %` }))} />
        </Setting>
        <Setting title="Fondo" text="Todos se adaptan al tema claro y al oscuro. Lo ves cambiar detrás al elegir." isDark={isDark}>
          <Segmented label="Fondo" group="fondo" value={p.fondo} isDark={isDark} onChange={p.onFondo} options={(Object.keys(FONDOS) as FondoKind[]).map((id) => ({ id, label: FONDOS[id].label }))} />
        </Setting>
        <Setting title="Movimiento" text="Reducido apaga las animaciones y las transiciones, aunque la compu no lo pida." isDark={isDark}>
          <Segmented label="Movimiento" group="movimiento" value={p.motion} isDark={isDark} onChange={p.onMotion} options={[{ id: 'sistema', label: 'Como la compu', icon: Monitor }, { id: 'reducido', label: 'Reducido', icon: Waves }]} />
        </Setting>
      </Group>

      <Group title="Al abrir" text="Qué ves cuando arrancás la app." isDark={isDark}>
        <Setting title="Empezar en" text="El último proyecto se abre de lo guardado, sin volver a calcular si la planilla no cambió." isDark={isDark}>
          <Segmented label="Empezar en" group="al-abrir" value={p.onOpen} isDark={isDark} onChange={p.onOnOpen} options={[{ id: 'inicio', label: 'Inicio', icon: Home }, { id: 'ultimo', label: 'El último proyecto', icon: FolderSearch }]} />
        </Setting>
      </Group>

      <Group title="Proyectos" text="Cada planilla analizada queda guardada con su análisis." isDark={isDark}>
        <Setting
          title="Dónde están"
          text={folder ? <span className="block truncate font-mono text-[12px]" title={folder}>{folder}</span> : 'En la carpeta de datos de la app.'}
          isDark={isDark}
        >
          <button type="button" onClick={() => desktop.reveal(folder)} disabled={!folder} className={soft(isDark)}>
            <FolderSearch className="h-4 w-4" aria-hidden /> Mostrar la carpeta
          </button>
        </Setting>
        <Setting
          title="Borrar todos"
          text={<>{p.projects === 1 ? 'Un proyecto' : `${p.projects} proyectos`}{bytes != null && ` · ${size(bytes)}`}. Tus planillas no se tocan: se pueden volver a analizar.</>}
          isDark={isDark}
        >
          {confirming ? (
            <span className="inline-flex items-center gap-2 text-sm font-bold">
              <button type="button" onClick={clear} className={DANGER}>Sí, borrar todos</button>
              <button type="button" onClick={() => setConfirming(false)} className={soft(isDark)}>No</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} disabled={p.projects === 0} className={soft(isDark)}>
              <Trash2 className="h-4 w-4" aria-hidden /> Borrar proyectos
            </button>
          )}
        </Setting>
      </Group>

      <Group title="Privacidad" text="Tus planillas no salen de esta compu." isDark={isDark}>
        <Setting title="Tus datos" text="Qué queda acá, lo único que sale (tu cuenta) y el registro de errores." isDark={isDark}>
          <button type="button" onClick={p.onData} className={soft(isDark)}>
            <ShieldCheck className="h-4 w-4" aria-hidden /> Ver tus datos <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </Setting>
      </Group>

      <Group title="Ayuda" text={version ? `MIO para escritorio ${version}.` : 'MIO para escritorio.'} isDark={isDark}>
        <Setting title="Recorrido" text="Los cinco pasos, de nuevo, uno por vez." isDark={isDark}>
          <span className="inline-flex flex-wrap items-center gap-2">
            <button type="button" onClick={p.onTour} className={soft(isDark)}>
              <Play className="h-4 w-4" aria-hidden /> Hacer el recorrido
            </button>
            <button type="button" onClick={p.onGuide} className={LINK}>
              <BookOpen className="h-4 w-4" aria-hidden /> Guía y atajos
            </button>
          </span>
        </Setting>
      </Group>
    </div>
  );
};
