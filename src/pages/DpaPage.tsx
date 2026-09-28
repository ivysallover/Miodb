import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';

export const DpaPage: React.FC = () => {
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
        
        <h1 className="text-3xl font-bold mb-2">Acuerdo de Procesamiento de Datos (DPA)</h1>
        <p className={`text-sm mb-8 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Última actualización: Septiembre 2026</p>

        <div className={`p-4 rounded-xl border mb-8 ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
          <p className="text-sm">Este Acuerdo de Procesamiento de Datos rige para clientes B2B (empresas e instituciones) que procesan datos de terceros mediante nuestra infraestructura.</p>
        </div>

        <h2 className="text-xl font-bold mt-10 mb-4">1. Partes</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Este acuerdo vincula al <strong>Cliente</strong> (en adelante el Controlador de Datos) y a <strong>MIO Technologies</strong> (en adelante el Procesador de Datos).
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">2. Objeto</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          El presente acuerdo regula las condiciones bajo las cuales el Procesador tratará datos en nombre del Controlador, específicamente mediante el procesamiento de datasets subidos a la plataforma MIO para la realización de análisis estadísticos y tareas de AutoML.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">3. Datos tratados</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Los datos objeto del tratamiento corresponden a archivos en formato CSV, XLSX, JSON y/u otros formatos estructurados que contienen datos operativos, comerciales o analíticos de los negocios del Cliente.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">4. Duración</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Este DPA permanecerá vigente durante todo el tiempo que se mantenga activa la relación contractual entre las partes o mientras el Procesador mantenga el acceso a datos del Controlador.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">5. Obligaciones de MIO como Procesador</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          MIO Technologies se compromete a:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm mb-4">
          <li><strong>Procesar los datos únicamente siguiendo las instrucciones documentadas</strong> proporcionadas por el Controlador a través del uso de la interfaz y herramientas de la plataforma.</li>
          <li><strong>Garantizar la confidencialidad</strong> de todo el personal que posea autorización explícita para procesar dichos datos.</li>
          <li><strong>Implementar medidas de seguridad técnicas</strong> de vanguardia, incluyendo cifrado en tránsito mediante TLS 1.3 y aislamiento absoluto del cómputo en memoria.</li>
          <li><strong>No contratar Sub-procesadores adicionales</strong> sin contar con la autorización previa y general documentada en la sección pertinente de este DPA.</li>
          <li><strong>Asistir al Controlador</strong> técnica y operativamente para dar respuesta a cualquier solicitud de titulares ejerciendo sus Derechos ARCO.</li>
          <li><strong>Eliminar de manera irrevocable</strong> todos los datos personales una vez finalizada la relación comercial o los servicios de procesamiento contratados.</li>
          <li><strong>Poner a disposición del Controlador</strong> toda la información que sea razonablemente necesaria para demostrar el cumplimiento del presente DPA.</li>
          <li><strong>Garantía de No Entrenamiento (Zero-Training AI Guarantee):</strong> MIO garantiza formal y contractualmente que ningún dato, dataset, metadato o consulta transmitida por el Controlador será empleado para entrenar, reentrenar o ajustar modelos fundacionales de inteligencia artificial ni para perfeccionar algoritmos de terceros sin previa autorización escrita.</li>
          <li><strong>Arquitectura de Cero Almacenamiento en Disco (Zero-Disk Architecture):</strong> Todo procesamiento se efectúa en memoria volátil (<code className="font-mono text-xs px-1 py-0.5 rounded bg-zinc-200 dark:bg-white/10">RAM ephemeral compute</code>) sin almacenamiento persistente de datasets en los discos físicos del backend, garantizando la destrucción irreversible al expirar la sesión.</li>
        </ol>

        <h2 className="text-xl font-bold mt-10 mb-4">6. Sub-procesadores autorizados</h2>
        <div className="overflow-x-auto mb-4">
          <table className={`w-full text-xs text-left border-collapse ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            <thead>
              <tr className={`border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <th className="p-3 font-semibold">Sub-procesador</th>
                <th className="p-3 font-semibold">Uso y Finalidad</th>
              </tr>
            </thead>
            <tbody>
              <tr className={`border-b ${isDark ? 'border-zinc-800/50' : 'border-zinc-100'}`}>
                <td className="p-3">Google Cloud / Firebase</td>
                <td className="p-3">Autenticación, bases de datos y seguridad de almacenamiento (global).</td>
              </tr>
              <tr className={`border-b ${isDark ? 'border-zinc-800/50' : 'border-zinc-100'}`}>
                <td className="p-3">Google LLC (Gemini API)</td>
                <td className="p-3">Generación narrativa (sólo metadatos estadísticos, jamás procesa filas crudas).</td>
              </tr>
              <tr className={`border-b ${isDark ? 'border-zinc-800/50' : 'border-zinc-100'}`}>
                <td className="p-3">Render Services Inc.</td>
                <td className="p-3">Servidores y despliegue del pipeline analítico backend (EE.UU.).</td>
              </tr>
              <tr className={`border-b ${isDark ? 'border-zinc-800/50' : 'border-zinc-100'}`}>
                <td className="p-3">Vercel Inc.</td>
                <td className="p-3">Distribución y red de contenidos (CDN) del frontend (EE.UU.).</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-bold mt-10 mb-4">7. Transferencias internacionales</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Cualquier transferencia de datos personales a terceros países se llevará a cabo bajo las correspondientes Cláusulas Contractuales Tipo (SCCs) o al amparo del Marco de Privacidad de Datos (DPF) aplicable, garantizando un nivel de protección adecuado.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">8. Notificación de brechas</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          En caso de producirse una violación de seguridad de los datos personales, MIO lo notificará al Controlador de forma inmediata y en ningún caso en un plazo superior a 72 horas desde que tenga conocimiento fehaciente del incidente.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">9. Auditoría</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          El Cliente retiene el derecho a solicitar, a su costo, auditorías razonables relativas a las medidas técnicas y organizativas adoptadas por el Procesador para garantizar el cumplimiento de este acuerdo.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">10. Responsabilidad</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Las limitaciones de responsabilidad dispuestas en los Términos y Condiciones generales aplicarán supletoriamente a este acuerdo.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">11. Ley aplicable y Jurisdicción</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          República Argentina. Jurisdicción: Tribunales Ordinarios de la Ciudad de Rosario, Provincia de Santa Fe.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">12. Contacto</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Para notificaciones o consultas asociadas a este DPA: <a href="mailto:legal@mio.app" className="underline">legal@mio.app</a>.
        </p>
      </div>
    </div>
  );
};
export default DpaPage;
