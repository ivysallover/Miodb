import React, { useEffect, useRef, useState } from 'react';
import { useMioStore } from '@/utils/useMioStore';
import { FlipText } from '@/components/ui/FlipText';
import { SectionPlate } from '@/components/ui/SectionPlate';
import { BubbleArrowButton } from '@/components/ui/BubbleArrowButton';
import { ScrollTrigger } from '@/lib/gsap';

interface Finding {
  tag: string;
  text: string;
}
interface Rubro {
  id: string;
  label: string;
  file: string;
  cols: string[];
  rows: string[][];
  flag: number;
  findings: Finding[];
}

/** Illustrative scenarios. Every figure here is demonstration data, labelled as such on the page. */
const RUBROS: Rubro[] = [
  {
    id: 'comercio',
    label: 'Comercio',
    file: 'ventas_ferreteria.xlsx',
    cols: ['Fecha','Producto','Cant.','Total'],
    rows: [['12/03','Tornillos x100','14','$18.400'],['12/03','Pintura 4 L','3','$41.200'],['13/03','Cinta aisladora','22','$9.900'],['14/03','Taladro 650 W','31','$184.200'],['14/03','Guantes','8','—'],['15/03','Pintura 4 L','2','$27.400']],
    flag: 3,
    findings: [
      { tag: 'SE SALIÓ DE LO NORMAL', text: 'El 14/03 vendiste $184.200, 3,1 veces lo habitual. ¿Fue una venta grande o un error de carga?' },
      { tag: 'QUÉ VIENE', text: 'Si seguís así, la semana próxima vendés entre $412.000 y $468.000.' },
      { tag: 'POR QUÉ', text: 'Los descuentos del 15 % no subieron las ventas: te bajaron el margen.' },
    ],
  },
  {
    id: 'gastronomia',
    label: 'Gastronomía',
    file: 'caja_restaurante.csv',
    cols: ['Fecha','Detalle','Cubiertos','Total'],
    rows: [['28/04','Miércoles noche','74','$412.300'],['29/04','Jueves noche','95','$528.900'],['30/04','Viernes noche','128','$701.400'],['01/05','Sábado noche','131','$724.800'],['02/05','Mesa evento','1','$96.500'],['03/05','Domingo mediodía','—','$388.200']],
    flag: 4,
    findings: [
      { tag: 'PATRÓN', text: 'Los jueves a la noche facturás 28 % más que los miércoles, pero comprás insumos igual para los dos.' },
      { tag: 'SE SALIÓ DE LO NORMAL', text: 'Una mesa de $96.500 el 2/05 es 4 veces tu ticket normal. Revisá si fue un evento.' },
      { tag: 'QUÉ VIENE', text: 'Para el finde largo, la proyección ronda entre 310 y 360 cubiertos.' },
    ],
  },
  {
    id: 'servicios',
    label: 'Servicios',
    file: 'turnos_consultorio.xlsx',
    cols: ['Fecha','Turno','Estado','Monto'],
    rows: [['Lun 06/05','09:00','Cancelado','—'],['Lun 06/05','10:00','Cancelado','—'],['Lun 06/05','11:00','Asistió','$18.000'],['Mar 07/05','09:00','Asistió','$18.000'],['Mar 07/05','10:00','Asistió','$18.000'],['Lun 13/05','09:00','Cancelado','—']],
    flag: 0,
    findings: [
      { tag: 'PATRÓN', text: 'Los lunes se cancelan 1 de cada 4 turnos.' },
      { tag: 'QUÉ VIENE', text: 'Sin cambios, el mes que viene entran entre 182 y 205 turnos.' },
      { tag: 'POR QUÉ', text: 'Los días con recordatorio por mensaje tienen menos ausencias.' },
    ],
  },
  {
    id: 'particular',
    label: 'Para mí',
    file: 'gastos_hogar.csv',
    cols: ['Fecha','Concepto','Categoría','Monto'],
    rows: [['03/05','Supermercado','Comida','$34.800'],['08/05','Subte y colectivo','Transporte','$9.600'],['12/05','Delivery','Comida','$58.300'],['15/05','Gimnasio','Salud','$21.000'],['19/05','Luz','Servicios','$17.450'],['24/05','Café','Comida','—']],
    flag: 2,
    findings: [
      { tag: 'SE SALIÓ DE LO NORMAL', text: 'En mayo el delivery se disparó: $58.300 contra $21.000 en un mes común.' },
      { tag: 'QUÉ VIENE', text: 'A este ritmo cerrás el mes con $14.000 menos de lo que planeaste.' },
      { tag: 'POR QUÉ', text: 'Lo que más explica la diferencia con otros meses es transporte.' },
    ],
  },
];

export const EjemploDOM: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const [active, setActive] = useState(0);
  const rubro = RUBROS[active];

  // Scroll-driven: on desktop the section pins and the scroll plays the diagnosis.
  // progress 0..1 -> a scanner walks down the sheet (0-0.35), lands on the odd row, then the findings appear one by one.
  const [progress, setProgress] = useState(1);
  const [pinned, setPinned] = useState(false);
  const secRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = secRef.current;
    if (!el) return;
    const wide = window.matchMedia('(min-width: 1024px)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!wide || reduce) return;
    setPinned(true);
    setProgress(0);
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: '+=200%',
      pin: true,
      anticipatePin: 1,
      scrub: true,
      onUpdate: (self) => setProgress(self.progress),
    });
    return () => {
      st.kill();
      setPinned(false);
      setProgress(1);
    };
  }, []);
  const total = rubro.rows.length;
  const scanning = progress < 0.35;
  const scanRow = Math.min(total - 1, Math.floor((progress / 0.35) * total));
  const flagOn = progress >= 0.35;
  const shown = (i: number) => progress >= 0.45 + i * 0.17;

  const goTry = (sample: boolean) => {
    try { localStorage.removeItem('mio_active_analysis'); } catch {}
    window.history.pushState({}, '', sample ? '/dashboard?new=1&sample=1' : '/dashboard?new=1');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const card = isDark ? 'bg-[#0e0d16] border-white/[0.08]' : 'bg-white border-zinc-200/80';
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-600';

  return (
    <section ref={secRef} id="ejemplo" className={`relative z-10 w-full select-none ${pinned ? 'min-h-[100dvh] flex items-center py-24' : 'py-24 sm:py-32'}`}>
      <div className="w-full">
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16">
        <div className="max-w-3xl mb-10 sm:mb-14">
          <SectionPlate index="03" label="UN EJEMPLO // DE LA PLANILLA AL DIAGNÓSTICO" className="mb-5" />
          <h2 className={`text-3xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.035em] leading-[1.05] ${isDark ? 'text-white' : 'text-zinc-950'}`}>
            <FlipText>Lo que MIO te cuenta de tus números.</FlipText>
          </h2>
          <p className={`mt-5 text-base sm:text-lg leading-relaxed ${muted}`}>
            Elegí un rubro y scrolleá: MIO recorre una planilla como las tuyas, con sus huecos y todo, y te cuenta lo que encuentra.
          </p>
        </div>

        <div role="tablist" aria-label="Rubro del ejemplo" className="flex flex-wrap gap-2 mb-8">
          {RUBROS.map((r, i) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={i === active}
              type="button"
              onClick={() => setActive(i)}
              className={`min-h-[44px] px-5 rounded-full text-sm font-medium border transition-colors duration-200 cursor-pointer active:scale-[0.97] ${
                i === active
                  ? 'bg-[#7647eb] border-[#7647eb] text-white'
                  : isDark
                  ? 'border-white/15 text-zinc-300 hover:border-white/30'
                  : 'border-zinc-300 text-zinc-700 hover:border-zinc-500'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          <figure className={`lg:col-span-5 rounded-mio border overflow-hidden flex flex-col ${card}`}>
            <figcaption className={`flex items-center justify-between px-4 py-2.5 border-b font-mono text-[11px] uppercase tracking-wider ${isDark ? 'border-white/[0.08] text-zinc-300' : 'border-zinc-200 text-zinc-600'}`}>
              <span>{rubro.file}</span>
              <span className="text-zinc-500">Tu planilla</span>
            </figcaption>
            <div className="flex-1 overflow-x-auto p-3 sm:p-4">
              <table className="w-full min-w-[420px] border-collapse font-mono text-[12px] sm:text-[13px]">
                <thead>
                  <tr>
                    {rubro.cols.map((c) => (
                      <th key={c} className={`px-3 py-2.5 text-left font-bold uppercase tracking-wider text-[11px] border-b ${isDark ? 'border-white/15 text-zinc-300 bg-white/[0.04]' : 'border-zinc-300 text-zinc-700 bg-zinc-100'}`}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rubro.rows.map((row, ri) => (
                    <tr key={ri} className={`transition-colors duration-200 ${ri === rubro.flag && flagOn ? 'bg-[#bdf559]/40' : scanning && pinned && ri === scanRow ? (isDark ? 'bg-[#7647eb]/30' : 'bg-[#7647eb]/15') : ''}`}>
                      {row.map((cell, ci) => (
                        <td key={ci} className={`px-3 py-2.5 border-b ${isDark ? 'border-white/[0.08] text-zinc-200' : 'border-zinc-200 text-zinc-800'} ${cell === '—' ? 'text-zinc-400' : ''} ${ri === rubro.flag && flagOn ? 'font-bold' : ''}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 px-1 font-mono text-[11px] text-zinc-500">
                <span className="inline-block w-2.5 h-2.5 bg-[#bdf559] align-middle mr-1.5" />
                MIO recorre la planilla y marca la fila fuera de lo normal.
              </p>
            </div>
          </figure>

          <div className="lg:col-span-7 grid gap-4 content-start">
            {rubro.findings.map((f, i) => (
              <article key={`${rubro.id}-${i}`} className={`rounded-mio border p-5 sm:p-6 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${card} ${!pinned || shown(i) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="flex items-center gap-3 mb-2.5">
                  <span className="inline-flex w-7 h-7 items-center justify-center bg-[#7647eb] text-white font-mono text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#7647eb] dark:text-[#a78bfa]">{f.tag}</span>
                </div>
                <p className={`text-lg sm:text-xl leading-snug font-medium ${isDark ? 'text-white' : 'text-zinc-950'}`}>{f.text}</p>
              </article>
            ))}
            <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
              Ejemplo ilustrativo con datos de demostración, no son clientes reales.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-5">
          <BubbleArrowButton size="lg" variant="primary" onClick={() => goTry(false)}>
            Probar con mi planilla
          </BubbleArrowButton>
          <button
            type="button"
            onClick={() => goTry(true)}
            className={`text-sm font-medium underline underline-offset-4 decoration-1 cursor-pointer ${isDark ? 'text-zinc-300 hover:text-white' : 'text-zinc-700 hover:text-zinc-950'}`}
          >
            o probá con datos de ejemplo
          </button>
        </div>
      </div>
      </div>
    </section>
  );
};

export default EjemploDOM;
