'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import { Cookie, Settings, ArrowLeft, Sliders } from 'lucide-react';

const MioBackgroundShader = dynamic(() => import('@/components/MioBackgroundShader'), {
  ssr: false,
});

export default function CookiePolicyPage() {
  const openCookiePreferences = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mio:open-cookie-preferences'));
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafc] text-gray-950 flex flex-col relative overflow-hidden selection:bg-mio-lime selection:text-black">
      {/* Fondo interactivo de Shaders MIO */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <MioBackgroundShader theme="light" opacity={0.35} />
      </div>

      <Navbar />

      <main id="main-content" tabIndex={-1} className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 relative z-10 focus:outline-none">
        {/* Header Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border border-zinc-200 bg-white/90 backdrop-blur-md text-gray-700 hover:text-gray-950 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al inicio</span>
          </Link>
        </div>

        {/* Title Banner */}
        <div className="border border-zinc-200/90 rounded-3xl bg-white/95 backdrop-blur-xl p-6 sm:p-10 shadow-sm mb-10 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#bdf559]/20 border border-[#bdf559]/40 font-mono text-xs font-bold uppercase tracking-wider mb-4 text-emerald-900">
            <Cookie className="w-3.5 h-3.5" />
            <span>Almacenamiento Local &amp; Cookies</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-950 font-sans">
            Política de Cookies
          </h1>
          <p className="mt-3 text-sm sm:text-base font-normal text-gray-600 leading-relaxed">
            Esta política explica cómo y por qué <strong>MIO</strong> utiliza cookies, <code className="bg-zinc-100 px-1.5 py-0.5 rounded font-mono text-xs">localStorage</code> y almacenamiento en el navegador para que la aplicación funcione de manera rápida y segura.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 items-center">
            <button
              onClick={openCookiePreferences}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7647eb] hover:bg-[#602cd1] text-white font-mono font-bold text-xs rounded-full shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Sliders className="w-3.5 h-3.5 text-[#bdf559]" />
              <span>Abrir Gestor de Preferencias</span>
            </button>
            <span className="text-xs font-mono font-medium text-gray-500">
              Septiembre 2026 • Rosario, Argentina
            </span>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {/* Section 1 */}
          <section className="border border-zinc-200/90 rounded-3xl bg-white/95 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#bdf559]/20 border border-[#bdf559]/40 flex items-center justify-center font-mono font-bold text-xs text-emerald-900">
                1
              </div>
              <h2 className="text-xl font-bold text-gray-950 font-sans">
                ¿Qué son las Cookies y el Almacenamiento Web?
              </h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              Las cookies y las API de almacenamiento local (<code className="bg-zinc-100 px-1 py-0.5 rounded font-mono text-xs">localStorage</code>, <code className="bg-zinc-100 px-1 py-0.5 rounded font-mono text-xs">sessionStorage</code> e <code className="bg-zinc-100 px-1 py-0.5 rounded font-mono text-xs">IndexedDB</code>) son pequeñas cantidades de datos que se guardan en tu navegador para recordar tus sesiones, acelerar la carga de gráficos y evitar repetir operaciones innecesarias.
            </p>
          </section>

          {/* Section 2: Categories */}
          <section className="border border-zinc-200/90 rounded-3xl bg-white/95 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#bdf559]/20 border border-[#bdf559]/40 flex items-center justify-center font-mono font-bold text-xs text-emerald-900">
                2
              </div>
              <h2 className="text-xl font-bold text-gray-950 font-sans">
                Tipos de Tecnologías Utilizadas en MIO
              </h2>
            </div>
            <div className="border border-zinc-200 rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 font-mono font-bold text-gray-700 uppercase">
                    <th className="p-3 border-r border-zinc-200">Categoría</th>
                    <th className="p-3 border-r border-zinc-200">Clave / Nombre</th>
                    <th className="p-3 border-r border-zinc-200">Finalidad</th>
                    <th className="p-3 border-r border-zinc-200">Duración</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-normal text-gray-700">
                  <tr>
                    <td className="p-3 border-r border-zinc-200 font-semibold">Estrictamente Necesarias</td>
                    <td className="p-3 border-r border-zinc-200 font-mono text-xs">firebase:authUser:*</td>
                    <td className="p-3 border-r border-zinc-200">Mantener la sesión autenticada segura entre pestañas</td>
                    <td className="p-3 border-r border-zinc-200">Persistente</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">Obligatoria</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-r border-zinc-200 font-semibold">Rendimiento y Caché</td>
                    <td className="p-3 border-r border-zinc-200 font-mono text-xs">mio_active_analysis, mio_result_*</td>
                    <td className="p-3 border-r border-zinc-200">Guardar el último análisis activo en memoria local para no recargar el dataset innecesariamente</td>
                    <td className="p-3 border-r border-zinc-200">Hasta limpiar caché</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">Obligatoria</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-r border-zinc-200 font-semibold">Preferencias</td>
                    <td className="p-3 border-r border-zinc-200 font-mono text-xs">mio_consent_settings, mio_sound_enabled</td>
                    <td className="p-3 border-r border-zinc-200">Recordar tu consentimiento legal y configuración de sonido</td>
                    <td className="p-3 border-r border-zinc-200">1 año</td>
                    <td className="p-3 font-mono font-bold text-[#7647eb]">Configurable</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-r border-zinc-200 font-semibold">Telemetría y Diagnóstico</td>
                    <td className="p-3 border-r border-zinc-200 font-mono text-xs">system_logs (Firestore)</td>
                    <td className="p-3 border-r border-zinc-200">Registrar eventos anónimos de error para corregir fallos</td>
                    <td className="p-3 border-r border-zinc-200">Efímero</td>
                    <td className="p-3 font-mono font-bold text-[#7647eb]">Configurable</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: Third Party */}
          <section className="border border-zinc-200/90 rounded-3xl bg-white/95 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#bdf559]/20 border border-[#bdf559]/40 flex items-center justify-center font-mono font-bold text-xs text-emerald-900">
                3
              </div>
              <h2 className="text-xl font-bold text-gray-950 font-sans">
                Cookies y Embebidos de Terceros
              </h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              En MIO <strong>no integramos píxeles de seguimiento publicitario</strong> invasivos (como Facebook Pixel o redes de retargeting).
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              El único tercero que establece almacenamiento funcional es <strong>Google Firebase</strong> al momento de iniciar sesión mediante Google Auth o correo electrónico con tokens protegidos con flags de seguridad.
            </p>
          </section>

          {/* Section 4: Management */}
          <section className="border border-zinc-200/90 rounded-3xl bg-white/95 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#bdf559]/20 border border-[#bdf559]/40 flex items-center justify-center font-mono font-bold text-xs text-emerald-900">
                4
              </div>
              <h2 className="text-xl font-bold text-gray-950 font-sans">
                Cómo Modificar o Revocar tu Consentimiento
              </h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              Podés cambiar tu configuración de cookies en cualquier momento haciendo clic en el botón inferior o en el enlace "Preferencias de Cookies" del pie de página.
            </p>
            <button
              onClick={openCookiePreferences}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#7647eb] hover:bg-[#602cd1] text-white font-mono font-bold text-xs rounded-full shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configurar mis opciones ahora</span>
            </button>
          </section>
        </div>

        {/* Footer actions */}
        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-zinc-900 hover:bg-black text-white font-mono font-bold text-xs rounded-full shadow-md transition-all"
          >
            Volver a MIO
          </Link>
        </div>
      </main>
    </div>
  );
}
