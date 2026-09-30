import React from 'react';
import { LegalPageShell, LegalSectionItem } from '@/components/dom/LegalPageShell';
import { Cookie, Settings, ShieldCheck } from 'lucide-react';

const SECTIONS: LegalSectionItem[] = [
  { id: 'sec-1', title: 'Qué son las Cookies' },
  { id: 'sec-2', title: 'Clasificación de Tecnologías' },
  { id: 'sec-3', title: 'Cookies de Terceros' },
  { id: 'sec-4', title: 'Gestión en el Navegador' },
  { id: 'sec-5', title: 'Mecanismo de Revocación' },
  { id: 'sec-6', title: 'Canal de Contacto' },
];

export const CookiesPage: React.FC = () => {
  return (
    <LegalPageShell
      title="Política de Cookies y Almacenamiento Local"
      subtitle="Explicación detallada del uso de cookies esenciales, almacenamiento en navegador (IndexedDB / localStorage) y nuestra estricta política anti-rastreo."
      category="TRANSPARENCIA TECNOLÓGICA // MIO ENGINE"
      lastUpdated="Septiembre 2026"
      sections={SECTIONS}
    >
      {/* Anti-Tracking Commitment Banner */}
      <div className="p-1 rounded-3xl bg-[#bdf559]/10 ring-1 ring-[#bdf559]/30">
        <div className="p-6 rounded-[calc(1.5rem-2px)] bg-[#bdf559]/[0.06] text-sm leading-relaxed text-zinc-900 dark:text-zinc-100 space-y-2">
          <div className="font-bold flex items-center gap-2 text-emerald-800 dark:text-[#bdf559]">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Postura Estricta Anti-Rastreo:</span>
          </div>
          <p className="text-zinc-700 dark:text-zinc-300">
            En MIO <strong>NO</strong> utilizamos píxeles publicitarios de Facebook/Meta, ni scripts espía de retargeting, ni vendemos patrones de navegación a corredores de datos (data brokers).
          </p>
        </div>
      </div>

      {/* Section 1 */}
      <section id="sec-1" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          01 // CONCEPTO
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          1. Qué son las cookies y tecnologías similares
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          En MIO Technologies utilizamos cookies técnicas mínimas, pero priorizamos mecanismos de almacenamiento local en el navegador más modernos, seguros y eficientes como <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-white/10">localStorage</code>, <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-white/10">sessionStorage</code> e <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-white/10">IndexedDB</code>. Estas tecnologías permiten mantener tu sesión activa, recordar tus configuraciones visuales (como el tema claro/oscuro) y cachear temporalmente los resultados de AutoML para evitar cómputo redundante.
        </p>
      </section>

      {/* Section 2 — Table */}
      <section id="sec-2" className="scroll-mt-24 space-y-4 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          02 // INVENTARIO
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          2. Clasificación de tecnologías utilizadas
        </h2>

        <div className="overflow-x-auto rounded-2xl border border-black/[0.08] dark:border-white/10 shadow-sm">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                <th className="p-3.5 font-mono font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">Tipo</th>
                <th className="p-3.5 font-mono font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">Clave / Identificador</th>
                <th className="p-3.5 font-mono font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">Propósito & Duración</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06] text-zinc-600 dark:text-zinc-300">
              <tr>
                <td className="p-3.5 font-semibold text-zinc-950 dark:text-white">Estrictamente Necesarias</td>
                <td className="p-3.5 font-mono text-[11px] text-[#7647eb] dark:text-[#a78bfa]">firebase:authUser:*</td>
                <td className="p-3.5">Gestión de sesión, token JWT y autenticación segura. Persistente. <strong>Obligatoria.</strong></td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold text-zinc-950 dark:text-white">Rendimiento & Caché</td>
                <td className="p-3.5 font-mono text-[11px] text-[#7647eb] dark:text-[#a78bfa]">mio_active_analysis, mio_result_*</td>
                <td className="p-3.5">Caché local en memoria del cliente para agilizar visualización de gráficos. Esencial.</td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold text-zinc-950 dark:text-white">Preferencias UI</td>
                <td className="p-3.5 font-mono text-[11px] text-[#7647eb] dark:text-[#a78bfa]">mio_consent_settings, mio_sound_enabled</td>
                <td className="p-3.5">Recuerda tus ajustes de tema (claro/oscuro), sonido analógico y consentimientos. Duración: 1 año.</td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold text-zinc-950 dark:text-white">Telemetría de Sistema</td>
                <td className="p-3.5 font-mono text-[11px] text-[#7647eb] dark:text-[#a78bfa]">system_logs</td>
                <td className="p-3.5">Registro diagnóstico de errores de ejecución en FastAPI/Firestore. Efímero.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3 */}
      <section id="sec-3" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          03 // TERCEROS
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          3. Cookies de terceros
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Únicamente interactuamos con servicios esenciales de infraestructura: Google Cloud Firebase (para validar tokens criptográficos de sesión segura) y Google Fonts (hospedaje de tipografías). No permitimos inyección de scripts por parte de redes publicitarias externas.
        </p>
      </section>

      {/* Section 4 */}
      <section id="sec-4" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          04 // NAVEGADORES
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          4. Cómo gestionar cookies en tu navegador
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Puedes restringir, bloquear o eliminar los datos de almacenamiento local de MIO o cualquier otro sitio mediante la configuración nativa de tu explorador:
        </p>
        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
          <li><strong>Google Chrome:</strong> Configuración &gt; Privacidad y seguridad &gt; Cookies de terceros.</li>
          <li><strong>Mozilla Firefox:</strong> Opciones &gt; Privacidad &amp; Seguridad &gt; Cookies y datos del sitio.</li>
          <li><strong>Apple Safari:</strong> Preferencias &gt; Privacidad &gt; Bloquear todas las cookies.</li>
          <li><strong>Microsoft Edge:</strong> Configuración &gt; Privacidad, búsqueda y servicios &gt; Borrar datos de exploración.</li>
        </ul>
      </section>

      {/* Section 5 — Interactive Action */}
      <section id="sec-5" className="scroll-mt-24 space-y-4 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          05 // CONTROL ACTIVO
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          5. Mecanismo de revocación y ajuste
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Puedes modificar o revocar tus elecciones de almacenamiento local directamente desde nuestra interfaz en cualquier momento haciendo clic en el siguiente control:
        </p>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('mio:open-cookie-preferences'))}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#7647eb] hover:bg-[#602cd1] text-white font-mono text-xs font-bold transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] shadow-md cursor-pointer"
        >
          <Settings className="w-4 h-4 text-[#bdf559]" />
          <span>Abrir Panel de Preferencias de Cookies</span>
        </button>
      </section>

      {/* Section 6 */}
      <section id="sec-6" className="scroll-mt-24 space-y-3 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#7647eb] dark:text-[#bdf559] font-semibold">
          06 // CONTACTO
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
          6. Contacto
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Si tienes preguntas sobre nuestra política de almacenamiento o necesitas asistencia técnica para el borrado de datos locales, escribe a{' '}
          <a href="mailto:privacidad@mio.app" className="underline font-semibold text-[#7647eb] dark:text-[#a78bfa]">
            privacidad@mio.app
          </a>.
        </p>
      </section>
    </LegalPageShell>
  );
};

export default CookiesPage;
