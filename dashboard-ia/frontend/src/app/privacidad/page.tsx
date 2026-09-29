'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import { ShieldCheck, Database, ArrowLeft, EyeOff, Ban } from 'lucide-react';

const MioBackgroundShader = dynamic(() => import('@/components/MioBackgroundShader'), {
  ssr: false,
});

export default function PrivacyPage() {
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
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Documento Oficial de Cumplimiento Legal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-950 font-sans">
            Política de Privacidad
          </h1>
          <p className="mt-3 text-sm sm:text-base font-normal text-gray-600 leading-relaxed">
            En <strong>MIO (Intelligent Data Operations &amp; AutoML)</strong> nos comprometemos con la máxima protección, confidencialidad y soberanía sobre tus datos empresariales y personales.
          </p>
          <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap gap-4 text-xs font-mono font-medium text-gray-500">
            <span>Última actualización: Septiembre 2026</span>
            <span>•</span>
            <span>Ley 25.326 &amp; GDPR Compliant • Rosario, Argentina</span>
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
                Responsable del Tratamiento
              </h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              El responsable del tratamiento de los datos recolectados y procesados a través de la plataforma MIO es el equipo operativo de <strong>MIO</strong>, con sede en <strong>Rosario, Santa Fe, República Argentina</strong>.
            </p>
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 font-mono text-xs text-gray-800 space-y-1">
              <p><strong>Contacto de Privacidad y Delegado de Protección de Datos (DPO):</strong></p>
              <p>Email: <a href="mailto:privacidad@mio.app" className="underline font-bold text-[#7647eb]">privacidad@mio.app</a> / <a href="mailto:tadeomunozgarces@gmail.com" className="underline font-bold text-[#7647eb]">tadeomunozgarces@gmail.com</a></p>
              <p className="text-gray-500">Sede: Rosario, Santa Fe, Argentina</p>
            </div>
          </section>

          {/* Section 2: Data Minimization */}
          <section className="border border-zinc-200/90 rounded-3xl bg-white/95 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#bdf559]/20 border border-[#bdf559]/40 flex items-center justify-center font-mono font-bold text-xs text-emerald-900">
                2
              </div>
              <h2 className="text-xl font-bold text-gray-950 font-sans">
                Principio de Minimización de Datos
              </h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              Aplicamos rigurosamente el principio de minimización de datos (artículo 5 del GDPR y artículo 4 de la Ley 25.326). <strong>Nunca solicitamos ni procesamos información superflua</strong>.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50/70">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-950 mb-1.5 font-sans">
                  <Database className="w-4 h-4 text-[#7647eb]" />
                  <span>Datos de Cuenta y Acceso</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Únicamente correo electrónico y credencial cifrada generada mediante Firebase Authentication (Google Cloud) para validar tu sesión y permitirte guardar tus proyectos.
                </p>
              </div>

              <div className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50/70">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-950 mb-1.5 font-sans">
                  <EyeOff className="w-4 h-4 text-[#7647eb]" />
                  <span>Archivos y Conjuntos de Datos</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Archivos CSV/Excel subidos para análisis. El motor procesa exclusivamente las columnas necesarias para el modelo predictivo o exploratorio. Las columnas marcadas para ignorar son descartadas.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Training & Non-Sale */}
          <section className="border border-zinc-200/90 rounded-3xl bg-white/95 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#bdf559]/20 border border-[#bdf559]/40 flex items-center justify-center font-mono font-bold text-xs text-emerald-900">
                3
              </div>
              <h2 className="text-xl font-bold text-gray-950 font-sans">
                Compromiso de No-Venta y Confidencialidad de IA
              </h2>
            </div>
            <div className="p-4 bg-[#bdf559]/15 border border-[#bdf559]/40 rounded-2xl mb-4">
              <p className="text-xs sm:text-sm font-bold text-emerald-900">
                🛡️ En MIO tus datos son tuyos. No vendemos, no alquilamos ni comercializamos tus conjuntos de datos con ningún tercero bajo ninguna circunstancia.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
              <li>
                <strong>Tus datos no entrenan modelos globales:</strong> Los modelos de Machine Learning y heurísticas se ejecutan en tu entorno de trabajo privado. No utilizamos tu información propietaria para reentrenar modelos públicos.
              </li>
              <li>
                <strong>Cómputo en Memoria:</strong> El análisis exploratorio y los algoritmos AutoML procesan las tablas en entornos efímeros de cómputo de alta seguridad.
              </li>
              <li>
                <strong>Aislamiento de Usuarios:</strong> La base de datos Firestore aplica reglas de seguridad que impiden terminantemente que un usuario acceda a proyectos o metadatos de otro usuario.
              </li>
            </ul>
          </section>

          {/* Section 4: Subprocessors */}
          <section className="border border-zinc-200/90 rounded-3xl bg-white/95 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#bdf559]/20 border border-[#bdf559]/40 flex items-center justify-center font-mono font-bold text-xs text-emerald-900">
                4
              </div>
              <h2 className="text-xl font-bold text-gray-950 font-sans">
                Proveedores de Infraestructura (Sub-encargados)
              </h2>
            </div>
            <div className="border border-zinc-200 rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 font-mono font-bold uppercase text-gray-700">
                    <th className="p-3 border-r border-zinc-200">Proveedor</th>
                    <th className="p-3 border-r border-zinc-200">Finalidad</th>
                    <th className="p-3 border-r border-zinc-200">Ubicación</th>
                    <th className="p-3">Garantías de Privacidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-normal text-gray-700">
                  <tr>
                    <td className="p-3 border-r border-zinc-200 font-semibold">Google Cloud / Firebase</td>
                    <td className="p-3 border-r border-zinc-200">Autenticación de usuarios y persistencia de proyectos</td>
                    <td className="p-3 border-r border-zinc-200">Global (ISO 27001, SOC 2/3)</td>
                    <td className="p-3">Standard Contractual Clauses (SCC) &amp; Cifrado AES-256</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-r border-zinc-200 font-semibold">FastAPI Engine</td>
                    <td className="p-3 border-r border-zinc-200">Servidor backend de cómputo y procesamiento AutoML</td>
                    <td className="p-3 border-r border-zinc-200">Localhost / Cloud Secure</td>
                    <td className="p-3">Canales HTTPS/TLS 1.3 y aislamiento de procesos</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5: ARCO Rights */}
          <section className="border border-zinc-200/90 rounded-3xl bg-white/95 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#bdf559]/20 border border-[#bdf559]/40 flex items-center justify-center font-mono font-bold text-xs text-emerald-900">
                5
              </div>
              <h2 className="text-xl font-bold text-gray-950 font-sans">
                Tus Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)
              </h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              De acuerdo con la <strong>Ley 25.326 de Protección de los Datos Personales de la República Argentina</strong> y normativas globales afines (GDPR), tenés pleno derecho a acceder, rectificar o solicitar la eliminación total de tus registros en cualquier momento escribiendo a <a href="mailto:privacidad@mio.app" className="underline font-bold text-[#7647eb]">privacidad@mio.app</a>.
            </p>
          </section>

          {/* Section 6: Right to Refuse Service */}
          <section className="border border-zinc-200/90 rounded-3xl bg-white/95 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 border border-red-200 flex items-center justify-center font-mono font-bold text-xs">
                6
              </div>
              <h2 className="text-xl font-bold text-gray-950 font-sans">
                Reserva del Derecho de Prestación de Servicio
              </h2>
            </div>
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-3 flex items-start gap-3">
              <Ban className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs sm:text-sm text-red-950 leading-relaxed">
                MIO se reserva expresamente la potestad de denegar, restringir, suspender o dar por finalizada la prestación del servicio y dar de baja el acceso o la cuenta de cualquier usuario que incumpla los principios de esta Política de Privacidad, los Términos y Condiciones o que utilice la plataforma para fines ilícitos.
              </p>
            </div>
          </section>
        </div>

        {/* Footer actions */}
        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-zinc-900 hover:bg-black text-white font-mono font-bold text-xs rounded-full shadow-md transition-all"
          >
            Entendido, volver a MIO
          </Link>
        </div>
      </main>
    </div>
  );
}
