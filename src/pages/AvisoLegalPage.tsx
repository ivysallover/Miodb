import React from 'react';
import { LegalPageShell, LegalSectionItem } from '@/components/dom/LegalPageShell';
import { Scale, Users, MapPin, Mail, Sparkles } from 'lucide-react';

const SECTIONS: LegalSectionItem[] = [
  { id: 'sec-1', title: 'Titularidad del Sitio' },
  { id: 'sec-2', title: 'Domicilio Legal' },
  { id: 'sec-3', title: 'Representación & Fundadores' },
  { id: 'sec-4', title: 'Canales de Contacto' },
  { id: 'sec-5', title: 'Objeto de la Plataforma' },
  { id: 'sec-6', title: 'Propiedad Intelectual' },
  { id: 'sec-7', title: 'Ley Aplicable & Jurisdicción' },
  { id: 'sec-8', title: 'Transparencia Algorítmica' },
  { id: 'sec-9', title: 'Órgano de Control (AAIP)' },
];

export const AvisoLegalPage: React.FC = () => {
  return (
    <LegalPageShell
      title="Aviso Legal e Identidad Corporativa"
      subtitle="Datos identificatorios de MIO Technologies, domicilio societario, representación legal y directivas de transparencia algorítmica."
      category="TRANSPARENCIA CORPORATIVA // MIO 2026"
      lastUpdated="Septiembre 2026"
      sections={SECTIONS}
    >
      {/* Founders & Location Double-Bezel Card */}
      <div className="p-1 rounded-3xl bg-black/[0.04] dark:bg-white/[0.05] ring-1 ring-black/[0.06] dark:ring-white/10">
        <div className="p-6 rounded-[calc(1.5rem-2px)] bg-white dark:bg-[#0e0c19] text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 space-y-3">
          <div className="flex items-center gap-2 text-zinc-950 dark:text-white font-bold">
            <Users className="w-4 h-4 text-[#7647eb] dark:text-[#bdf559]" />
            <span>Fundación y Sede Corporativa:</span>
          </div>
          <p>
            Plataforma concebida, desarrollada y operada por <strong>Tadeo Muñoz Garcés &amp; Milena Abraham</strong> desde la Ciudad de Rosario, Provincia de Santa Fe, República Argentina.
          </p>
        </div>
      </div>

      {/* Section 1 */}
      <section id="sec-1" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          01 // RAZÓN SOCIAL
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          1. Titularidad del sitio web
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          El presente sitio web y los motores de AutoML en la nube son operados por <strong>MIO Technologies</strong>, con domicilio legal en la República Argentina.
        </p>
      </section>

      {/* Section 2 */}
      <section id="sec-2" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          <span>02 // DOMICILIO</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          2. Domicilio legal
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Ciudad de Rosario, Provincia de Santa Fe, República Argentina (Coordenadas geográficas: 32°57′S 60°39′O).
        </p>
      </section>

      {/* Section 3 */}
      <section id="sec-3" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          03 // EQUIPO DIRECTIVO
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          3. Representante legal y Fundadores
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Fundadores y directores de producto: <strong>Tadeo Muñoz Garcés &amp; Milena Abraham</strong>.
        </p>
      </section>

      {/* Section 4 */}
      <section id="sec-4" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" />
          <span>04 // CONTACTO</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          4. Contacto
        </h2>
        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
          <li>Asuntos legales corporativos:{' '}
            <a href="mailto:legal@mio.app" className="underline font-semibold text-[#7647eb] dark:text-[#a78bfa]">
              legal@mio.app
            </a>
          </li>
          <li>Privacidad y protección de datos:{' '}
            <a href="mailto:privacidad@mio.app" className="underline font-semibold text-[#7647eb] dark:text-[#a78bfa]">
              privacidad@mio.app
            </a>
          </li>
        </ul>
      </section>

      {/* Section 5 */}
      <section id="sec-5" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          05 // NATURALEZA
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          5. Objeto del sitio
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          El sitio tiene por objeto ofrecer una plataforma SaaS de análisis de datos y Automated Machine Learning (AutoML), brindando herramientas para que los usuarios puedan cargar sus datasets, tipificarlos y obtener diagnósticos probabilísticos cuantitativos.
        </p>
      </section>

      {/* Section 6 */}
      <section id="sec-6" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          06 // ACTIVOS
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          6. Propiedad intelectual
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Todo el software, diseños de interfaz, shaders WebGL, marcas registradas, nombres comerciales, logotipos, textos, algoritmos y códigos fuente contenidos en la plataforma son propiedad exclusiva de MIO Technologies o sus licenciantes legítimos.
        </p>
      </section>

      {/* Section 7 */}
      <section id="sec-7" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          07 // JURISDICCIÓN
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          7. Ley aplicable y jurisdicción
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Este Aviso Legal y todas las relaciones jurídicas que de él se deriven se regirán de conformidad con las leyes de la República Argentina. Toda controversia será dirimida en los Tribunales Ordinarios de la Ciudad de Rosario, Provincia de Santa Fe.
        </p>
      </section>

      {/* Section 8 */}
      <section id="sec-8" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>08 // TRANSPARENCIA IA</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          8. Auditoría y transparencia algorítmica
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          MIO asume un compromiso ético hacia el desarrollo de Inteligencia Artificial explicable. Operamos alineados con los estándares internacionales de la EU AI Act, asegurando trazabilidad y métricas de interpretabilidad (SHAP / Gini) en cómo nuestros algoritmos de AutoML infieren resultados.
        </p>
      </section>

      {/* Section 9 */}
      <section id="sec-9" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          09 // AUTORIDAD DE CONTROL
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          9. Órgano de control (AAIP)
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          En Argentina, la Agencia de Acceso a la Información Pública (AAIP) es el órgano de control encargado de la aplicación y supervisión de la Ley N° 25.326 de Protección de Datos Personales.
        </p>
      </section>
    </LegalPageShell>
  );
};

export default AvisoLegalPage;
