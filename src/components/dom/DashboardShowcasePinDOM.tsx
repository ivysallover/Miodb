import React, { useRef, useState, useEffect } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useMioStore, PetMood } from '@/utils/useMioStore';
import { playMioDevSound } from '@/lib/sound';
import { FlipText } from '@/components/ui/FlipText';
import { BubbleArrowButton } from '@/components/ui/BubbleArrowButton';
import { navigateWithDither } from '@/components/ui/DitherRouteCurtain';
import {
  AlertTriangle,
  TrendingUp,
  Sliders,
  ArrowRight,
  Database,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  Activity,
  Maximize2
} from 'lucide-react';

type ShowcaseTab = 'anomalias' | 'forecasting' | 'shap';

interface AnomalyRow {
  id: string;
  variable: string;
  sigma: string;
  severity: 'CRÍTICO' | 'SEVERO' | 'MODERADO';
  timestamp: string;
  impact: string;
}

const SAMPLE_ANOMALIES: AnomalyRow[] = [
  { id: 'ROW_4821', variable: 'Costo Logístico Última Milla', sigma: '+3.82σ', severity: 'CRÍTICO', timestamp: '2026-09-14 18:22', impact: '+$14.2k USD' },
  { id: 'ROW_1049', variable: 'Descuento Promocional Cruzado', sigma: '-3.31σ', severity: 'SEVERO', timestamp: '2026-09-18 11:05', impact: '-$8.6k USD' },
  { id: 'ROW_9084', variable: 'Devoluciones por Falla de Lote', sigma: '+3.14σ', severity: 'CRÍTICO', timestamp: '2026-09-24 16:40', impact: '+$11.0k USD' },
  { id: 'ROW_3312', variable: 'Dispersión de Tiempo de Entrega', sigma: '+2.95σ', severity: 'MODERADO', timestamp: '2026-09-29 09:15', impact: '+$4.1k USD' },
];

export const DashboardShowcasePinDOM: React.FC = () => {
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';
  const setPetMood = useMioStore((s) => s.setPetMood);

  const containerRef = useRef<HTMLDivElement>(null);
  const pinnedCardRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('anomalias');
  const [forecastHorizon, setForecastHorizon] = useState<'30D' | '60D' | '90D'>('60D');

  const switchTab = (tab: ShowcaseTab, manual = true) => {
    if (manual) playMioDevSound('select');
    setActiveTab(tab);

    const moodMap: Record<ShowcaseTab, PetMood> = {
      anomalias: 'anomalia',
      forecasting: 'trabajando',
      shap: 'celebrando',
    };
    setPetMood(moodMap[tab]);
  };

  useEffect(() => {
    const container = containerRef.current;
    const card = pinnedCardRef.current;
    if (!container || !card) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: container,
        pin: card,
        start: 'top top',
        end: '+=180%',
        scrub: 0.6,
        onUpdate: (self) => {
          const progress = self.progress;
          if (progress < 0.33) {
            setActiveTab('anomalias');
            setPetMood('anomalia');
          } else if (progress < 0.68) {
            setActiveTab('forecasting');
            setPetMood('trabajando');
          } else {
            setActiveTab('shap');
            setPetMood('celebrando');
          }
        },
      });
    }, container);

    return () => ctx.revert();
  }, [setPetMood]);

  return (
    <section
      ref={containerRef}
      id="showcase"
      className="relative w-full min-h-[220vh] select-none"
    >
      <div
        ref={pinnedCardRef}
        className="w-full min-h-screen flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-8 lg:px-14 relative z-10"
      >
        <div className="w-full max-w-[1440px] mx-auto space-y-5">
          {/* Section Eyebrow & Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-4 border-black/15 dark:border-white/10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-none text-xs font-mono tracking-tight border bg-[#7647eb]/10 border-[#7647eb]/30 text-[#7647eb] dark:text-[#bdf559] mb-2 font-semibold">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>SHOWCASE PIN // CONSOLA DE OPERACIONES REALES</span>
              </div>
              <h2
                className={`text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight ${
                  isDark ? 'text-white' : 'text-zinc-950'
                }`}
              >
                <FlipText>El motor AutoML en plena acción.</FlipText>
              </h2>
            </div>

            {/* Direct Engine Entry Button */}
            <div className="shrink-0">
              <BubbleArrowButton
                size="md"
                variant="primary"
                onClick={() => {
                  navigateWithDither('/dashboard');
                }}
              >
                Abrir Dashboard en Vivo
              </BubbleArrowButton>
            </div>
          </div>

          {/* Interactive Hardware Console Shell - Strict rounded-none */}
          <div
            className={`w-full rounded-none border-2 transition-all duration-300 shadow-[8px_8px_0px_rgba(0,0,0,0.9)] overflow-hidden ${
              isDark
                ? 'bg-[#080612] border-white/15 text-white'
                : 'bg-white border-black text-zinc-950'
            }`}
          >
            {/* Top Toolbar / Tab Navigation */}
            <div
              className={`w-full flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 border-b text-xs font-mono ${
                isDark ? 'bg-[#0e0a1c] border-white/10' : 'bg-[#f6f6f2] border-black/15'
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => switchTab('anomalias')}
                  className={`px-3 py-1.5 rounded-none border transition-all flex items-center gap-2 cursor-pointer font-bold ${
                    activeTab === 'anomalias'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-500 shadow-sm'
                      : isDark
                      ? 'bg-transparent border-transparent text-zinc-400 hover:text-white'
                      : 'bg-transparent border-transparent text-zinc-600 hover:text-black'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  <span>01. DETECCIÓN DE ANOMALÍAS (±3σ)</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchTab('forecasting')}
                  className={`px-3 py-1.5 rounded-none border transition-all flex items-center gap-2 cursor-pointer font-bold ${
                    activeTab === 'forecasting'
                      ? 'bg-[#7647eb]/20 border-[#7647eb] text-[#7647eb] dark:text-[#a78bfa] shadow-sm'
                      : isDark
                      ? 'bg-transparent border-transparent text-zinc-400 hover:text-white'
                      : 'bg-transparent border-transparent text-zinc-600 hover:text-black'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-[#7647eb] dark:text-[#bdf559]" />
                  <span>02. FORECASTING MULTIMODELO</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchTab('shap')}
                  className={`px-3 py-1.5 rounded-none border transition-all flex items-center gap-2 cursor-pointer font-bold ${
                    activeTab === 'shap'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-[#bdf559] shadow-sm'
                      : isDark
                      ? 'bg-transparent border-transparent text-zinc-400 hover:text-white'
                      : 'bg-transparent border-transparent text-zinc-600 hover:text-black'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>03. VALORES SHAP &amp; IMPACTO</span>
                </button>
              </div>

              {/* Status Pill */}
              <div className="hidden md:flex items-center gap-3 text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#bdf559] animate-pulse" />
                  MOTOR EN LÍNEA: LIGHTGBM v4.2
                </span>
                <span>•</span>
                <span>LATENCIA: 7.8MS</span>
              </div>
            </div>

            {/* Main Stage Viewports */}
            <div className="p-5 sm:p-8">
              {/* TAB 1: DETECCIÓN DE ANOMALÍAS */}
              {activeTab === 'anomalias' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold font-mono text-rose-500 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span>ISOLATION FOREST // 4 OUTLIERS IDENTIFICADOS (&gt; 3.0σ)</span>
                      </h3>
                      <p className="text-xs font-mono text-zinc-400 mt-1">
                        Desvíos de dispersión multivariada que distorsionaban tus pronósticos antes de ingresar a MIO.
                      </p>
                    </div>
                    <div className="text-xs font-mono px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 self-start sm:self-auto font-bold">
                      CAPITAL EN RIESGO: $37,900 USD
                    </div>
                  </div>

                  {/* Inspector Table - Strict rounded-none */}
                  <div className="overflow-x-auto border border-black/15 dark:border-white/10 rounded-none">
                    <table className="w-full text-left font-mono text-xs">
                      <thead className={`border-b ${isDark ? 'bg-white/5 border-white/10 text-zinc-400' : 'bg-black/5 border-black/10 text-zinc-700'}`}>
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">REGISTRO</th>
                          <th className="py-2.5 px-4 font-semibold">VARIABLE AFECTADA</th>
                          <th className="py-2.5 px-4 font-semibold">DESVÍO ESTADÍSTICO</th>
                          <th className="py-2.5 px-4 font-semibold">SEVERIDAD</th>
                          <th className="py-2.5 px-4 font-semibold">IMPACTO FINANCIERO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/10 dark:divide-white/5">
                        {SAMPLE_ANOMALIES.map((row) => (
                          <tr key={row.id} className="hover:bg-rose-500/5 transition-colors">
                            <td className="py-3 px-4 font-bold">{row.id}</td>
                            <td className="py-3 px-4">{row.variable}</td>
                            <td className="py-3 px-4 font-bold text-rose-500">{row.sigma}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold border rounded-none ${
                                  row.severity === 'CRÍTICO'
                                    ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                                    : 'bg-amber-500/20 border-amber-500 text-amber-400'
                                }`}
                              >
                                {row.severity}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold text-emerald-700 dark:text-[#bdf559]">{row.impact}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: FORECASTING MULTIMODELO */}
              {activeTab === 'forecasting' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold font-mono text-[#7647eb] dark:text-[#a78bfa] flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        <span>SERIES TEMPORALES // ABANICO DE INCERTIDUMBRE P80 / P95</span>
                      </h3>
                      <p className="text-xs font-mono text-zinc-400 mt-1">
                        Validación cruzada temporal entre Prophet, ARIMA, XGBoost y LightGBM con menor error cuadrático.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto font-mono text-xs">
                      {(['30D', '60D', '90D'] as const).map((hz) => (
                        <button
                          key={hz}
                          onClick={() => {
                            playMioDevSound('tick');
                            setForecastHorizon(hz);
                          }}
                          className={`px-3 py-1 rounded-none border text-xs font-bold cursor-pointer transition-colors ${
                            forecastHorizon === hz
                              ? 'bg-[#7647eb] text-white border-[#7647eb]'
                              : isDark
                              ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                              : 'bg-black/5 border-black/10 text-zinc-700 hover:text-black'
                          }`}
                        >
                          {hz}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Synthetic Fan Chart Metric Display - Strict rounded-none */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className={`p-4 border rounded-none ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                      <div className="text-[10px] font-mono text-zinc-400">MODELO SELECCIONADO</div>
                      <div className="text-xl font-mono font-bold text-[#7647eb] dark:text-[#bdf559] mt-1">LightGBM Regressor</div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-0.5">Ensamble temporal ponderado</div>
                    </div>
                    <div className={`p-4 border rounded-none ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                      <div className="text-[10px] font-mono text-zinc-400">COEFICIENTE R²</div>
                      <div className="text-xl font-mono font-bold text-white dark:text-white mt-1">0.984</div>
                      <div className="text-[10px] font-mono text-emerald-500 mt-0.5">Ajuste casi determinístico</div>
                    </div>
                    <div className={`p-4 border rounded-none ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                      <div className="text-[10px] font-mono text-zinc-400">RMSE (ERROR MEDIO)</div>
                      <div className="text-xl font-mono font-bold text-white mt-1">1.42k USD</div>
                      <div className="text-[10px] font-mono text-zinc-400 mt-0.5">Desviación estándar baja</div>
                    </div>
                    <div className={`p-4 border rounded-none ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                      <div className="text-[10px] font-mono text-zinc-400">PROYECCIÓN DE VENTAS</div>
                      <div className="text-xl font-mono font-bold text-emerald-700 dark:text-[#bdf559] mt-1">$104,800 USD</div>
                      <div className="text-[10px] font-mono text-zinc-400 mt-0.5">Banda P95: [$98.4k - $111.2k]</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: VALORES SHAP & EXPLICABILIDAD */}
              {activeTab === 'shap' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-[#bdf559] flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        <span>ATRIBUCIÓN CAUSAL SHAP // EXPLICABILIDAD EJECUTIVA</span>
                      </h3>
                      <p className="text-xs font-mono text-zinc-400 mt-1">
                        Cálculo del valor Shapley de teoría de juegos: qué variable impulsó cada dólar de tu margen.
                      </p>
                    </div>

                    <div className="text-xs font-mono px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-[#bdf559] font-bold">
                      IMPACTO EBITDA: +27.8%
                    </div>
                  </div>

                  {/* SHAP Bars - Strict rounded-none */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-1">
                        <span className="font-semibold">Precio Promedio Unitario (Margen Directo)</span>
                        <span className="text-emerald-700 dark:text-[#bdf559] font-bold">+42.8% contribución</span>
                      </div>
                      <div className={`w-full h-3 rounded-none overflow-hidden ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
                        <div className="h-full bg-emerald-500 w-[84%] transition-all duration-500" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-1">
                        <span className="font-semibold">Estacionalidad Q4 &amp; Campaña Black Week</span>
                        <span className="text-[#7647eb] dark:text-[#a78bfa] font-bold">+31.2% contribución</span>
                      </div>
                      <div className={`w-full h-3 rounded-none overflow-hidden ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
                        <div className="h-full bg-[#7647eb] w-[62%] transition-all duration-500" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-1">
                        <span className="font-semibold">Tiempo de Espera en Checkout (Fricción)</span>
                        <span className="text-rose-500 font-bold">-14.5% penalización</span>
                      </div>
                      <div className={`w-full h-3 rounded-none overflow-hidden ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
                        <div className="h-full bg-rose-500 w-[28%] transition-all duration-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Telemetry Marquee Bar */}
            <div
              className={`w-full px-6 py-2.5 border-t text-[11px] font-mono flex flex-wrap items-center justify-between gap-4 ${
                isDark ? 'bg-black/40 border-white/10 text-zinc-400' : 'bg-black/[0.03] border-black/10 text-zinc-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>ZERO-KNOWLEDGE PIPELINE • CERO PERSISTENCIA EN DISCO EXTERNO</span>
              </div>
              <div className="flex items-center gap-4 text-[10px]">
                <span>DATASET: ventas_retail_q4.xlsx</span>
                <span>•</span>
                <span>14,200 FILAS PROCESADAS EN 6.8S</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardShowcasePinDOM;
