import React from 'react';
import { useMioStore } from '@/utils/useMioStore';
import { FlipText } from '@/components/ui/FlipText';
import { SectionPlate } from '@/components/ui/SectionPlate';

const FAQ: { q: string; a: string }[] = [
  { q: '¿Qué pasa con mi planilla?', a: 'Sin sesión iniciada no se guarda nada: el análisis se hace en el momento. Si entrás con tu cuenta, se guarda el resultado del análisis en tus proyectos para que lo retomes.' },
  { q: '¿Cuánto cuesta?', a: 'Por ahora es gratis.' },
  { q: '¿Necesito saber de datos o programar?', a: 'No. Subís el Excel o el CSV como lo tenés y los resultados vienen en castellano, con el porqué de cada número.' },
  { q: '¿Y si mi planilla está desordenada?', a: 'Es lo normal. MIO acomoda fechas y montos, completa vacíos y, antes de analizar, te muestra cómo entendió cada columna para que lo confirmes.' },
  { q: '¿Sirve para mi rubro?', a: 'Sirve para cualquier planilla con fechas y un número a seguir: ventas, turnos, gastos. Cuanta más historia tenga, mejor predice.' },
  { q: '¿Qué tan preciso es?', a: 'Depende de tus datos. En nuestra prueba con 138.116 ventas de un comercio, el error fue de 13,5 % contra 17,0 % de repetir lo de ayer. En cada análisis te mostramos el margen de error.' },
  { q: '¿Qué archivos acepta?', a: 'Excel (.xlsx) y CSV.' },
  { q: '¿Quién está detrás?', a: 'Tadeo Muñoz Garcés y Milena Abraham, estudiantes de Ciencia de Datos en Rosario, Santa Fe.' },
];

export const FaqDOM: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  return (
    <section id="dudas" className="relative z-10 w-full py-24 sm:py-32 select-none">
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
        <div className="lg:col-span-5 lg:sticky lg:top-32 self-start">
          <SectionPlate index="07" label="DUDAS" className="mb-5" />
          <h2 className={`text-3xl sm:text-5xl font-bold tracking-[-0.035em] leading-[1.05] ${isDark ? 'text-white' : 'text-zinc-950'}`}>
            <FlipText>Lo que conviene saber antes de subir tu planilla.</FlipText>
          </h2>
        </div>
        <div className="lg:col-span-7">
          {FAQ.map((f) => (
            <details
              key={f.q}
              className={`group border-t last:border-b ${isDark ? 'border-white/10' : 'border-zinc-300'}`}
            >
              <summary className={`flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg sm:text-xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                {f.q}
                <span aria-hidden className="font-mono text-xl text-[#7647eb] dark:text-[#a78bfa] transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <p className={`pb-6 pr-8 text-base sm:text-lg leading-relaxed max-w-2xl ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FaqDOM;
