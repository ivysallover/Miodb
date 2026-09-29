import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';

export const PrivacidadPage: React.FC = () => {
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
        
        <h1 className="text-3xl font-bold mb-2">Política de Privacidad</h1>
        <p className={`text-sm mb-8 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Última actualización: Septiembre 2026</p>

        <h2 className="text-xl font-bold mt-10 mb-4">1. Responsable del Tratamiento</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          El responsable del tratamiento de los datos es MIO Technologies, con sede en Rosario, Santa Fe, Argentina. Puedes contactarnos en cualquier momento a través de <a href="mailto:privacidad@mio.app" className="underline">privacidad@mio.app</a>.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">2. Datos que recopilamos</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Recopilamos los siguientes datos para poder ofrecer y mejorar nuestros servicios:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm mb-4">
          <li>Dirección de correo electrónico y credenciales de autenticación (vía Firebase).</li>
          <li>Dirección IP y User Agent por motivos de seguridad y auditoría.</li>
          <li>Datos de facturación (en futuros planes pagos).</li>
          <li>Los datasets y archivos subidos por el usuario para su análisis.</li>
        </ul>

        <h2 className="text-xl font-bold mt-10 mb-4">3. Principio de minimización</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Aplicamos rigurosamente el principio de minimización (Art. 5 RGPD, Art. 4 Ley 25.326). Solo solicitamos y procesamos los datos estrictamente necesarios para el cumplimiento de los fines declarados.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">4. Bases legales del tratamiento</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          De conformidad con el Art. 6 del RGPD, justificamos el tratamiento en las siguientes bases:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm mb-4">
          <li><strong>Consentimiento explícito:</strong> Para el procesamiento de los datasets subidos voluntariamente.</li>
          <li><strong>Ejecución contractual:</strong> Para el mantenimiento de la cuenta de usuario y la prestación del servicio.</li>
          <li><strong>Interés legítimo:</strong> Para garantizar la seguridad de la plataforma y prevenir fraudes.</li>
        </ul>

        <h2 className="text-xl font-bold mt-10 mb-4">5. Cómo usamos los datos</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Utilizamos los datos exclusivamente para la autenticación de usuarios, la realización de análisis estadísticos en memoria, y la generación de insights a partir de los datasets proporcionados por el usuario.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">6. No-venta, Confidencialidad y Garantía "Zero-Training"</h2>
        <div className={`p-4 rounded-xl border mb-4 ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
          <p className="text-sm font-medium">Compromiso inquebrantable de privacidad y blindaje B2B:</p>
          <ul className="list-disc list-inside mt-2 space-y-1.5 text-xs leading-relaxed">
            <li><strong>No-Venta:</strong> MIO jamás vende, comercializa, cede ni arrienda tus datos a terceros con fines publicitarios ni de intermediación de datos.</li>
            <li><strong>Zero-Training Guarantee (Garantía de No Entrenamiento):</strong> Ni MIO Technologies ni los proveedores de inferencia de IA comercial subyacentes (Google Cloud Vertex AI / Gemini API) utilizan, almacenan ni emplean tus datasets, esquemas, consultas o prompts para entrenar, reentrenar o ajustar modelos fundacionales de inteligencia artificial de acceso público o general.</li>
            <li><strong>Propiedad Exclusiva:</strong> La titularidad de los datos cargados y de los modelos predictivos generados pertenece enteramente al usuario y su organización.</li>
          </ul>
        </div>

        <h2 className="text-xl font-bold mt-10 mb-4">7. Sub-encargados de Tratamiento</h2>
        <div className="overflow-x-auto mb-4">
          <table className={`w-full text-xs text-left border-collapse ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            <thead>
              <tr className={`border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <th className="p-3 font-semibold">Sub-encargado</th>
                <th className="p-3 font-semibold">Función</th>
                <th className="p-3 font-semibold">Detalles y Seguridad</th>
              </tr>
            </thead>
            <tbody>
              <tr className={`border-b ${isDark ? 'border-zinc-800/50' : 'border-zinc-100'}`}>
                <td className="p-3 font-medium">Google Cloud / Firebase</td>
                <td className="p-3">Auth + Firestore</td>
                <td className="p-3">Infraestructura global, SOC 2, ISO 27001, encriptación en reposo AES-256.</td>
              </tr>
              <tr className={`border-b ${isDark ? 'border-zinc-800/50' : 'border-zinc-100'}`}>
                <td className="p-3 font-medium">Google LLC / Gemini API</td>
                <td className="p-3">Generación de narrativas ejecutivas</td>
                <td className="p-3"><strong>NO recibe datasets crudos.</strong> Solo recibe métricas estadísticas agregadas. Amparado por el régimen de No-Entrenamiento comercial de Google. Filtro de sanitización PII activo.</td>
              </tr>
              <tr className={`border-b ${isDark ? 'border-zinc-800/50' : 'border-zinc-100'}`}>
                <td className="p-3 font-medium">Render Services Inc.</td>
                <td className="p-3">Hosting backend FastAPI</td>
                <td className="p-3">Servidores de cómputo en EE.UU., HTTPS forzado, cabeceras HSTS y arquitectura Zero-Disk.</td>
              </tr>
              <tr className={`border-b ${isDark ? 'border-zinc-800/50' : 'border-zinc-100'}`}>
                <td className="p-3 font-medium">Vercel Inc.</td>
                <td className="p-3">CDN frontend</td>
                <td className="p-3">Distribución global edge optimizada con mitigación DDoS y cifrado TLS 1.3.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-bold mt-10 mb-4">8. Transferencias internacionales</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Los datos pueden ser transferidos y alojados en servidores ubicados en Estados Unidos. Dichas transferencias se realizan bajo el amparo de Cláusulas Contractuales Tipo (SCCs) aprobadas por la Comisión Europea y estándares de adecuación internacional reconocidos por la AAIP (Argentina).
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">9. Arquitectura "Zero-Disk" y Sanitización PII</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Para garantizar la máxima soberanía y confidencialidad sobre los activos de información empresarial:
        </p>
        <ul className="list-disc list-inside space-y-2 text-xs leading-relaxed mb-4">
          <li><strong>Cero Almacenamiento en Disco (Zero-Disk Retention):</strong> Los datasets (.csv, .xlsx, .json) no se guardan en el almacenamiento secundario ni en discos físicos del servidor backend. Se procesan de manera volátil y efímera en la memoria RAM del sistema (<code className="font-mono text-[11px] px-1 py-0.5 rounded bg-zinc-200 dark:bg-white/10">io.BytesIO</code>) con auto-expiración programada (TTL).</li>
          <li><strong>Filtro Algorítmico de Privacidad (PII Sanitizer):</strong> Antes de enviar cualquier resumen analítico a motores de lenguaje natural, el backend ejecuta un pipeline de sanitización mediante expresiones regulares que detecta y enmascara automáticamente DNIs, números de CUIT/CUIL, correos electrónicos personales, números de tarjetas de crédito (con validación de checksum Luhn) y números telefónicos.</li>
        </ul>

        <h2 className="text-xl font-bold mt-10 mb-4">10. Derechos ARCO</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Como usuario, tienes el derecho en todo momento a Acceder, Rectificar, Cancelar u Oponerte al uso de tus datos. Puedes ejercer estos derechos enviando un correo electrónico a <a href="mailto:privacidad@mio.app" className="underline">privacidad@mio.app</a>.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">11. Disposiciones CCPA</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Para residentes de California: <strong>No vendemos ni compartimos tus datos personales.</strong> Tienes derecho a saber qué datos recopilamos, solicitar su eliminación inmediata y a no sufrir ninguna discriminación por ejercer estos derechos.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">12. Protocolo de Brechas de Seguridad</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          En caso de producirse un incidente de seguridad que afecte datos personales, nos comprometemos a notificarlo a la autoridad de control competente y a los titulares afectados en un plazo no mayor a 72 horas (Art. 33/34 RGPD).
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">13. Leyenda AAIP (República Argentina)</h2>
        <div className={`p-4 rounded-xl border mb-4 ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
          <p className="text-sm italic">
            "El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley N° 25.326. La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales."
          </p>
        </div>

        <h2 className="text-xl font-bold mt-10 mb-4">14. Privacidad de menores</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          El servicio es exclusivo para personas mayores de 18 años. No recopilamos conscientemente información de menores de edad.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">15. Retención de datos</h2>
        <ul className="list-disc list-inside space-y-2 text-sm mb-4">
          <li><strong>Datos de cuenta:</strong> Se conservan mientras la cuenta esté activa, y hasta 30 días posteriores a la solicitud de eliminación.</li>
          <li><strong>Datasets:</strong> Procesamiento efímero. Son eliminados inmediatamente tras finalizar el análisis.</li>
          <li><strong>Logs:</strong> Sometidos a rotación periódica cada 30 días.</li>
        </ul>

        <h2 className="text-xl font-bold mt-10 mb-4">16. Modificaciones a la política</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Nos reservamos el derecho a modificar esta política en cualquier momento. Los cambios significativos serán comunicados a los usuarios con un preaviso mínimo de 30 días.
        </p>
      </div>
    </div>
  );
};
export default PrivacidadPage;
