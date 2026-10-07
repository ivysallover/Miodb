import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { Block, ChartBlock, H2, NoteBody, type Tone } from './blocks';
import { anomalyInsight, buildModel, chartEntries, forecastInsight, kindOf, pickFeatured, tidy, type Insight } from './insights';

/**
 * "Presentar": the analysis one idea per screen, for a meeting or a call. Same model and same
 * charts as the dashboard; arrows, space or the buttons move through it, Esc leaves.
 */

interface Props { result: any; isDark: boolean; onClose: () => void }

const NOTE_TONES: Tone[] = ['lav', 'ink', 'violet', 'mute'];

export const Presentar: React.FC<Props> = ({ result, isDark, onClose }) => {
  const root = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const [full, setFull] = useState(false);
  const filename = String(result?.filename || 'Tu planilla');

  const slides = useMemo(() => {
    const m = buildModel(result);
    const out: { key: string; label: string; node: React.ReactNode }[] = [];
    const meta = [m.nRows != null && `${m.nRows.toLocaleString('es-AR')} filas`, m.nCols != null && `${m.nCols} columnas`].filter(Boolean).join(' · ');

    const chartSlide = (key: string, chart: any, kicker: string, title: string, insight: Insight, noteKicker: string, tone: Tone) => (
      <>
        <ChartBlock span={8} chart={chart} id={`slide-${key}`} kicker={kicker} title={title} isDark={isDark} minH={300} className="lg:h-full" />
        <Block span={4} tone={tone} kicker={noteKicker} isDark={isDark} className="lg:h-full lg:overflow-y-auto">
          <NoteBody insight={insight} tone={tone} isDark={isDark} size={insight.rank.length ? 'md' : 'lg'} hint={kindOf(chart).hint} fit />
        </Block>
      </>
    );

    // Cover: what MIO found
    const tones: Tone[] = ['lav', 'ink', 'mute'];
    out.push({
      key: 'cover',
      label: 'Resumen',
      node: (
        <>
          <Block span={5} tone="violet" kicker="Análisis de tu planilla" isDark={isDark} className="lg:h-full">
            <h1 className="text-4xl font-extrabold leading-[1.02] tracking-[-0.04em] [overflow-wrap:anywhere] sm:text-5xl xl:text-6xl">{filename}</h1>
            {meta && <p className="mt-4 font-mono text-xs uppercase tracking-wider text-white/70">{meta}</p>}
            <div className="mt-auto flex items-end justify-between gap-4 pt-8">
              <p className="max-w-[16rem] text-sm leading-relaxed text-white/80">Lo que sigue sale de tus datos. Pasá con las flechas del teclado o los botones de arriba.</p>
              <MioPet2D mood="celebrando" size={132} showShadow={false} animated={true} />
            </div>
          </Block>
          <div className="flex min-h-0 flex-col gap-2.5 sm:gap-3 lg:col-span-7 lg:h-full">
            {m.findings.length > 0
              ? m.findings.map((f, i) => {
                  const strong = tones[i] === 'ink' || isDark;
                  return (
                    <Block key={i} span={12} tone={tones[i]} kicker={f.tag} isDark={isDark} className="flex-1 justify-center">
                      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                        {f.big && <p className={`font-extrabold leading-none tracking-[-0.045em] text-5xl xl:text-6xl ${strong ? (tones[i] === 'mute' ? 'text-[#a78bfa]' : 'text-[#bdf559]') : 'text-[#7647eb]'}`}>{f.big}</p>}
                        <p className="min-w-[14rem] flex-1 text-xl font-bold leading-[1.18] tracking-[-0.02em] xl:text-2xl">{f.text}</p>
                      </div>
                    </Block>
                  );
                })
              : (
                <Block span={12} tone="mute" kicker="Resumen" isDark={isDark} className="flex-1 justify-center">
                  <p className="text-2xl font-bold">MIO procesó la planilla, pero no encontró nada para destacar con estos datos.</p>
                </Block>
              )}
          </div>
        </>
      ),
    });

    const fIns = forecastInsight(m);
    if (m.fChart && fIns) out.push({ key: 'forecast', label: 'Qué viene', node: chartSlide('forecast', m.fChart, 'Qué viene', tidy(m.fChart.metadata?.title || 'Predicción'), fIns, m.fLocal ? 'Proyección simple' : 'La estimación', 'violet') });

    // One screen per idea: only the charts with the most to tell make it to the talk.
    pickFeatured(chartEntries(m)).featured.forEach((e, i) => {
      out.push({ key: e.key, label: e.kicker, node: chartSlide(e.key, e.chart, e.kicker, e.title, e.insight, 'En una frase', NOTE_TONES[i % NOTE_TONES.length]) });
    });

    const aIns = anomalyInsight(m);
    if (m.aChart && aIns && m.oddCount > 0) {
      out.push({
        key: 'anomalies',
        label: 'Para revisar',
        node: m.aPlottable
          ? chartSlide('anomalies', m.aChart, 'Para revisar', tidy(m.aChart.metadata?.title || 'Registros fuera de lo normal'), aIns, 'Fuera de lo normal', 'ink')
          : (
            <Block span={12} tone="ink" kicker="Para revisar" isDark={isDark} className="lg:h-full">
              <div className="flex max-w-4xl flex-1 flex-col justify-center">
                <NoteBody insight={aIns} tone="ink" isDark={isDark} size="lg" />
              </div>
            </Block>
          ),
      });
    }

    if (m.steps.length) {
      out.push({
        key: 'steps',
        label: 'Qué hacer ahora',
        node: (
          <Block span={12} tone="violet" kicker="Qué hacer ahora" isDark={isDark} className="lg:h-full">
            <h2 className="text-4xl font-extrabold leading-[1.02] tracking-[-0.04em] sm:text-5xl xl:text-6xl">{['Una cosa', 'Dos cosas', 'Tres cosas'][m.steps.length - 1]} para hacer con esto.</h2>
            <ol className={`mt-8 grid flex-1 gap-2.5 sm:gap-3 ${m.steps.length === 3 ? 'lg:grid-cols-3' : m.steps.length === 2 ? 'lg:grid-cols-2' : ''}`}>
              {m.steps.map((s, i) => {
                const few = m.steps.length < 3;
                return (
                  <li key={i} className={`flex rounded-mio-sm bg-white/[0.1] p-6 xl:p-8 ${few ? 'flex-col justify-center gap-5 lg:flex-row lg:items-center lg:justify-start lg:gap-10' : 'flex-col'}`}>
                    <span aria-hidden className={`font-extrabold leading-none tracking-[-0.05em] text-[#bdf559] ${few ? 'text-8xl xl:text-9xl' : 'text-7xl xl:text-8xl'}`}>{i + 1}</span>
                    <div className={few ? 'max-w-3xl' : 'mt-auto pt-6'}>
                      <p className={`font-bold leading-[1.1] tracking-[-0.025em] ${few ? 'text-3xl xl:text-5xl' : 'text-2xl xl:text-3xl'}`}>{s.title}</p>
                      <p className={`mt-3 leading-relaxed text-white/80 ${few ? 'text-lg xl:text-xl' : 'text-base xl:text-lg'}`}>{s.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Block>
        ),
      });
    }
    return out;
  }, [result, isDark, filename]);

  const last = slides.length - 1;
  const go = useCallback((d: number) => setAt((i) => Math.max(0, Math.min(last, i + d))), [last]);

  const toggleFull = useCallback(() => {
    try {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else root.current?.requestFullscreen?.().catch(() => {});
    } catch { /* fullscreen is a nicety: the slides work without it */ }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); go(1); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(-1); }
      else if (e.key === 'Home') setAt(0);
      else if (e.key === 'End') setAt(last);
      else if (e.key === 'f' || e.key === 'F') toggleFull();
      else if (e.key === 'Escape' && !document.fullscreenElement) onClose();
    };
    const onFull = () => setFull(!!document.fullscreenElement);
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFull);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFull);
      document.body.style.overflow = prev;
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [go, last, onClose, toggleFull]);

  // A finger swipe moves between slides, unless it starts on a chart (charts pan with the finger).
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const onChart = (e.target as HTMLElement).closest?.('[data-chart-title]');
    touch.current = onChart ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  };

  const ctl = `min-h-[40px] rounded-full px-4 font-mono text-xs font-bold transition-colors duration-200 cursor-pointer disabled:cursor-default disabled:opacity-30 ${
    isDark ? 'bg-white/[0.08] text-white hover:bg-white/[0.16]' : 'bg-white text-zinc-900 hover:bg-[#e4dcff]'
  }`;
  const slide = slides[at];

  return createPortal(
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={`Presentación de ${filename}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={`fixed inset-0 z-[80] flex flex-col ${isDark ? 'dark bg-[#07070a] text-zinc-100' : 'bg-[#f3f3f5] text-zinc-950'}`}
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-3 sm:px-6">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="flex items-baseline gap-1.5 font-mono text-sm font-bold">MIO<span className="h-1.5 w-1.5 rounded-full bg-[#bdf559]" /></span>
          <span className={`truncate font-mono text-[11px] uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{slide.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="mr-1 font-mono text-xs font-bold tabular-nums" aria-live="polite">
            {String(at + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
          </span>
          <button type="button" className={ctl} onClick={() => go(-1)} disabled={at === 0} aria-label="Anterior">←</button>
          <button type="button" className={`${ctl} !bg-[#7647eb] !text-white hover:!bg-[#602cd1]`} onClick={() => go(1)} disabled={at === last} aria-label="Siguiente">→</button>
          <button type="button" className={`${ctl} hidden sm:block`} onClick={toggleFull}>{full ? 'Salir de pantalla completa' : 'Pantalla completa'}</button>
          <button type="button" className={ctl} onClick={onClose}>Cerrar</button>
        </div>
      </header>

      <div key={slide.key} className="mio-slide grid min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-y-auto px-4 pb-4 sm:gap-3 sm:px-6 lg:grid-cols-12 lg:grid-rows-1 lg:overflow-hidden">
        {slide.node}
      </div>

      <div className={`h-1 shrink-0 ${isDark ? 'bg-white/10' : 'bg-zinc-950/10'}`} aria-hidden>
        <div className="h-full bg-[#7647eb] transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]" style={{ width: `${((at + 1) / slides.length) * 100}%` }} />
      </div>
    </div>,
    document.body,
  );
};

export default Presentar;
