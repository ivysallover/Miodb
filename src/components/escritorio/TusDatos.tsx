import React, { useEffect, useState } from 'react';
import { FileWarning, FolderSearch } from 'lucide-react';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { desktop } from './desktop';
import { lilac, muted, slab, slabText, soft, surface } from './ui';

/** Un punto de una lista: qué es y, debajo, lo que hay que saber. */
const Item: React.FC<{ title: string; children: React.ReactNode; action?: React.ReactNode }> = ({ title, children, action }) => (
  <li className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0">
      <h3 className="text-[16px] font-bold">{title}</h3>
      <p className="mt-1 max-w-xl text-[14px] leading-relaxed opacity-80">{children}</p>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </li>
);

/**
 * "Tus datos": qué queda en esta compu (las planillas, lo guardado, lo exportado, el registro de
 * errores), lo único que sale (la cuenta) y que no hay IA. Cada cosa con dónde verla.
 */
export const TusDatos: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [folders, setFolders] = useState({ proyectos: '', registro: '' });
  useEffect(() => {
    Promise.all([desktop.projectsFolder().catch(() => ''), desktop.logFolder().catch(() => '')]).then(([proyectos, registro]) => setFolders({ proyectos, registro }));
  }, []);
  const show = (path: string, label: string, Icon: React.FC<{ className?: string }>) => (
    <button type="button" onClick={() => desktop.reveal(path)} disabled={!path} className={soft(isDark)}>
      <Icon className="h-4 w-4" aria-hidden /> {label}
    </button>
  );

  return (
    <>
      <section className={`relative flex flex-col gap-6 overflow-hidden rounded-mio p-7 sm:p-10 ${slab(isDark)}`}>
        <h1 className="max-w-[16ch] text-4xl font-extrabold leading-[1.02] tracking-[-0.04em] sm:text-5xl">Tus planillas no salen de esta compu.</h1>
        <p className={`max-w-2xl text-lg leading-relaxed ${slabText(isDark)}`}>
          MIO las lee y las analiza acá: no las sube a ningún servidor, no las modifica y no usa inteligencia artificial. Funciona sin internet una vez que ingresaste.
        </p>
        <div aria-hidden className="pointer-events-none absolute -bottom-4 right-6 hidden lg:block">
          <MioPet2D mood="durmiendo" size={150} showShadow={false} animated />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-2.5 sm:gap-3 xl:grid-cols-2">
        <section className={`rounded-mio p-6 sm:p-8 ${surface(isDark)}`}>
          <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Lo que queda acá</h2>
          <ul className="mt-6 space-y-6">
            <Item title="Tus planillas">Se leen tal cual están, en su carpeta. MIO nunca las cambia ni las copia a otro lado.</Item>
            <Item title="Los análisis" action={show(folders.proyectos, 'Mostrar', FolderSearch)}>
              Cada proyecto se guarda en la carpeta de la app, para abrirlo sin recalcular y decir qué cambió la próxima vez. Se borran en Ajustes.
            </Item>
            <Item title="Lo que exportás">El informe, el Excel o el CSV van solo a donde elegís, cuando lo pedís.</Item>
            <Item title="El registro de errores" action={show(folders.registro, 'Mostrar', FileWarning)}>
              Si algo falla, queda anotado en un archivo de esta compu para ver qué pasó. No se manda a nadie: si nos querés contar, lo mandás vos.
            </Item>
          </ul>
        </section>

        <section className="rounded-mio bg-[#7647eb] p-6 text-white sm:p-8">
          <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Lo único que sale</h2>
          <ul className="mt-6 space-y-6">
            <Item title="Tu cuenta">Al ingresar, tu mail y que aceptaste los términos (con su versión y la fecha), en tu cuenta de MIO. Lo guarda Firebase, de Google.</Item>
            <Item title="Entrar con Google">Se hace en el navegador de tu compu, con la página de Google. La app recibe solo el permiso para entrar.</Item>
            <Item title="Nada de tus planillas">Ni filas, ni nombres de archivos, ni resultados. Tampoco hay publicidad ni medición de uso.</Item>
          </ul>
        </section>
      </div>

      <section className={`rounded-mio p-6 sm:p-8 ${lilac(isDark)}`}>
        <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Sin inteligencia artificial</h2>
        <p className={`mt-2 max-w-3xl text-base leading-relaxed ${muted(isDark)}`}>
          Los resultados salen de cálculos que se pueden explicar: sumas, promedios, desvíos, qué tan seguido se mueven dos columnas juntas y modelos de predicción que compiten entre sí sobre datos que se esconden. Corren en esta compu y dan siempre lo mismo con la misma planilla. La Guía cuenta cómo se lee cada parte.
        </p>
      </section>
    </>
  );
};
