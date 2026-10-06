import React from 'react';
import { LegalPageShell, LegalSectionItem } from '@/components/dom/LegalPageShell';
import { Building2, Shield, Lock } from 'lucide-react';

const SECTIONS: LegalSectionItem[] = [
  { id: 'sec-1', title: 'Partes Vinculadas' },
  { id: 'sec-2', title: 'Objeto del Tratamiento' },
  { id: 'sec-3', title: 'Naturaleza de Datos' },
  { id: 'sec-4', title: 'Vigencia y Duración' },
  { id: 'sec-5', title: 'Obligaciones de MIO' },
  { id: 'sec-6', title: 'Sub-procesadores Autorizados' },
  { id: 'sec-7', title: 'Transferencias Internacionales' },
  { id: 'sec-8', title: 'Notificación de Brechas' },
  { id: 'sec-9', title: 'Derecho de Auditoría' },
  { id: 'sec-10', title: 'Responsabilidad' },
  { id: 'sec-11', title: 'Ley Aplicable' },
  { id: 'sec-12', title: 'Contacto Legal' },
];

export const DpaPage: React.FC = () => {
  return (
    <LegalPageShell
      title="Acuerdo de Procesamiento de Datos (DPA)"
      subtitle="Data Processing Addendum estándar para clientes corporativos (B2B) que procesan activos de información mediante el pipeline de MIO Technologies."
      category="CONTRATO B2B // RGPD ART. 28 · LEY 25.326"
      lastUpdated="Septiembre 2026"
      sections={SECTIONS}
    >
      {/* Intro B2B Card */}
      <div className="p-1 rounded-mio bg-[#7647eb]/10 ring-1 ring-[#7647eb]/20">
        <div className="p-6 rounded-[calc(1.5rem-2px)] bg-[#7647eb]/[0.05] text-sm leading-relaxed text-zinc-900 dark:text-zinc-100 space-y-2">
          <div className="font-bold flex items-center gap-2 text-[#7647eb] dark:text-[#a78bfa]">
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Ámbito de Aplicación Corporativo:</span>
          </div>
          <p className="text-zinc-700 dark:text-zinc-300">
            Este Acuerdo de Procesamiento de Datos rige para clientes B2B (empresas e instituciones) que procesan datos comerciales o de terceros mediante nuestra infraestructura de cómputo en la nube.
          </p>
        </div>
      </div>

      {/* Section 1 */}
      <section id="sec-1" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          01 // PARTES
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          1. Partes
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Este acuerdo vincula al <strong>Cliente</strong> (en adelante el Controlador de Datos) y a <strong>MIO Technologies</strong> (en adelante el Procesador de Datos).
        </p>
      </section>

      {/* Section 2 */}
      <section id="sec-2" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          02 // OBJETO
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          2. Objeto
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          El presente acuerdo regula las condiciones bajo las cuales el Procesador tratará datos en nombre del Controlador, específicamente mediante el procesamiento de datasets subidos a la plataforma MIO para la realización de análisis estadísticos y tareas de AutoML.
        </p>
      </section>

      {/* Section 3 */}
      <section id="sec-3" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          03 // ALCANCE
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          3. Datos tratados
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Los datos objeto del tratamiento corresponden a archivos en formato CSV, XLSX, JSON y/u otros formatos estructurados que contienen datos operativos, comerciales o analíticos de los negocios del Cliente.
        </p>
      </section>

      {/* Section 4 */}
      <section id="sec-4" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          04 // VIGENCIA
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          4. Duración
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Este DPA permanecerá vigente durante todo el tiempo que se mantenga activa la relación contractual entre las partes o mientras el Procesador mantenga el acceso a datos del Controlador.
        </p>
      </section>

      {/* Section 5 */}
      <section id="sec-5" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          05 // OBLIGACIONES
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          5. Obligaciones de MIO como Procesador
        </h2>
        <ol className="space-y-2.5 text-sm text-zinc-600 dark:text-zinc-300 list-decimal list-inside">
          <li><strong>Procesar los datos únicamente siguiendo las instrucciones documentadas</strong> del Controlador.</li>
          <li><strong>Garantizar la confidencialidad</strong> de todo el personal involucrado en la operación del pipeline.</li>
          <li><strong>Implementar medidas de seguridad técnicas</strong> de vanguardia (TLS 1.3, aislamiento en memoria RAM).</li>
          <li><strong>Garantía de No Entrenamiento (Zero-Training AI Guarantee):</strong> MIO garantiza formalmente que ningún dato, dataset o consulta será empleado para entrenar modelos fundacionales de IA públicos o de terceros.</li>
          <li><strong>Arquitectura de Cero Almacenamiento en Disco (Zero-Disk Architecture):</strong> Todo procesamiento se efectúa en memoria volátil efímera sin persistencia en discos físicos del servidor.</li>
          <li><strong>Asistir al Controlador</strong> técnica y operativamente para dar respuesta a solicitudes de Derechos ARCO.</li>
          <li><strong>Eliminar de manera irrevocable</strong> todos los datos tras finalizar el análisis o contrato.</li>
        </ol>
      </section>

      {/* Section 6 — Table */}
      <section id="sec-6" className="scroll-mt-24 space-y-4 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          06 // SUB-PROCESADORES
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          6. Sub-procesadores autorizados
        </h2>

        <div className="overflow-x-auto rounded-mio border border-black/[0.08] dark:border-white/10 shadow-sm">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                <th className="p-3.5 font-mono font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">Sub-procesador</th>
                <th className="p-3.5 font-mono font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">Uso y Finalidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06] text-zinc-600 dark:text-zinc-300">
              <tr>
                <td className="p-3.5 font-semibold text-zinc-950 dark:text-white">Google Cloud / Firebase</td>
                <td className="p-3.5">Autenticación, bases de datos y seguridad de almacenamiento (global).</td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold text-zinc-950 dark:text-white">Google LLC (Gemini API)</td>
                <td className="p-3.5">Generación narrativa (sólo metadatos estadísticos agregados, jamás filas crudas).</td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold text-zinc-950 dark:text-white">Render Services Inc.</td>
                <td className="p-3.5">Servidores y despliegue del pipeline analítico backend (EE.UU.).</td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold text-zinc-950 dark:text-white">Vercel Inc.</td>
                <td className="p-3.5">Distribución y red de entrega de contenidos (CDN) del frontend (EE.UU.).</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 7 */}
      <section id="sec-7" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          07 // TRANSFERENCIAS
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          7. Transferencias internacionales
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Cualquier transferencia de datos personales a terceros países se llevará a cabo bajo las correspondientes Cláusulas Contractuales Tipo (SCCs) o marcos de adecuación legal vigentes.
        </p>
      </section>

      {/* Section 8 */}
      <section id="sec-8" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          08 // SEGURIDAD
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          8. Notificación de brechas
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          En caso de producirse un incidente de seguridad que comprometa datos del Controlador, MIO lo notificará formalmente en un plazo no mayor a 72 horas desde su confirmación técnica.
        </p>
      </section>

      {/* Section 9 */}
      <section id="sec-9" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          09 // CONTROL
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          9. Auditoría
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          El Cliente retiene la facultad de solicitar auditorías sobre los estándares técnicos y de gobernanza implementados por MIO Technologies.
        </p>
      </section>

      {/* Section 10 */}
      <section id="sec-10" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          10 // RESPONSABILIDAD
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          10. Responsabilidad
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Las limitaciones de responsabilidad fijadas en los Términos y Condiciones generales aplicarán supletoriamente al presente acuerdo.
        </p>
      </section>

      {/* Section 11 */}
      <section id="sec-11" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          11 // JURISDICCIÓN
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          11. Ley aplicable y Jurisdicción
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          República Argentina. Jurisdicción exclusiva: Tribunales Ordinarios de la Ciudad de Rosario, Provincia de Santa Fe.
        </p>
      </section>

      {/* Section 12 */}
      <section id="sec-12" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          12 // COMUNICACIÓN
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          12. Contacto
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Para notificaciones o solicitudes asociadas a este DPA:{' '}
          <a href="mailto:legal@mio.app" className="underline font-semibold text-[#7647eb] dark:text-[#a78bfa]">
            legal@mio.app
          </a>.
        </p>
      </section>
    </LegalPageShell>
  );
};

export default DpaPage;
