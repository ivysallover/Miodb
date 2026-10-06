import React, { useState } from 'react';
import { LegalPageShell, LegalSectionItem } from '@/components/dom/LegalPageShell';
import { CheckCircle2, ShieldAlert, Copy, Check, FileText } from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';
import { playMioDevSound } from '@/lib/sound';

const SECTIONS: LegalSectionItem[] = [
  { id: 'sec-tipo', title: 'Tipo de Trámite' },
  { id: 'sec-marco', title: 'Marco Regulatorio' },
  { id: 'sec-formulario', title: 'Formulario de Gestión' },
];

export const ArrepentimientoPage: React.FC = () => {
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';

  const getInitialMode = (): 'arrepentimiento' | 'baja' => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tipo') === 'baja' || params.get('motivo') === 'baja') {
        return 'baja';
      }
    }
    return 'arrepentimiento';
  };

  const [mode, setMode] = useState<'arrepentimiento' | 'baja'>(getInitialMode);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [transaccionId, setTransaccionId] = useState('');
  const [fecha, setFecha] = useState('');
  const [motivo, setMotivo] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [codigoTramite, setCodigoTramite] = useState('');
  const [copied, setCopied] = useState(false);

  const navigateTo = (path: string) => {
    playMioDevSound('select');
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) return;

    playMioDevSound('buttonA');
    const prefix = mode === 'baja' ? 'BAJA-2026' : 'ARR-2026';
    const codigo = `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setCodigoTramite(codigo);
    setSubmitted(true);

    try {
      const registro = {
        codigo,
        tipo: mode,
        nombre,
        email,
        transaccionId,
        fecha: fecha || new Date().toISOString(),
        motivo,
        timestamp: new Date().toISOString(),
      };
      const key = mode === 'baja' ? 'mio_baja_solicitudes' : 'mio_arrepentimiento_solicitudes';
      const solicitudesPrevias = JSON.parse(localStorage.getItem(key) || '[]');
      localStorage.setItem(key, JSON.stringify([registro, ...solicitudesPrevias]));
    } catch {}
  };

  const handleCopyCode = () => {
    playMioDevSound('tick');
    navigator.clipboard.writeText(codigoTramite);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <LegalPageShell
      title={mode === 'baja' ? 'Baja Directa de Suscripción' : 'Botón de Arrepentimiento'}
      subtitle={
        mode === 'baja'
          ? 'Rescisión y cancelación inmediata de servicios continuos conforme a la Resolución 271/2020 SCI.'
          : 'Revocación de la contratación dentro de los diez (10) días conforme a la Resolución 424/2020 SCI y Ley 24.240.'
      }
      category="DEFENSA DEL CONSUMIDOR // REPÚBLICA ARGENTINA"
      lastUpdated="Septiembre 2026"
      sections={SECTIONS}
    >
      {/* Segmented Mode Switcher */}
      <section id="sec-tipo" className="space-y-4">
        <div className="flex rounded-mio p-1.5 bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/10 max-w-md">
          <button
            type="button"
            onClick={() => {
              playMioDevSound('select');
              setMode('arrepentimiento');
              setSubmitted(false);
            }}
            className={`flex-1 py-2.5 text-xs font-mono font-bold rounded-mio-sm transition-all duration-200 cursor-pointer ${
              mode === 'arrepentimiento'
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            Arrepentimiento (Res. 424)
          </button>
          <button
            type="button"
            onClick={() => {
              playMioDevSound('select');
              setMode('baja');
              setSubmitted(false);
            }}
            className={`flex-1 py-2.5 text-xs font-mono font-bold rounded-mio-sm transition-all duration-200 cursor-pointer ${
              mode === 'baja'
                ? 'bg-[#7647eb] text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            Baja Directa (Res. 271)
          </button>
        </div>
      </section>

      {/* Legal Framework Double-Bezel Card */}
      <section id="sec-marco" className="scroll-mt-24 space-y-4 pt-4">
        <div className="p-1 rounded-mio bg-black/[0.04] dark:bg-white/[0.05] ring-1 ring-black/[0.06] dark:ring-white/10">
          <div className="p-6 rounded-[calc(1.5rem-2px)] bg-white dark:bg-[#0e0c19] text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Garantía de Derechos del Consumidor (Ley N° 24.240):</span>
            </div>
            {mode === 'baja' ? (
              <p>
                Tenés derecho a rescindir tu suscripción o servicio en cualquier momento, sin trabas burocráticas ni penalidades, y por el mismo canal digital en que fue contratado. Al confirmar, se emitirá una <strong>constancia formal con código identificador único</strong>.
              </p>
            ) : (
              <p>
                Si contrataste un plan en MIO, contás con la facultad inalienable de revocar la contratación dentro del plazo de <strong>diez (10) días corridos</strong> desde la fecha de contratación o pago inicial, sin costo alguno. El sistema genera un <strong>código oficial de trámite</strong> de manera inmediata.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Interactive Form or Confirmation Receipt */}
      <section id="sec-formulario" className="scroll-mt-24 pt-4">
        {submitted ? (
          <div className="p-1 rounded-mio bg-emerald-500/15 ring-1 ring-emerald-500/30">
            <div className="p-6 sm:p-8 rounded-[calc(1.5rem-2px)] bg-white dark:bg-[#0e0c19] text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center mx-auto text-emerald-600 dark:text-[#bdf559]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-sans text-zinc-950 dark:text-white">
                  {mode === 'baja' ? 'Solicitud de Baja Registrada' : 'Solicitud de Arrepentimiento Registrada'}
                </h2>
                <p className="text-xs sm:text-sm mt-1.5 text-zinc-600 dark:text-zinc-400">
                  {mode === 'baja'
                    ? 'Tu baja ha sido procesada de conformidad con la Resolución 271/2020. No se generarán nuevas renovaciones.'
                    : 'Tu revocación ha sido procesada de forma inmediata. No se realizarán nuevos débitos en tu cuenta.'}
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-mio border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] max-w-md mx-auto text-left font-mono text-xs space-y-2.5">
                <div className="text-[11px] text-zinc-500 uppercase tracking-wider">Código de Gestión Oficial:</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base sm:text-lg font-bold text-[#7647eb] dark:text-[#bdf559]">{codigoTramite}</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3 py-1.5 rounded-mio-sm bg-black/[0.05] dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#bdf559]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <div className="pt-2 text-[11px] text-zinc-500 border-t border-black/[0.06] dark:border-white/[0.08] space-y-1">
                  <div><strong>Titular:</strong> {nombre}</div>
                  <div><strong>Email:</strong> {email}</div>
                  <div><strong>Fecha y Hora:</strong> {new Date().toLocaleString('es-AR')}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigateTo('/')}
                className="px-6 py-3 rounded-full bg-[#7647eb] hover:bg-[#602cd1] text-white font-mono text-xs font-bold transition-all duration-200 active:scale-[0.97] cursor-pointer shadow-md"
              >
                Volver a MIO Workspace
              </button>
            </div>
          </div>
        ) : (
          <div className="p-1 rounded-mio bg-black/[0.04] dark:bg-white/[0.05] ring-1 ring-black/[0.06] dark:ring-white/10">
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-[calc(1.5rem-2px)] bg-white dark:bg-[#0e0c19] space-y-5">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-2 text-zinc-700 dark:text-zinc-300">
                  Nombre y Apellido del Titular *
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Martín García"
                  className="w-full px-4 py-3 rounded-mio border text-sm focus:outline-none focus:ring-2 focus:ring-[#7647eb] transition-all bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/10 text-zinc-950 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-2 text-zinc-700 dark:text-zinc-300">
                  Correo Electrónico Registrado *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full px-4 py-3 rounded-mio border text-sm focus:outline-none focus:ring-2 focus:ring-[#7647eb] transition-all bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/10 text-zinc-950 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-2 text-zinc-700 dark:text-zinc-300">
                    ID Transacción / Factura (opcional)
                  </label>
                  <input
                    type="text"
                    value={transaccionId}
                    onChange={(e) => setTransaccionId(e.target.value)}
                    placeholder="Ej. #INV-9281 o ID Stripe"
                    className="w-full px-4 py-3 rounded-mio border text-sm focus:outline-none focus:ring-2 focus:ring-[#7647eb] transition-all bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/10 text-zinc-950 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-2 text-zinc-700 dark:text-zinc-300">
                    Fecha de Contratación
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-4 py-3 rounded-mio border text-sm focus:outline-none focus:ring-2 focus:ring-[#7647eb] transition-all bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/10 text-zinc-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-2 text-zinc-700 dark:text-zinc-300">
                  Motivo (opcional)
                </label>
                <textarea
                  rows={3}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Comentario adicional (no obligatorio para el ejercicio de tu derecho)."
                  className="w-full px-4 py-3 rounded-mio border text-sm focus:outline-none focus:ring-2 focus:ring-[#7647eb] resize-none transition-all bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/10 text-zinc-950 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className={`w-full py-3.5 px-6 rounded-mio text-white font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
                    mode === 'baja' ? 'bg-[#7647eb] hover:bg-[#602cd1]' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  <FileText className="w-4 h-4 text-[#bdf559]" />
                  <span>{mode === 'baja' ? 'Confirmar Solicitud de Baja' : 'Confirmar Revocación de Servicio'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </LegalPageShell>
  );
};

export default ArrepentimientoPage;
