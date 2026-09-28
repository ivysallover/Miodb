import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';

export const CookiesPage: React.FC = () => {
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
        
        <h1 className="text-3xl font-bold mb-2">Política de Cookies</h1>
        <p className={`text-sm mb-8 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Última actualización: Septiembre 2026</p>

        <h2 className="text-xl font-bold mt-10 mb-4">1. Qué son las cookies y tecnologías similares</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          En MIO Technologies utilizamos cookies, pero preferentemente nos apoyamos en tecnologías de almacenamiento local más modernas, seguras y eficientes como <code>localStorage</code>, <code>sessionStorage</code> e <code>IndexedDB</code> del navegador. Estas tecnologías nos permiten mantener tu sesión activa, recordar tus preferencias de la interfaz y almacenar temporalmente los resultados de los análisis para mejorar el rendimiento.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">2. Clasificación de tecnologías utilizadas</h2>
        <div className="overflow-x-auto mb-4">
          <table className={`w-full text-xs text-left border-collapse ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            <thead>
              <tr className={`border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <th className="p-3 font-semibold">Tipo</th>
                <th className="p-3 font-semibold">Nombre / Clave</th>
                <th className="p-3 font-semibold">Propósito y Duración</th>
              </tr>
            </thead>
            <tbody>
              <tr className={`border-b ${isDark ? 'border-zinc-800/50' : 'border-zinc-100'}`}>
                <td className="p-3 font-medium">Estrictamente Necesarias</td>
                <td className="p-3 font-mono text-[10px]">firebase:authUser:*</td>
                <td className="p-3">Gestión de identidad y autenticación. Persistente. <strong>Obligatoria.</strong></td>
              </tr>
              <tr className={`border-b ${isDark ? 'border-zinc-800/50' : 'border-zinc-100'}`}>
                <td className="p-3 font-medium">Rendimiento y Caché</td>
                <td className="p-3 font-mono text-[10px]">mio_active_analysis, mio_result_*</td>
                <td className="p-3">Memoria local para agilizar la plataforma. Técnica esencial.</td>
              </tr>
              <tr className={`border-b ${isDark ? 'border-zinc-800/50' : 'border-zinc-100'}`}>
                <td className="p-3 font-medium">Preferencias</td>
                <td className="p-3 font-mono text-[10px]">mio_consent_settings, mio_sound_enabled, mio_data_consent_granted</td>
                <td className="p-3">Recuerda tus ajustes de interfaz y privacidad. Duración 1 año. Configurable.</td>
              </tr>
              <tr className={`border-b ${isDark ? 'border-zinc-800/50' : 'border-zinc-100'}`}>
                <td className="p-3 font-medium">Telemetría</td>
                <td className="p-3 font-mono text-[10px]">system_logs</td>
                <td className="p-3">Registro de errores de sistema en Firestore. Efímero. Configurable.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-bold mt-10 mb-4">3. Cookies de terceros</h2>
        <div className={`p-4 rounded-xl border mb-4 ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
          <p className="text-sm font-medium">Nuestra postura anti-rastreo:</p>
          <p className="text-sm mt-2">En MIO <strong>NO</strong> utilizamos píxeles publicitarios, ni rastreadores de marketing de terceros, ni redes de retargeting invasivas.</p>
        </div>

        <h2 className="text-xl font-bold mt-10 mb-4">4. Cómo gestionar cookies en tu navegador</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Puedes restringir, bloquear o borrar las cookies y el almacenamiento de MIO o cualquier otra web utilizando los ajustes de tu navegador:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm mb-4">
          <li><strong>Google Chrome:</strong> Configuración &gt; Privacidad y seguridad &gt; Cookies y otros datos de sitios.</li>
          <li><strong>Mozilla Firefox:</strong> Opciones &gt; Privacidad &amp; Seguridad &gt; Cookies y datos del sitio.</li>
          <li><strong>Microsoft Edge:</strong> Configuración &gt; Privacidad, búsqueda y servicios &gt; Borrar datos de exploración.</li>
          <li><strong>Apple Safari:</strong> Preferencias &gt; Privacidad &gt; Bloquear todas las cookies.</li>
        </ul>

        <h2 className="text-xl font-bold mt-10 mb-4">5. Mecanismo de revocación</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Puedes volver a configurar tus opciones de consentimiento directamente desde nuestra plataforma en cualquier momento:
        </p>
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('mio:open-cookie-preferences'))}
          className={`px-4 py-2 mt-2 rounded-lg text-sm font-medium border transition-colors ${
            isDark 
              ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white' 
              : 'bg-white border-zinc-300 hover:bg-zinc-50 text-zinc-900'
          }`}
        >
          Abrir preferencias de cookies
        </button>

        <h2 className="text-xl font-bold mt-10 mb-4">6. Contacto</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Si tienes dudas o preguntas sobre nuestra Política de Cookies, no dudes en escribirnos a <a href="mailto:privacidad@mio.app" className="underline">privacidad@mio.app</a>.
        </p>
      </div>
    </div>
  );
};
export default CookiesPage;
