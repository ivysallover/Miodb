import React from 'react';
import { LegalPageShell, LegalSectionItem } from '@/components/dom/LegalPageShell';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';

const SECTIONS: LegalSectionItem[] = [
  { id: 'sec-1', title: 'Definiciones del Servicio' },
  { id: 'sec-2', title: 'Aceptación Vinculante' },
  { id: 'sec-3', title: 'Propiedad Intelectual' },
  { id: 'sec-4', title: 'Uso Permitido y Prohibiciones' },
  { id: 'sec-5', title: 'EU AI Act & Alto Riesgo' },
  { id: 'sec-6', title: 'Descargo sobre IA y AutoML' },
  { id: 'sec-7', title: 'Defensa del Consumidor' },
  { id: 'sec-8', title: 'Limitación de Responsabilidad' },
  { id: 'sec-9', title: 'Servicio "Tal Cual"' },
  { id: 'sec-10', title: 'Requisitos de Edad' },
  { id: 'sec-11', title: 'Términos Comerciales' },
  { id: 'sec-12', title: 'Suspensión y Rescisión' },
  { id: 'sec-13', title: 'Modificación de Términos' },
  { id: 'sec-14', title: 'Fuerza Mayor' },
  { id: 'sec-15', title: 'Cláusula Salvatoria' },
  { id: 'sec-16', title: 'Ley Aplicable y Jurisdicción' },
];

export const TerminosPage: React.FC = () => {
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <LegalPageShell
      title="Términos y Condiciones de Uso"
      subtitle="Condiciones generales de contratación, licenciamiento y directivas regulatorias aplicables a la plataforma MIO Technologies."
      category="MARCO CONTRACTUAL // MIO TECH 2026"
      lastUpdated="Septiembre 2026"
      sections={SECTIONS}
    >
      {/* Intro Double-Bezel Card */}
      <div className="p-1 rounded-3xl bg-black/[0.04] dark:bg-white/[0.05] ring-1 ring-black/[0.06] dark:ring-white/10">
        <div className="p-6 rounded-[calc(1.5rem-2px)] bg-white dark:bg-[#0e0c19] text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <p className="font-medium text-zinc-950 dark:text-white">
            Al registrarte, acceder o utilizar los servicios de MIO Technologies, aceptas quedar vinculado por estos Términos y Condiciones. Si no estás de acuerdo con la totalidad de estas disposiciones, debes abstenerte de utilizar la plataforma.
          </p>
        </div>
      </div>

      {/* Section 1 */}
      <section id="sec-1" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          01 // DEFINICIONES DEL SERVICIO
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          1. Definiciones del servicio
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          MIO es una plataforma de Software como Servicio (SaaS) que proporciona herramientas de análisis cuantitativo, diagnóstico exploratorio y Automated Machine Learning (AutoML) de propósito general sobre datasets estructurados.
        </p>
      </section>

      {/* Section 2 */}
      <section id="sec-2" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          02 // CONSENTIMIENTO
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          2. Aceptación
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          El uso de la plataforma, registro de cuenta o carga de datos implica la aceptación plena, consciente y sin reservas de los presentes Términos y Condiciones, así como de nuestra Política de Privacidad y directivas de tratamiento de datos.
        </p>
      </section>

      {/* Section 3 */}
      <section id="sec-3" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          03 // TITULARIDAD
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          3. Propiedad Intelectual
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          El Usuario retiene el 100% de la propiedad y los derechos exclusivos sobre todos los datos, planillas y datasets que cargue en la plataforma. MIO Technologies retiene todos los derechos de propiedad intelectual sobre los algoritmos, el código fuente, la interfaz de usuario (UI), el diseño, modelos predictivos base y cualquier otra tecnología subyacente.
        </p>
      </section>

      {/* Section 4 */}
      <section id="sec-4" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          04 // CONDUCTA
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          4. Uso permitido y conductas prohibidas
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          El Usuario se compromete a utilizar MIO únicamente para fines lícitos. Está estrictamente prohibido:
        </p>
        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
          <li className="flex items-start gap-2">
            <span className="font-mono text-red-500 font-bold">•</span>
            <span>Subir malware, virus o código malicioso ejecutable.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-red-500 font-bold">•</span>
            <span>Cargar datos ilícitos, robados o que infrinjan derechos de propiedad intelectual o secretos comerciales de terceros.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-red-500 font-bold">•</span>
            <span>Realizar ingeniería inversa, descompilar o intentar extraer el código fuente o los pesos de modelos propietarios de MIO.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-red-500 font-bold">•</span>
            <span>Cargar datos personales sensibles (salud, origen étnico, convicciones religiosas o biométricos) sin el consentimiento explícito y la debida base legal.</span>
          </li>
        </ul>
      </section>

      {/* Section 5 — EU AI Act Double-Bezel Alert */}
      <section id="sec-5" className="scroll-mt-24 space-y-4 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-amber-500 font-semibold flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>05 // EU AI ACT · CLÁUSULA REGULATORIA ANEXO III</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          5. Clasificación Regulatoria y Prohibición de Sistemas de Alto Riesgo
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          MIO es una herramienta de Automated Machine Learning (AutoML), análisis cuantitativo y asistencia estadística de propósito general para la optimización de procesos operativos, comerciales y logísticos.
        </p>

        {/* Double-Bezel Callout */}
        <div className="p-1 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/30">
          <div className="p-5 rounded-[calc(1rem-2px)] bg-amber-500/[0.06] text-xs sm:text-sm leading-relaxed text-amber-900 dark:text-amber-200 space-y-3">
            <div className="font-bold flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Prohibición Taxativa de Alto Riesgo (Reglamento UE 2024/1689):</span>
            </div>
            <p>
              Queda terminantemente prohibido utilizar MIO como componente autónomo o decisorio en sistemas clasificados como de <strong>Alto Riesgo</strong> bajo el Anexo III del Reglamento (UE) 2024/1689, incluyendo:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-amber-800/90 dark:text-amber-200/90">
              <li>Evaluación crediticia vinculante o determinación autónoma de solvencia económica (Credit Scoring sin supervisión humana).</li>
              <li>Selección, contratación, reclutamiento o evaluación de desempeño laboral que impacte en derechos de trabajadores.</li>
              <li>Triaje médico, diagnósticos clínicos o decisiones terapéuticas sin validación de profesionales de la salud.</li>
              <li>Sistemas de identificación biométrica remota, análisis de emociones o puntuación social (social scoring).</li>
            </ul>
            <p className="text-[11px] font-mono text-amber-700 dark:text-amber-300/80 pt-1">
              El Usuario mantendrá indemne a MIO Technologies ante cualquier sanción, reclamo o responsabilidad legal derivada de la transgresión de esta disposición.
            </p>
          </div>
        </div>
      </section>

      {/* Section 6 */}
      <section id="sec-6" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          06 // ALCANCE PROBABILÍSTICO
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          6. Descargo sobre IA y AutoML
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Las predicciones, análisis y resultados generados por los modelos de IA y AutoML en MIO son de carácter estrictamente informativo y probabilístico. No constituyen bajo ninguna circunstancia asesoría financiera, legal, contable, médica o profesional de ningún tipo. La toma de decisiones estratégicas recae íntegramente bajo el criterio del Usuario y su equipo profesional humano.
        </p>
      </section>

      {/* Section 7 — Defensa del Consumidor Double-Bezel */}
      <section id="sec-7" className="scroll-mt-24 space-y-4 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          07 // DEFENSA DEL CONSUMIDOR (ARGENTINA)
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          7. Derechos del Consumidor, Revocación y Baja de Suscripción (Ley N° 24.240)
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          En estricto cumplimiento del marco protectorio del consumidor en la República Argentina (Ley N° 24.240 y concordantes del Código Civil y Comercial de la Nación):
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-red-500/20 bg-red-500/[0.04] space-y-2">
            <div className="font-mono text-xs font-bold text-red-600 dark:text-red-400 uppercase">
              Derecho de Arrepentimiento (Res. 424/2020)
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Todo consumidor cuenta con la facultad inalienable de revocar la contratación dentro de los diez (10) días corridos contados desde la aceptación, sin costo ni penalidad.
            </p>
            <button
              type="button"
              onClick={() => navigateTo('/arrepentimiento')}
              className="mt-2 text-xs font-mono font-bold text-red-600 dark:text-red-400 underline hover:opacity-80 cursor-pointer block"
            >
              Ir al Botón de Arrepentimiento →
            </button>
          </div>

          <div className="p-5 rounded-2xl border border-[#7647eb]/20 bg-[#7647eb]/[0.04] space-y-2">
            <div className="font-mono text-xs font-bold text-[#7647eb] dark:text-[#a78bfa] uppercase">
              Baja de Suscripción (Res. 271/2020)
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              El Usuario podrá rescindir de forma directa su suscripción mensual o anual en cualquier momento sin intermediación ni trabas burocráticas, emitiéndose un código formal.
            </p>
            <button
              type="button"
              onClick={() => navigateTo('/arrepentimiento?tipo=baja')}
              className="mt-2 text-xs font-mono font-bold text-[#7647eb] dark:text-[#a78bfa] underline hover:opacity-80 cursor-pointer block"
            >
              Ir al Botón de Baja Directa →
            </button>
          </div>
        </div>
      </section>

      {/* Section 8 */}
      <section id="sec-8" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          08 // RESPONSABILIDAD
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          8. Limitación de Responsabilidad
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          En la máxima medida permitida por la ley aplicable, la responsabilidad total de MIO Technologies ante cualquier reclamo relacionado con el servicio estará limitada al monto total efectivamente abonado por el Usuario en los últimos doce (12) meses. MIO excluye expresamente cualquier responsabilidad por lucro cesante, pérdida de datos o daños consecuenciales indirectos.
        </p>
      </section>

      {/* Section 9 */}
      <section id="sec-9" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          09 // GARANTÍAS
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          9. Servicio "TAL CUAL"
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          La plataforma se proporciona "TAL CUAL" (AS IS) y "SEGÚN DISPONIBILIDAD" (AS AVAILABLE). MIO no ofrece garantías explícitas o implícitas de disponibilidad ininterrumpida o libre de errores.
        </p>
      </section>

      {/* Section 10 */}
      <section id="sec-10" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          10 // ELEGIBILIDAD
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          10. Requisitos de edad
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          El uso de la plataforma MIO está restringido a personas mayores de 18 años con plena capacidad legal para contratar.
        </p>
      </section>

      {/* Section 11 */}
      <section id="sec-11" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          11 // PRECIOS
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          11. Términos comerciales y pagos
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Los términos, condiciones, tarifas y modalidades de pago correspondientes a planes de suscripción serán publicados en la plataforma y notificados a los usuarios previo a su entrada en vigencia.
        </p>
      </section>

      {/* Section 12 */}
      <section id="sec-12" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          12 // RESOLUCIÓN
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          12. Suspensión y rescisión
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          MIO se reserva el derecho de suspender o cancelar cuentas de manera inmediata, con o sin previo aviso, en caso de detectar un uso ilícito, abusivo o el incumplimiento de estos Términos y Condiciones.
        </p>
      </section>

      {/* Section 13 */}
      <section id="sec-13" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          13 // ACTUALIZACIONES
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          13. Modificación de términos
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones sustanciales serán notificadas con un preaviso de 30 días. El uso continuado tras dicho plazo constituirá la aceptación de los nuevos términos.
        </p>
      </section>

      {/* Section 14 */}
      <section id="sec-14" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          14 // CASO FORTUITO
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          14. Fuerza mayor
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          MIO no será responsable por interrupciones, demoras o fallas en el servicio causadas por eventos de fuerza mayor o ajenos a nuestro control razonable, tales como caídas globales de proveedores cloud, cortes de conectividad o desastres naturales.
        </p>
      </section>

      {/* Section 15 */}
      <section id="sec-15" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          15 // VALIDEZ
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          15. Salvatoria
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Si alguna disposición de estos Términos resulta ser nula, inválida o inaplicable por un tribunal competente, dicha nulidad no afectará la validez de las disposiciones restantes, las cuales permanecerán en pleno vigor y efecto.
        </p>
      </section>

      {/* Section 16 */}
      <section id="sec-16" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          16 // JURISDICCIÓN
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          16. Ley aplicable y Jurisdicción
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Estos Términos y Condiciones se rigen e interpretan conforme a las leyes de la República Argentina. Para cualquier controversia que pudiera derivarse de la prestación de los servicios, las partes se someten a la jurisdicción exclusiva de los Tribunales Ordinarios de la Ciudad de Rosario, Provincia de Santa Fe.
        </p>
      </section>
    </LegalPageShell>
  );
};

export default TerminosPage;
