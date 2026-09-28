import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';

export const TerminosPage: React.FC = () => {
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';
  
  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className={`min-h-screen px-4 sm:px-8 py-12 ${isDark ? 'bg-[#07070a] text-white' : 'bg-[#fbfbfd] text-zinc-950'}`}>
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigateTo('/')} className={`mb-8 flex items-center gap-2 text-sm font-medium ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-950'} transition-colors cursor-pointer`}>
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </button>
        
        <h1 className="text-3xl font-bold mb-2">Términos y Condiciones</h1>
        <p className={`text-sm mb-8 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Última actualización: Septiembre 2026</p>

        <div className={`p-4 rounded-xl border mb-8 ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
          <p className="text-sm">Al registrarte, acceder o utilizar los servicios de MIO Technologies, aceptas quedar vinculado por estos Términos y Condiciones. Si no estás de acuerdo, no utilices la plataforma.</p>
        </div>

        <h2 className="text-xl font-bold mt-10 mb-4">1. Definiciones del servicio</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          MIO es una plataforma de Software como Servicio (SaaS) que proporciona herramientas de análisis de datos y Automated Machine Learning (AutoML).
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">2. Aceptación</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          El uso de la plataforma, registro de cuenta o carga de datos implica la aceptación plena y sin reservas de los presentes Términos y Condiciones, así como de nuestra Política de Privacidad.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">3. Propiedad Intelectual</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          El Usuario retiene el 100% de la propiedad y los derechos sobre todos los datos y datasets que cargue en la plataforma. MIO Technologies retiene todos los derechos de propiedad intelectual sobre los algoritmos, el código fuente, la interfaz de usuario (UI), el diseño y cualquier otra tecnología subyacente de la plataforma.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">4. Uso permitido y conductas prohibidas</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          El Usuario se compromete a utilizar MIO únicamente para fines lícitos. Está estrictamente prohibido:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm mb-4">
          <li>Subir malware, virus o código malicioso.</li>
          <li>Cargar datos ilícitos, robados o que infrinjan derechos de propiedad intelectual o privacidad de terceros.</li>
          <li>Realizar ingeniería inversa, descompilar o intentar extraer el código fuente o los pesos de modelos propietarios de MIO.</li>
          <li>Cargar datos personales sensibles (salud, origen étnico, convicciones religiosas o biométricos) sin el consentimiento explícito y la base legal correspondiente.</li>
        </ol>

        <h2 className="text-xl font-bold mt-10 mb-4">5. Clasificación Regulatoria y Prohibición de Sistemas de Alto Riesgo (EU AI Act - Reglamento UE 2024/1689)</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          MIO es una herramienta de Automated Machine Learning (AutoML), análisis cuantitativo y asistencia estadística de propósito general para la optimización de procesos operativos, comerciales y logísticos.
        </p>
        <div className={`p-4 rounded-xl border mb-4 text-xs leading-relaxed ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          <strong>Cláusula de Prohibición Anexo III (EU AI Act):</strong> Queda terminantemente prohibido utilizar MIO como componente autónomo o decisorio en sistemas clasificados como de <strong>Alto Riesgo</strong> bajo el Anexo III del Reglamento (UE) 2024/1689, incluyendo de manera taxativa:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Evaluación crediticia vinculante o determinación autónoma de solvencia económica (Credit Scoring sin supervisión humana).</li>
            <li>Selección, contratación, reclutamiento o evaluación de desempeño laboral que impacte en derechos de trabajadores.</li>
            <li>Triaje médico, diagnósticos clínicos o decisiones terapéuticas sin validación de profesionales de la salud.</li>
            <li>Sistemas de identificación biométrica remota, análisis de emociones o puntuación social (social scoring).</li>
          </ul>
          El Usuario mantendrá indemne a MIO Technologies ante cualquier sanción, reclamo o responsabilidad legal derivada de la transgresión de esta disposición.
        </div>

        <h2 className="text-xl font-bold mt-10 mb-4">6. Descargo sobre IA y AutoML</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Las predicciones, análisis y resultados generados por los modelos de IA y AutoML en MIO son de carácter estrictamente informativo y probabilístico. No constituyen bajo ninguna circunstancia asesoría financiera, legal, contable, médica o profesional de ningún tipo. La toma de decisiones estratégicas recae íntegramente bajo el criterio del Usuario y su equipo profesional.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">7. Derechos del Consumidor, Revocación y Baja de Suscripción (Leyes de Argentina)</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          En estricto cumplimiento del marco protectorio del consumidor en la República Argentina (Ley N° 24.240 y concordantes del Código Civil y Comercial de la Nación):
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm mb-4">
          <li>
            <strong>Derecho de Arrepentimiento (Resolución 424/2020 SCI):</strong> Todo consumidor que contrate planes de suscripción en línea cuenta con la facultad inalienable de revocar la contratación dentro del plazo de diez (10) días corridos contados desde la aceptación del servicio o pago, sin costo ni penalidad alguna, a través del <button onClick={() => navigateTo('/arrepentimiento')} className="underline text-red-500 font-bold cursor-pointer">Botón de Arrepentimiento</button> visible en el sitio.
          </li>
          <li>
            <strong>Baja de Suscripción (Resolución 271/2020 SCI):</strong> El Usuario podrá rescindir de forma directa su suscripción mensual o anual en cualquier momento a través del <button onClick={() => navigateTo('/arrepentimiento?tipo=baja')} className="underline text-[#7647eb] dark:text-[#a78bfa] font-bold cursor-pointer">Botón de Baja de Suscripción</button> dispuesto en su panel de perfil o en el pie de página, emitiéndose un código formal de trámite sin intermediación ni trabas burocráticas.
          </li>
        </ul>

        <h2 className="text-xl font-bold mt-10 mb-4">8. Limitación de Responsabilidad</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          En la máxima medida permitida por la ley aplicable, la responsabilidad total de MIO Technologies ante cualquier reclamo relacionado con el servicio estará limitada al monto total pagado por el Usuario en los últimos doce (12) meses. MIO excluye expresamente cualquier responsabilidad por lucro cesante, pérdida de datos, lucro derivado de pronósticos estadísticos o daños consecuenciales indirectos.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">9. Servicio "TAL CUAL"</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          La plataforma se proporciona "TAL CUAL" (AS IS) y "SEGÚN DISPONIBILIDAD" (AS AVAILABLE). MIO no ofrece garantías explícitas o implícitas de disponibilidad continua, ininterrumpida o libre de errores.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">10. Requisitos de edad</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          El uso de la plataforma MIO está restringido a personas mayores de 18 años con capacidad legal para contratar.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">11. Términos comerciales y pagos</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Los términos, condiciones, tarifas y modalidades de pago correspondientes a planes de suscripción serán publicados en la plataforma y notificados a los usuarios previo a su entrada en vigencia.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">12. Suspensión y rescisión</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          MIO se reserva el derecho de suspender o cancelar cuentas de manera inmediata, con o sin previo aviso, en caso de detectar un uso ilícito, abusivo o el incumplimiento de estos Términos y Condiciones.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">13. Modificación de términos</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones sustanciales serán notificadas con un preaviso de 30 días. El uso continuado de la plataforma tras dicho plazo constituirá la aceptación de los nuevos términos.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">14. Fuerza mayor</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          MIO no será responsable por interrupciones, demoras o fallas en el servicio causadas por eventos de fuerza mayor o ajenos a nuestro control razonable, tales como caídas de proveedores cloud, cortes de conectividad, huelgas o desastres naturales.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">15. Salvatoria</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Si alguna disposición de estos Términos resulta ser nula, inválida o inaplicable por un tribunal competente, dicha nulidad no afectará la validez de las disposiciones restantes, las cuales permanecerán en pleno vigor y efecto.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">16. Ley aplicable y Jurisdicción</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Estos Términos y Condiciones se rigen por las leyes de la República Argentina. Para cualquier controversia que pudiera derivarse de la prestación de los servicios, las partes se someten a la jurisdicción exclusiva de los Tribunales Ordinarios de la Ciudad de Rosario, Santa Fe.
        </p>
      </div>
    </div>
  );
};
export default TerminosPage;
