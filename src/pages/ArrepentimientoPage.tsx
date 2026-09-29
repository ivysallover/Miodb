import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, ShieldAlert, Copy, Check, FileText } from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';
import { playMioDevSound } from '@/lib/sound';

export const ArrepentimientoPage: React.FC = () => {
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';

  // Read query params for initial mode
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
    <div className={`min-h-screen px-4 sm:px-8 py-12 transition-colors duration-300 ${isDark ? 'bg-[#07070a] text-white' : 'bg-[#fbfbfd] text-zinc-950'}`}>
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => navigateTo('/')}
          className={`mb-8 inline-flex items-center gap-2 text-sm font-medium ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-950'} transition-colors cursor-pointer`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al inicio</span>
        </button>

        {/* Tab Selector: Arrepentimiento vs Baja de Servicio */}
        <div className="flex rounded-xl p-1 bg-zinc-200 dark:bg-white/10 mb-6 max-w-md">
          <button
            type="button"
            onClick={() => { playMioDevSound('select'); setMode('arrepentimiento'); setSubmitted(false); }}
            className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'arrepentimiento'
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            Arrepentimiento (Res. 424)
          </button>
          <button
            type="button"
            onClick={() => { playMioDevSound('select'); setMode('baja'); setSubmitted(false); }}
            className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'baja'
                ? 'bg-[#7647eb] text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            Baja de Servicio (Res. 271)
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-mono font-bold uppercase tracking-wider mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{mode === 'baja' ? 'Resolución 271/2020 SCI — Ley 24.240' : 'Resolución 424/2020 SCI — Ley 24.240'}</span>
          </div>
          <h1 className="text-3xl font-extrabold font-sans tracking-tight mb-2">
            {mode === 'baja' ? 'Baja de Suscripción y Rescisión' : 'Botón de Arrepentimiento'}
          </h1>
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {mode === 'baja'
              ? 'Cancelación y rescisión directa de servicios contratados de forma continua conforme a la Resolución 271/2020.'
              : 'Revocación de contratación conforme al artículo 34 de la Ley de Defensa del Consumidor de la República Argentina.'}
          </p>
        </div>

        {/* Legal Frame Callout */}
        <div className={`p-4 sm:p-5 rounded-2xl border mb-8 text-xs leading-relaxed ${isDark ? 'bg-white/[0.03] border-white/10 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'}`}>
          {mode === 'baja' ? (
            <>
              <p className="mb-2">
                <strong>Marco Legal (Res. 271/2020):</strong> Tenés derecho a rescindir tu suscripción o servicio en cualquier momento, sin trabas ni demoras, y por el mismo medio digital en que fue contratado.
              </p>
              <p>
                Al confirmar la solicitud, el sistema generará de inmediato una <strong>constancia de baja con código identificador único</strong> para tus registros.
              </p>
            </>
          ) : (
            <>
              <p className="mb-2">
                <strong>Marco Legal (Res. 424/2020):</strong> Si contrataste un plan de suscripción o servicio en MIO, tenés derecho a revocar la contratación dentro del plazo de <strong>diez (10) días corridos</strong> contados a partir de la fecha de suscripción o pago inicial, sin costo alguno ni penalidad.
              </p>
              <p>
                Al confirmar la solicitud, el sistema emitirá de inmediato un <strong>código de identificación de trámite</strong> y te enviaremos la constancia formal al correo electrónico dentro de las 24 horas.
              </p>
            </>
          )}
        </div>

        {submitted ? (
          <div className={`p-6 sm:p-8 rounded-2xl border text-center space-y-6 ${isDark ? 'bg-[#0f0e17] border-white/15' : 'bg-white border-zinc-300 shadow-lg'}`}>
            <div className="w-16 h-16 rounded-full bg-[#bdf559]/20 border-2 border-[#bdf559] flex items-center justify-center mx-auto text-emerald-600 dark:text-[#bdf559]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold font-sans">
                {mode === 'baja' ? 'Solicitud de Baja de Suscripción Registrada' : 'Solicitud de Arrepentimiento Registrada'}
              </h2>
              <p className={`text-xs mt-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {mode === 'baja'
                  ? 'Tu baja ha sido procesada de conformidad con la Resolución 271/2020. No se generarán nuevas renovaciones.'
                  : 'Tu revocación ha sido procesada de forma inmediata. No se realizarán nuevos débitos en tu cuenta.'}
              </p>
            </div>

            <div className={`p-4 rounded-xl border max-w-md mx-auto text-left font-mono text-xs space-y-2 ${isDark ? 'bg-black/60 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
              <div className="text-[11px] text-zinc-500 uppercase tracking-wider">Código de Gestión Oficial:</div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-bold text-[#bdf559]">{codigoTramite}</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#bdf559]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              <div className="pt-2 text-[11px] text-zinc-400 border-t border-white/10 space-y-1">
                <div><strong>Titular:</strong> {nombre}</div>
                <div><strong>Email:</strong> {email}</div>
                <div><strong>Fecha y Hora:</strong> {new Date().toLocaleString('es-AR')}</div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigateTo('/')}
                className="px-6 py-2.5 rounded-full bg-[#7647eb] hover:bg-[#602cd1] text-white font-mono text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Volver al inicio
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={`p-6 sm:p-8 rounded-2xl border space-y-5 ${isDark ? 'bg-[#0f0e17] border-white/15' : 'bg-white border-zinc-300 shadow-md'}`}>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1.5 text-zinc-700 dark:text-zinc-300">
                Nombre y Apellido del Titular *
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Martín García"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#7647eb] ${isDark ? 'bg-white/[0.04] border-white/10 text-white placeholder-zinc-500' : 'bg-white border-zinc-300 text-zinc-950 placeholder-zinc-400'}`}
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1.5 text-zinc-700 dark:text-zinc-300">
                Correo Electrónico Registrado *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#7647eb] ${isDark ? 'bg-white/[0.04] border-white/10 text-white placeholder-zinc-500' : 'bg-white border-zinc-300 text-zinc-950 placeholder-zinc-400'}`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1.5 text-zinc-700 dark:text-zinc-300">
                  ID Transacción / Factura (opcional)
                </label>
                <input
                  type="text"
                  value={transaccionId}
                  onChange={(e) => setTransaccionId(e.target.value)}
                  placeholder="Ej. #INV-9281 o ID Stripe"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#7647eb] ${isDark ? 'bg-white/[0.04] border-white/10 text-white placeholder-zinc-500' : 'bg-white border-zinc-300 text-zinc-950 placeholder-zinc-400'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1.5 text-zinc-700 dark:text-zinc-300">
                  Fecha de Contratación
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#7647eb] ${isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-white border-zinc-300 text-zinc-950'}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1.5 text-zinc-700 dark:text-zinc-300">
                Motivo de la Revocación (opcional)
              </label>
              <textarea
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Contanos brevemente por qué solicitás la revocación (no es obligatorio para ejercer el derecho)."
                className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#7647eb] resize-none ${isDark ? 'bg-white/[0.04] border-white/10 text-white placeholder-zinc-500' : 'bg-white border-zinc-300 text-zinc-950 placeholder-zinc-400'}`}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className={`w-full py-3.5 px-6 rounded-xl text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 ${
                  mode === 'baja' ? 'bg-[#7647eb] hover:bg-[#602cd1]' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>{mode === 'baja' ? 'Confirmar Solicitud de Baja de Suscripción' : 'Confirmar Revocación de Servicio'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ArrepentimientoPage;
