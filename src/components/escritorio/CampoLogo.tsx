import React from 'react';
import { ImagePlus } from 'lucide-react';
import { LINK, soft } from './ui';

/** La imagen, achicada (hasta 360 × 120 px, en PNG): entra en lo que guarda la compu y en el informe se ve nítida. */
const shrink = (file: File) =>
  new Promise<string>((done, fail) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 360 / img.naturalWidth, 120 / img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      done(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      fail(new Error('No pude leer esa imagen.'));
    };
    img.src = url;
  });

/** Elegir el logo que va arriba del informe (o quitarlo), con su vista previa. */
export const CampoLogo: React.FC<{ logo: string; onChange: (logo: string) => void; isDark: boolean }> = ({ logo, onChange, isDark }) => (
  <span className="flex flex-wrap items-center gap-2">
    {logo && <img src={logo} alt="El logo elegido" className="h-10 max-w-[10rem] rounded-mio-sm bg-white object-contain p-1" />}
    <label className={`${soft(isDark)} focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-pal-violet`}>
      <ImagePlus className="h-4 w-4" aria-hidden /> {logo ? 'Cambiar' : 'Elegir imagen'}
      <input
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) shrink(file).then(onChange).catch(() => undefined);
        }}
      />
    </label>
    {logo && (
      <button type="button" onClick={() => onChange('')} className={LINK}>
        Quitar
      </button>
    )}
  </span>
);
