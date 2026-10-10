import React, { useEffect, useRef } from 'react';
import { useMioStore } from '@/utils/useMioStore';
import { drawBlueprint } from '@/lib/motionVerbs';

/**
 * DataBlueprint — where a sheet goes, drawn as a technical drawing.
 *
 * It states exactly what the copy next to it states (analysed in memory, not stored unless you sign
 * in, and then only the result) and nothing more. Line art in one ink colour with a violet path for
 * the data; it draws itself once when it comes into view. Desktop and tablet only: on a phone the
 * ledger below says the same in words.
 */
export const DataBlueprint: React.FC<{ className?: string }> = ({ className = '' }) => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    return drawBlueprint(svg, svg);
  }, []);

  const ink = isDark ? '#e4e4e7' : '#18181b';
  const faint = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(24,24,27,0.4)';
  const route = '#7647eb';
  const label = { fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.04em' } as const;
  const small = { fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 } as const;

  const line = { fill: 'none', strokeWidth: 1.5, strokeLinecap: 'square' as const };

  return (
    <svg
      ref={ref}
      viewBox="0 0 1200 300"
      role="img"
      aria-label="Recorrido de tu planilla: se analiza en memoria y vos ves el diagnóstico. Si iniciás sesión, se guarda el resultado, no la planilla. No pasa por publicidad ni por terceros."
      className={`hidden w-full md:block ${className}`}
    >
      {/* dimension line */}
      <g data-draw-group>
        <path data-draw pathLength={1} d="M40 22 H1160" stroke={faint} {...line} strokeWidth={1} />
        {[40, 480, 840, 1160].map((x) => (
          <path key={x} data-draw pathLength={1} d={`M${x} 14 V30`} stroke={faint} {...line} strokeWidth={1} />
        ))}
      </g>
      <g data-ink fill={faint} style={small} fontSize="12">
        <text x="260" y="14" textAnchor="middle">1 · SUBÍS</text>
        <text x="660" y="14" textAnchor="middle">2 · SE ANALIZA, AL MOMENTO</text>
        <text x="1000" y="14" textAnchor="middle">3 · LO VES VOS</text>
      </g>

      {/* nodes */}
      <rect data-draw pathLength={1} x="40" y="60" width="300" height="110" rx="10" stroke={ink} {...line} />
      <rect data-draw pathLength={1} x="480" y="60" width="360" height="110" rx="10" stroke={route} {...line} strokeWidth={2.5} />
      <rect data-draw pathLength={1} x="900" y="60" width="260" height="110" rx="10" stroke={ink} {...line} />

      {/* the route of the data */}
      <path data-draw pathLength={1} d="M340 115 H480" stroke={route} {...line} strokeWidth={2.5} />
      <path data-draw pathLength={1} d="M840 115 H900" stroke={route} {...line} strokeWidth={2.5} />
      <path data-draw pathLength={1} d="M470 107 L480 115 L470 123" stroke={route} {...line} strokeWidth={2.5} />
      <path data-draw pathLength={1} d="M890 107 L900 115 L890 123" stroke={route} {...line} strokeWidth={2.5} />

      <g data-ink fill={ink} style={label}>
        <text x="64" y="104" fontSize="20">TU PLANILLA</text>
        <text x="504" y="104" fontSize="20" fill={route}>ANÁLISIS EN MEMORIA</text>
        <text x="924" y="104" fontSize="20">TU DIAGNÓSTICO</text>
      </g>
      <g data-ink fill={faint} style={small} fontSize="14">
        <text x="64" y="132">.xlsx · .csv</text>
        <text x="64" y="152">sin registro</text>
        <text x="504" y="132">se procesa y se descarta</text>
        <text x="504" y="152">no queda copia de tu planilla</text>
        <text x="924" y="132">anomalías, predicción,</text>
        <text x="924" y="152">y el porqué de cada número</text>
      </g>

      {/* with a session: only the result is kept */}
      <g data-ink>
        <path d="M1030 170 V214" stroke={ink} {...line} strokeDasharray="5 6" />
        <path d="M1022 206 L1030 214 L1038 206" stroke={ink} {...line} />
      </g>
      <rect data-draw pathLength={1} x="900" y="214" width="260" height="70" rx="10" stroke={ink} {...line} />
      <g data-ink fill={ink} style={label}>
        <text x="924" y="244" fontSize="18">TUS PROYECTOS</text>
      </g>
      <g data-ink fill={faint} style={small} fontSize="13">
        <text x="924" y="266">con sesión: solo el resultado</text>
      </g>

      {/* what it does not touch */}
      <g data-ink>
        <path d="M660 170 V214" stroke={faint} {...line} strokeDasharray="5 6" />
      </g>
      <rect data-ink x="520" y="214" width="280" height="70" rx="10" stroke={faint} {...line} strokeDasharray="6 6" />
      <g data-ink>
        <path d="M640 206 L680 222 M680 206 L640 222" stroke="#ef4444" {...line} strokeWidth={2.5} />
      </g>
      <g data-ink fill={ink} style={label}>
        <text x="544" y="244" fontSize="18">PUBLICIDAD · TERCEROS</text>
      </g>
      <g data-ink fill={faint} style={small} fontSize="13">
        <text x="544" y="266">no pasa por acá</text>
      </g>
    </svg>
  );
};

export default DataBlueprint;
