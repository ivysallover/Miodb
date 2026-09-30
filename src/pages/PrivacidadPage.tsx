import React from 'react';
import { LegalPageShell, LegalSectionItem } from '@/components/dom/LegalPageShell';
import { Shield, Lock, Server, Cpu, Database } from 'lucide-react';

const SECTIONS: LegalSectionItem[] = [
  { id: 'sec-1', title: 'Responsable del Tratamiento' },
  { id: 'sec-2', title: 'Datos Recopilados' },
  { id: 'sec-3', title: 'Minimización de Datos' },
  { id: 'sec-4', title: 'Bases Legales' },
  { id: 'sec-5', title: 'Uso de los Datos' },
  { id: 'sec-6', title: 'Garantía "Zero-Training"' },
  { id: 'sec-7', title: 'Sub-encargados de Tratamiento' },
  { id: 'sec-8', title: 'Transferencias Internacionales' },
  { id: 'sec-9', title: 'Zero-Disk & PII Sanitizer' },
  { id: 'sec-10', title: 'Derechos ARCO' },
  { id: 'sec-11', title: 'Disposiciones CCPA' },
  { id: 'sec-12', title: 'Brechas de Seguridad' },
  { id: 'sec-13', title: 'Leyenda Legal AAIP' },
  { id: 'sec-14', title: 'Privacidad de Menores' },
  { id: 'sec-15', title: 'Retención de Datos' },
  { id: 'sec-16', title: 'Modificaciones' },
];

export const PrivacidadPage: React.FC = () => {
  return (
    <LegalPageShell
      title="Política de Privacidad y Soberanía de Datos"
      subtitle="Bases legales, gobernanza de modelos predictivos y salvaguardas de confidencialidad de MIO Technologies."
      category="PROTECCIÓN DE ACTIVOS // RGPD · AAIP · CCPA"
      lastUpdated="Septiembre 2026"
      sections={SECTIONS}
    >
      {/* Zero-Training Highlight Card */}
      <div className="p-1 rounded-3xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
        <div className="p-6 rounded-[calc(1.5rem-2px)] bg-emerald-500/[0.05] text-sm leading-relaxed text-emerald-950 dark:text-emerald-200 space-y-2">
          <div className="font-bold flex items-center gap-2 text-emerald-900 dark:text-[#bdf559]">
            <Shield className="w-4 h-4 shrink-0" />
            <span>Garantía de No-Entrenamiento Comercial:</span>
          </div>
          <p>
            MIO Technologies no comercializa ni arrienda tus datos, ni utiliza las planillas o datasets subidos para entrenar modelos fundacionales de Inteligencia Artificial públicos o de terceros.
          </p>
        </div>
      </div>

      {/* Section 1 */}
      <section id="sec-1" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          01 // RESPONSABLE
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          1. Responsable del Tratamiento
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          El responsable del tratamiento de los datos es MIO Technologies, con sede operativa en la Ciudad de Rosario, Santa Fe, República Argentina. Canal de contacto oficial de privacidad:{' '}
          <a href="mailto:privacidad@mio.app" className="underline font-semibold text-[#7647eb] dark:text-[#a78bfa]">
            privacidad@mio.app
          </a>.
        </p>
      </section>

      {/* Section 2 */}
      <section id="sec-2" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          02 // RECOPILACIÓN
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          2. Datos que recopilamos
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Recopilamos los siguientes datos para poder ofrecer y optimizar nuestros servicios de AutoML:
        </p>
        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
          <li className="flex items-start gap-2">
            <span className="font-mono text-[#7647eb] dark:text-[#bdf559]">•</span>
            <span>Dirección de correo electrónico y credenciales de autenticación (vía Firebase Auth).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-[#7647eb] dark:text-[#bdf559]">•</span>
            <span>Dirección IP y User Agent efímeros por motivos de seguridad, auditoría y trazabilidad.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-[#7647eb] dark:text-[#bdf559]">•</span>
            <span>Datos de facturación e identificación fiscal (en planes corporativos pagos).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-[#7647eb] dark:text-[#bdf559]">•</span>
            <span>Los datasets estructurados (.csv, .xlsx, .json) subidos voluntariamente para su diagnóstico.</span>
          </li>
        </ul>
      </section>

      {/* Section 3 */}
      <section id="sec-3" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          03 // MINIMIZACIÓN
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          3. Principio de minimización
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Aplicamos rigurosamente el principio de minimización (Art. 5 RGPD, Art. 4 Ley 25.326). Solo solicitamos y procesamos los datos estrictamente indispensables para el cumplimiento de los fines analíticos declarados.
        </p>
      </section>

      {/* Section 4 */}
      <section id="sec-4" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          04 // BASES JURÍDICAS
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          4. Bases legales del tratamiento
        </h2>
        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
          <li className="flex items-start gap-2">
            <span className="font-mono text-emerald-600 font-bold">•</span>
            <span><strong>Consentimiento explícito:</strong> Para el procesamiento de los datasets subidos voluntariamente a la plataforma.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-emerald-600 font-bold">•</span>
            <span><strong>Ejecución contractual:</strong> Para el mantenimiento de la cuenta de usuario y la prestación del servicio SaaS.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-emerald-600 font-bold">•</span>
            <span><strong>Interés legítimo:</strong> Para garantizar la seguridad del sistema y prevenir accesos no autorizados o fraude.</span>
          </li>
        </ul>
      </section>

      {/* Section 5 */}
      <section id="sec-5" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          05 // FINALIDADES
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          5. Cómo usamos los datos
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Utilizamos los datos exclusivamente para la autenticación de usuarios, la realización de análisis estadísticos en memoria RAM, y la generación de insights a partir de los datasets proporcionados por el usuario.
        </p>
      </section>

      {/* Section 6 */}
      <section id="sec-6" className="scroll-mt-24 space-y-4 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-600 dark:text-[#bdf559] font-semibold">
          06 // BLINDAJE B2B
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          6. No-venta, Confidencialidad y Garantía "Zero-Training"
        </h2>
        <div className="p-1 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] ring-1 ring-black/[0.06] dark:ring-white/10">
          <div className="p-5 rounded-[calc(1rem-2px)] bg-white dark:bg-[#0e0c19] text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 space-y-2.5">
            <p className="font-semibold text-zinc-950 dark:text-white">Compromiso inquebrantable de privacidad y blindaje B2B:</p>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
              <li><strong>No-Venta:</strong> MIO jamás vende, comercializa, cede ni arrienda tus datos a terceros con fines publicitarios ni de intermediación de datos.</li>
              <li><strong>Zero-Training Guarantee (Garantía de No Entrenamiento):</strong> Ni MIO Technologies ni los proveedores de inferencia de IA comercial subyacentes (Google Cloud Vertex AI / Gemini API) utilizan, almacenan ni emplean tus datasets, esquemas, consultas o prompts para entrenar, reentrenar o ajustar modelos fundacionales de inteligencia artificial de acceso público.</li>
              <li><strong>Propiedad Exclusiva:</strong> La titularidad de los datos cargados y de los modelos predictivos generados pertenece enteramente al usuario y su organización.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 7 — Sub-encargados Table with Double-Bezel Container */}
      <section id="sec-7" className="scroll-mt-24 space-y-4 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          07 // INFRAESTRUCTURA
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          7. Sub-encargados de Tratamiento
        </h2>

        <div className="overflow-x-auto rounded-2xl border border-black/[0.08] dark:border-white/10 shadow-sm">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                <th className="p-3.5 font-mono font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">Sub-encargado</th>
                <th className="p-3.5 font-mono font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">Función</th>
                <th className="p-3.5 font-mono font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">Seguridad & Certificaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06] text-zinc-600 dark:text-zinc-300">
              <tr>
                <td className="p-3.5 font-medium text-zinc-950 dark:text-white">Google Cloud / Firebase</td>
                <td className="p-3.5">Auth + Firestore</td>
                <td className="p-3.5">Infraestructura global, SOC 2, ISO 27001, encriptación en reposo AES-256.</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium text-zinc-950 dark:text-white">Google LLC / Gemini API</td>
                <td className="p-3.5">Generación de narrativas ejecutivas</td>
                <td className="p-3.5"><strong>NO recibe datasets crudos.</strong> Solo recibe métricas estadísticas agregadas. Amparado por el régimen de No-Entrenamiento comercial de Google. Filtro PII activo.</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium text-zinc-950 dark:text-white">Render Services Inc.</td>
                <td className="p-3.5">Hosting backend FastAPI</td>
                <td className="p-3.5">Servidores de cómputo en EE.UU., HTTPS forzado, cabeceras HSTS y arquitectura Zero-Disk.</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium text-zinc-950 dark:text-white">Vercel Inc.</td>
                <td className="p-3.5">CDN frontend</td>
                <td className="p-3.5">Distribución global edge optimizada con mitigación DDoS y cifrado TLS 1.3.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 8 */}
      <section id="sec-8" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          08 // TRANSFRONTERIZO
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          8. Transferencias internacionales
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Los datos pueden ser transferidos y alojados en servidores ubicados en Estados Unidos. Dichas transferencias se realizan bajo el amparo de Cláusulas Contractuales Tipo (SCCs) aprobadas por la Comisión Europea y estándares de adecuación reconocidos por la AAIP (Argentina).
        </p>
      </section>

      {/* Section 9 */}
      <section id="sec-9" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          09 // ARQUITECTURA EFÍMERA
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          9. Arquitectura "Zero-Disk" y Sanitización PII
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Para garantizar la máxima soberanía y confidencialidad sobre los activos de información empresarial:
        </p>
        <ul className="space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
          <li className="flex items-start gap-2">
            <span className="font-mono text-emerald-600 font-bold">•</span>
            <span><strong>Cero Almacenamiento en Disco (Zero-Disk Retention):</strong> Los datasets (.csv, .xlsx, .json) no se guardan en el almacenamiento secundario ni en discos físicos del servidor backend. Se procesan de manera volátil y efímera en la memoria RAM del sistema con auto-expiración programada (TTL).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-emerald-600 font-bold">•</span>
            <span><strong>Filtro Algorítmico de Privacidad (PII Sanitizer):</strong> Antes de enviar cualquier resumen analítico a motores de lenguaje natural, el backend ejecuta un pipeline de sanitización mediante expresiones regulares que detecta y enmascara automáticamente DNIs, números de CUIT/CUIL, correos electrónicos personales, números de tarjetas de crédito y teléfonos.</span>
          </li>
        </ul>
      </section>

      {/* Section 10 */}
      <section id="sec-10" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          10 // DERECHOS ARCO
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          10. Derechos ARCO
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Como usuario, tienes el derecho en todo momento a Acceder, Rectificar, Cancelar u Oponerte al uso de tus datos. Puedes ejercer estos derechos enviando un correo a{' '}
          <a href="mailto:privacidad@mio.app" className="underline font-semibold text-[#7647eb] dark:text-[#a78bfa]">
            privacidad@mio.app
          </a>.
        </p>
      </section>

      {/* Section 11 */}
      <section id="sec-11" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          11 // CCPA (CALIFORNIA)
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          11. Disposiciones CCPA
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Para residentes de California: <strong>No vendemos ni compartimos tus datos personales.</strong> Tienes derecho a conocer qué datos recopilamos, solicitar su eliminación inmediata y no sufrir discriminación alguna.
        </p>
      </section>

      {/* Section 12 */}
      <section id="sec-12" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          12 // INCIDENTES
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          12. Protocolo de Brechas de Seguridad
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          En caso de producirse un incidente de seguridad que afecte datos personales, nos comprometemos a notificarlo a la autoridad de control competente y a los titulares afectados en un plazo no mayor a 72 horas (Art. 33/34 RGPD).
        </p>
      </section>

      {/* Section 13 — AAIP Double-Bezel */}
      <section id="sec-13" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          13 // AAIP (ARGENTINA)
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          13. Leyenda AAIP (República Argentina)
        </h2>
        <div className="p-1 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] ring-1 ring-black/[0.06] dark:ring-white/10">
          <div className="p-5 rounded-[calc(1rem-2px)] bg-white dark:bg-[#0e0c19] text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 italic">
            "El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley N° 25.326. La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales."
          </div>
        </div>
      </section>

      {/* Section 14 */}
      <section id="sec-14" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          14 // MENORES
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          14. Privacidad de menores
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          El servicio es exclusivo para personas mayores de 18 años. No recopilamos conscientemente información de menores de edad.
        </p>
      </section>

      {/* Section 15 */}
      <section id="sec-15" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          15 // CONSERVACIÓN
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          15. Retención de datos
        </h2>
        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
          <li><strong>Datos de cuenta:</strong> Se conservan mientras la cuenta esté activa, y hasta 30 días posteriores a la solicitud de baja.</li>
          <li><strong>Datasets:</strong> Procesamiento efímero en memoria volátil. Eliminados inmediatamente tras la sesión de análisis.</li>
          <li><strong>Logs de telemetría:</strong> Sometidos a rotación periódica cada 30 días.</li>
        </ul>
      </section>

      {/* Section 16 */}
      <section id="sec-16" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          16 // HISTORIAL
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          16. Modificaciones a la política
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Nos reservamos el derecho a modificar esta política en cualquier momento. Los cambios sustanciales serán comunicados con un preaviso mínimo de 30 días en la plataforma.
        </p>
      </section>
    </LegalPageShell>
  );
};

export default PrivacidadPage;
