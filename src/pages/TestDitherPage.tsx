import React from 'react';
import { DitherArt, type DitherVariant } from '@/components/ui/DitherArt';

const VARIANTS: { v: DitherVariant; label: string }[] = [
  { v: 'sheet', label: 'Planilla caótica' },
  { v: 'anomalies', label: 'Anomalías' },
  { v: 'models', label: 'Modelos compitiendo' },
  { v: 'shap', label: 'Barras SHAP' },
  { v: 'chat', label: 'Chat' },
  { v: 'texture', label: 'Textura' },
];

export const TestDitherPage: React.FC = () => (
  <div className="max-w-[1200px] mx-auto px-6 py-16 space-y-12">
    <h1 className="font-climate text-4xl">Kit dither</h1>
    <div className="grid md:grid-cols-3 gap-6">
      {VARIANTS.map(({ v, label }) => (
        <figure key={v} className="space-y-2">
          <div className="h-[280px] rounded-mio border border-black/10 bg-white overflow-hidden">
            <DitherArt variant={v} seed={3} bleed={v === 'chat' ? 'none' : 'none'} />
          </div>
          <figcaption className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">{label}</figcaption>
        </figure>
      ))}
    </div>
    <div className="grid md:grid-cols-3 gap-6">
      {VARIANTS.map(({ v, label }) => (
        <div key={v} className="h-[280px] rounded-mio bg-[#0b0914] overflow-hidden" title={label}>
          <DitherArt variant={v} seed={3} tone="dark" pixelSize={2} bleed={v === 'sheet' ? 'left' : 'none'} />
        </div>
      ))}
    </div>
  </div>
);

export default TestDitherPage;
