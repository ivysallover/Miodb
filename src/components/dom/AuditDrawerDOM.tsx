import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, TrendingDown, Activity, Sparkles, CheckCircle2 } from 'lucide-react';
import { playMioDevSound } from '@/lib/sound';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';

interface AuditDrawerDOMProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * AuditDrawerDOM:
 * Apple / Linear-grade tactile audit sheet based on Emil Kowalski's vaul specifications.
 * Provides deep corporate verification of the 1,280 isolated anomalies and predictive pipeline.
 */
export const AuditDrawerDOM: React.FC<AuditDrawerDOMProps> = ({ isOpen, onClose }) => {
  const anomaliesList = [
    { sku: 'SKU-88219-Q', name: 'Distribución Logística Cono Sur', deviation: '+314%', model: 'Isolation Forest', impact: '$42,500 USD' },
    { sku: 'SKU-10492-A', name: 'Desvío de Demanda Retail Q4', deviation: '-68%', model: 'LightGBM Cross-Val', impact: '$98,200 USD' },
    { sku: 'SKU-44021-M', name: 'Estacionalidad Quiebre Black Week', deviation: '+192%', model: 'Prophet Time-Series', impact: '$64,100 USD' },
    { sku: 'SKU-77310-Z', name: 'Sobre-stocking Capital Inmovilizado', deviation: '+240%', model: 'Clustering K-Means', impact: '$135,200 USD' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              playMioDevSound('toggle');
              onClose();
            }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
          />

          {/* Drawer Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative w-full max-w-5xl max-h-[88vh] overflow-y-auto bg-[#090714] border-t border-x border-white/15 rounded-t-3xl text-white shadow-2xl z-10 p-6 sm:p-10 flex flex-col"
          >
            {/* Grab Handle */}
            <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-6 shrink-0" />

            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-6 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border border-[#7647eb]/40 bg-[#7647eb]/15 text-[#a78bfa] mb-3">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#bdf559]" />
                  <span>AUDITORÍA MATEMÁTICA VERIFICADA // 100% CERO CÓDIGO</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight">
                  Desglose de Auditoría: Retail Enterprise (14,200 SKUs)
                </h3>
                <p className="text-sm font-mono text-zinc-400 mt-1">
                  DATASET: AUDIT_RETAIL_14K.XLSX  •  VALIDACIÓN CRUZADA: 3 AÑOS  •  CONFIDENCIALIDAD: SHA-256
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  playMioDevSound('toggle');
                  onClose();
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Key Metric Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
                  <TrendingDown className="w-4 h-4 text-[#bdf559]" />
                  <span>DESVIACIÓN RESIDUAL</span>
                </div>
                <div className="text-3xl font-bold font-mono text-white flex items-baseline gap-2">
                  <AnimatedCounter value={7.4} decimals={1} suffix="%" />
                  <span className="text-xs text-rose-400 line-through">48.0%</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">Reducción del 84.5% en error predictivo</p>
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
                  <Activity className="w-4 h-4 text-[#a78bfa]" />
                  <span>ANOMALÍAS AISLADAS</span>
                </div>
                <div className="text-3xl font-bold font-mono text-[#bdf559]">
                  <AnimatedCounter value={1280} prefix="+" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">Aisladas con Isolation Forest en 60s</p>
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
                  <Sparkles className="w-4 h-4 text-[#bdf559]" />
                  <span>CAPITAL RECUPERADO</span>
                </div>
                <div className="text-3xl font-bold font-mono text-white">
                  <AnimatedCounter value={340000} prefix="$" suffix=" USD" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">Desmovilizado en compras e inventario</p>
              </div>
            </div>

            {/* Table of Top Flagged Anomalies */}
            <div className="space-y-3 mb-8">
              <h4 className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                Muestra Representativa de Anomalías Detectadas (Top Inconsistencias):
              </h4>
              <div className="border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5 bg-black/40 text-xs font-mono">
                {anomaliesList.map((item, idx) => (
                  <div key={idx} className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#7647eb]/20 text-[#a78bfa] border border-[#7647eb]/30 text-[11px]">
                        {item.sku}
                      </span>
                      <span className="font-sans font-medium text-white text-sm">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-zinc-400 hidden sm:inline">{item.model}</span>
                      <span className="text-rose-400 font-semibold">{item.deviation}</span>
                      <span className="text-[#bdf559] font-bold">{item.impact}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 mt-auto">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <CheckCircle2 className="w-4 h-4 text-[#bdf559]" />
                <span>Explicabilidad SHAP disponible por variable y columna</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  playMioDevSound('select');
                  onClose();
                }}
                className="px-6 py-3 rounded-full bg-[#bdf559] text-black font-semibold text-xs font-mono tracking-wider uppercase hover:bg-[#c8ff6a] transition-colors cursor-pointer"
              >
                Cerrar Auditoría
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AuditDrawerDOM;
