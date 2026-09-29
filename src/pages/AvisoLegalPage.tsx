import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';

export const AvisoLegalPage: React.FC = () => {
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
        
        <h1 className="text-3xl font-bold mb-2">Aviso Legal</h1>
        <p className={`text-sm mb-8 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Última actualización: Septiembre 2026</p>

        <h2 className="text-xl font-bold mt-10 mb-4">1. Titularidad del sitio web</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          El presente sitio web y la plataforma en la nube son operados y titularidad de <strong>MIO Technologies</strong> ([RAZÓN SOCIAL]), con Clave Única de Identificación Tributaria (CUIT): [CUIT: XX-XXXXXXXX-X].
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">2. Domicilio legal</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          [DOMICILIO LEGAL], Ciudad de Rosario, Provincia de Santa Fe, República Argentina.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">3. Representante legal y Fundadores</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Fundadores: Tadeo Muñoz Garcés & Milena Abraham.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">4. Contacto</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Puedes ponerte en contacto con nosotros a través de los siguientes canales oficiales:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm mb-4">
          <li>Asuntos legales corporativos: <a href="mailto:legal@mio.app" className="underline">legal@mio.app</a></li>
          <li>Privacidad y protección de datos: <a href="mailto:privacidad@mio.app" className="underline">privacidad@mio.app</a></li>
        </ul>

        <h2 className="text-xl font-bold mt-10 mb-4">5. Objeto del sitio</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          El sitio tiene por objeto ofrecer una plataforma SaaS de análisis de datos y Automated Machine Learning (AutoML), brindando herramientas para que los usuarios puedan subir sus propios datos, analizarlos y obtener predicciones estadísticas o narrativas automatizadas.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">6. Propiedad intelectual</h2>
        <div className={`p-4 rounded-xl border mb-4 ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
          <p className="text-sm">Todo el software, diseños de interfaz, marcas registradas, nombres comerciales, logotipos, textos, algoritmos y códigos fuente contenidos en el sitio web son propiedad exclusiva de MIO Technologies o de sus licenciantes y están protegidos por las leyes y tratados internacionales sobre propiedad intelectual.</p>
        </div>

        <h2 className="text-xl font-bold mt-10 mb-4">7. Ley aplicable y jurisdicción</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Este Aviso Legal y todas las relaciones jurídicas que de él se deriven se regirán de conformidad con las leyes de la República Argentina. Toda controversia será dirimida en los Tribunales Ordinarios de la Ciudad de Rosario, Santa Fe.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">8. Auditoría y transparencia algorítmica</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          MIO asume un compromiso ético hacia el desarrollo de Inteligencia Artificial explicable. Operamos alineados con los estándares internacionales de la EU AI Act, asegurando transparencia en cómo nuestros algoritmos de AutoML infieren resultados.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-4">9. Órgano de control</h2>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          En Argentina, la Agencia de Acceso a la Información Pública (AAIP) es el órgano de control encargado de la aplicación y supervisión de la Ley N° 25.326 de Protección de Datos Personales. Los usuarios pueden dirigir sus denuncias a dicho organismo en caso de considerar vulnerados sus derechos.
        </p>
      </div>
    </div>
  );
};
export default AvisoLegalPage;
