'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import { FileText, AlertTriangle, ArrowLeft, Ban } from 'lucide-react';

const MioBackgroundShader = dynamic(() => import('@/components/MioBackgroundShader'), {
  ssr: false,
});

export default function TermsPage() {
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
            <FileText className="w-3.5 h-3.5" />
            <span>Condiciones de Servicio & Acuerdo Legal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-950 font-sans">
            Términos y Condiciones
          </h1>
          <p className="mt-3 text-sm sm:text-base font-normal text-gray-600 leading-relaxed">
            Por favor, leé atentamente estos Términos y Condiciones antes de utilizar la plataforma y los servicios de <strong>MIO</strong>.
          </p>
          <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap gap-4 text-xs font-mono font-medium text-gray-500">
            <span>Última actualización: Septiembre 2026</span>
            <span>•</span>
            <span>Versión 2.2 • Rosario, Argentina</span>
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
                Aceptación de los Términos
              </h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              Al registrar una cuenta, acceder a la web o cargar datasets para su procesamiento en <strong>MIO</strong>, el usuario declara haber leído, entendido y aceptado en su totalidad estos Términos y Condiciones, así como nuestra <Link href="/privacidad" className="underline font-bold text-[#7647eb] hover:text-black">Política de Privacidad</Link>. Si no estás de acuerdo con alguna cláusula, debes abstenerte de utilizar la plataforma.
            </p>
          </section>

          {/* Section 2: Intellectual Property & Data Ownership */}
          <section className="border border-zinc-200/90 rounded-3xl bg-white/95 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#bdf559]/20 border border-[#bdf559]/40 flex items-center justify-center font-mono font-bold text-xs text-emerald-900">
                2
              </div>
              <h2 className="text-xl font-bold text-gray-950 font-sans">
                Propiedad Intelectual y Titularidad de los Datos
              </h2>
            </div>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <p>
                <strong>Tus Datos y Resultados son Tuyos:</strong> Vos retenés el 100% de la titularidad, propiedad intelectual y derechos de autor sobre los archivos de datos (CSVs/Excel) que cargás y sobre los reportes, gráficos y métricas generadas a partir de ellos. MIO no reclama ninguna titularidad sobre tus datos.
              </p>
              <p>
                <strong>Propiedad de la Plataforma:</strong> El software, algoritmos, interfaz gráfica, diseño, marcas, logotipos y código fuente de MIO son propiedad exclusiva de MIO y están protegidos por las leyes de propiedad intelectual internacionales y de la República Argentina.
              </p>
            </div>
          </section>

          {/* Section 3: Permitted & Prohibited Uses */}
          <section className="border border-zinc-200/90 rounded-3xl bg-white/95 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#bdf559]/20 border border-[#bdf559]/40 flex items-center justify-center font-mono font-bold text-xs text-emerald-900">
                3
              </div>
              <h2 className="text-xl font-bold text-gray-950 font-sans">
                Uso Permitido y Conductas Prohibidas
              </h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              El usuario se compromete a hacer un uso lícito del servicio y a abstenerse de:
            </p>
            <ul className="space-y-1.5 text-sm text-gray-700 list-disc list-inside">
              <li>Subir conjuntos de datos obtenidos de manera ilícita o que violen secretos comerciales o derechos de terceros.</li>
              <li>Cargar archivos maliciosos, scripts ejecutables camuflados o virus informáticos.</li>
              <li>Intentar descompilar, realizar ingeniería inversa o vulnerar los mecanismos de seguridad de la API o de la base de datos.</li>
              <li>Utilizar el servicio para fines fraudulentos o para procesar datos sensibles prohibidos por la ley sin consentimiento previo.</li>
            </ul>
          </section>

          {/* Section 4: AI & ML Disclaimer */}
          <section className="border border-zinc-200/90 rounded-3xl bg-white/95 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#bdf559]/20 border border-[#bdf559]/40 flex items-center justify-center font-mono font-bold text-xs text-emerald-900">
                4
              </div>
              <h2 className="text-xl font-bold text-gray-950 font-sans">
                Alcance y Descargo de Responsabilidad sobre IA y AutoML
              </h2>
            </div>
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl mb-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium text-amber-900 leading-relaxed">
                Importante: MIO proporciona herramientas analíticas predictivas basadas en algoritmos estadísticos y modelos de aprendizaje automático. Los resultados, correlaciones, segmentaciones y proyecciones representan estimaciones analíticas y no constituyen asesoramiento financiero, legal, contable ni médico vinculante.
              </p>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              La calidad, precisión y representatividad de los modelos generados dependen directamente de la calidad e integridad de los datos cargados por el usuario. MIO no se responsabiliza por decisiones comerciales tomadas con base en los análisis automatizados.
            </p>
          </section>

          {/* Section 5: Reserva del Derecho de Prestación de Servicio */}
          <section className="border border-zinc-200/90 rounded-3xl bg-white/95 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 border border-red-200 flex items-center justify-center font-mono font-bold text-xs">
                5
              </div>
              <h2 className="text-xl font-bold text-gray-950 font-sans">
                Reserva del Derecho de Admisión y Cancelación de Servicio
              </h2>
            </div>
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-4 flex items-start gap-3">
              <Ban className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-xs font-mono font-bold text-red-900 uppercase tracking-wide mb-1">
                  Facultad Discrecional de Suspensión y Rescisión
                </p>
                <p className="text-xs sm:text-sm text-red-800 leading-relaxed">
                  <strong>MIO se reserva expresamente el derecho discrecional de rechazar, suspender temporalmente o cancelar de forma definitiva la prestación del servicio</strong>, así como revocar el acceso a la plataforma o dar de baja cualquier cuenta de usuario ante incumplimiento de los presentes Términos y Condiciones.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Ley Aplicable y Jurisdicción */}
          <section className="border border-zinc-200/90 rounded-3xl bg-white/95 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#bdf559]/20 border border-[#bdf559]/40 flex items-center justify-center font-mono font-bold text-xs text-emerald-900">
                6
              </div>
              <h2 className="text-xl font-bold text-gray-950 font-sans">
                Ley Aplicable y Jurisdicción
              </h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              Estos Términos y Condiciones se regirán e interpretarán de conformidad con las leyes de la <strong>República Argentina</strong>. Cualquier divergencia o litigio que surja en relación con su interpretación o validez será sometido a los Tribunales Ordinarios de la Ciudad de <strong>Rosario, Provincia de Santa Fe, República Argentina</strong>.
            </p>
          </section>
        </div>

        {/* Footer actions */}
        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#7647eb] hover:bg-[#602cd1] text-white font-mono font-bold text-xs rounded-full shadow-md hover:shadow-lg transition-all"
          >
            Aceptar y volver a MIO
          </Link>
        </div>
      </main>
    </div>
  );
}
