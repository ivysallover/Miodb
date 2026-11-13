import React, { useEffect, useMemo, useState } from 'react';
import { Database, KeyRound, Loader2, Lock, LockOpen, Pencil, Play, Plus, Search, Table2, Trash2 } from 'lucide-react';
import { Segmented } from './Segmented';
import { desktop, num, type BaseTable, type Connection, type Pick } from './desktop';
import { DANGER, FOCUS, PRIMARY, field, muted, slab, slabText, soft, surface } from './ui';

const ENGINES = [
  { id: 'postgres' as const, label: 'PostgreSQL', port: 5432 },
  { id: 'mysql' as const, label: 'MySQL o MariaDB', port: 3306 },
];
const DEFAULT_LIMIT = 1_000_000;
const EMPTY: Connection = { motor: 'postgres', servidor: '', base: '', usuario: '', tope: DEFAULT_LIMIT };
const message = (e: unknown) => String((e as Error)?.message || e);

type Saved = Required<Connection>;
/** Qué se ve a la derecha: el formulario (nueva o editando) o una conexión con sus tablas. */
type View = { kind: 'form'; draft: Connection } | { kind: 'conexion'; id: string };

/**
 * Conectar una base de datos (PostgreSQL o MySQL / MariaDB) y elegir qué traer: una tabla entera o una
 * consulta propia. Las conexiones se guardan sin la contraseña (va al llavero del sistema) y de la base
 * no se guarda nada: se consulta cada vez que se abre. `onOpen` trae lo elegido y lo analiza.
 */
export const Bases: React.FC<{ isDark: boolean; onOpen: (id: string, pick: Pick, name: string) => void }> = ({ isDark, onOpen }) => {
  const [list, setList] = useState<Saved[] | null>(null);
  const [view, setView] = useState<View>({ kind: 'form', draft: EMPTY });

  const reload = () =>
    desktop.connections().then((l) => {
      setList(l);
      return l;
    });
  useEffect(() => {
    reload().then((l) => l[0] && setView({ kind: 'conexion', id: l[0].id }));
  }, []);

  const current = view.kind === 'conexion' ? list?.find((c) => c.id === view.id) : undefined;

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:gap-3 xl:grid-cols-12">
      <section className={`flex flex-col rounded-mio p-6 sm:p-8 xl:col-span-4 ${slab(isDark)}`}>
        <h1 className="text-4xl font-extrabold leading-[1] tracking-[-0.04em]">Tus bases.</h1>
        <p className={`mt-3 text-[15px] leading-relaxed ${slabText(isDark)}`}>
          MIO solo lee: cada consulta corre en modo de solo lectura y la base rechaza cualquier cambio. No se guarda ninguna fila: se consulta cada vez que la abrís, y solo queda un resumen (totales por período) para decirte qué cambió.
        </p>
        <ul className="mt-6 space-y-1.5">
          {list?.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setView({ kind: 'conexion', id: c.id })}
                aria-current={current?.id === c.id}
                className={`flex w-full items-center gap-3 rounded-mio-sm px-3.5 py-3 text-left transition-colors duration-150 cursor-pointer ${FOCUS} ${current?.id === c.id ? 'bg-pal-violet text-white' : isDark ? 'hover:bg-white/[0.07]' : 'hover:bg-[#f3f3f5]'}`}
              >
                <Database className="h-4 w-4 shrink-0" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate font-bold">{c.nombre}</span>
                  <span className={`block truncate text-[12px] ${current?.id === c.id ? 'text-white/80' : muted(isDark)}`}>
                    {ENGINES.find((e) => e.id === c.motor)?.label} · {c.usuario}@{c.servidor}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {list && list.length === 0 && <p className={`text-sm ${muted(isDark)}`}>Todavía no guardaste ninguna conexión.</p>}
        <button type="button" onClick={() => setView({ kind: 'form', draft: EMPTY })} className={`${soft(isDark)} mt-4 self-start`}>
          <Plus className="h-4 w-4" aria-hidden /> Nueva conexión
        </button>
      </section>

      <section className={`rounded-mio p-6 sm:p-8 xl:col-span-8 ${surface(isDark)}`}>
        {view.kind === 'form' ? (
          <Formulario
            key={view.draft.id ?? 'nueva'}
            draft={view.draft}
            isDark={isDark}
            onSaved={(c) => reload().then(() => setView({ kind: 'conexion', id: c.id }))}
            onRemoved={() => reload().then((l) => setView(l[0] ? { kind: 'conexion', id: l[0].id } : { kind: 'form', draft: EMPTY }))}
          />
        ) : current ? (
          <Elegir key={current.id} c={current} isDark={isDark} onEdit={() => setView({ kind: 'form', draft: current })} onOpen={onOpen} />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin" aria-label="Cargando" />
        )}
      </section>
    </div>
  );
};

/** Crear o editar una conexión: probarla antes de guardarla. */
const Formulario: React.FC<{ draft: Connection; isDark: boolean; onSaved: (c: Saved) => void; onRemoved: () => void }> = ({ draft, isDark, onSaved, onRemoved }) => {
  const [c, setC] = useState<Connection>(draft);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'probar' | 'guardar' | 'borrar' | null>(null);
  const [check, setCheck] = useState<{ ok: true; version: string; cifrada: boolean } | { ok: false; error: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const editing = !!draft.id;
  const engine = ENGINES.find((e) => e.id === c.motor)!;
  const set = (patch: Partial<Connection>) => {
    setC((x) => ({ ...x, ...patch }));
    setCheck(null);
  };
  const ready = c.servidor.trim() && c.base.trim() && c.usuario.trim();

  const act = async (what: 'probar' | 'guardar' | 'borrar') => {
    setBusy(what);
    try {
      if (what === 'probar') setCheck({ ok: true, ...(await desktop.testConnection(c, password)) });
      if (what === 'guardar') onSaved(await desktop.saveConnection(c, password));
      if (what === 'borrar' && c.id) {
        await desktop.removeConnection(c.id);
        onRemoved();
      }
    } catch (e) {
      setCheck({ ok: false, error: message(e) });
    } finally {
      setBusy(null);
    }
  };

  const label = 'mb-1.5 block text-sm font-bold';
  return (
    <form onSubmit={(e) => { e.preventDefault(); act('guardar'); }}>
      <h2 className="text-2xl font-extrabold tracking-[-0.03em]">{editing ? `Editar ${draft.nombre}` : 'Conectar una base.'}</h2>
      <p className={`mt-2 max-w-2xl text-sm leading-relaxed ${muted(isDark)}`}>
        Conviene usar un usuario que solo pueda leer. La contraseña se guarda en el llavero de tu compu, no en un archivo ni en tu cuenta de MIO.
      </p>
      <div className="mt-6">
        <Segmented label="Motor" group="motor-base" value={c.motor} isDark={isDark} onChange={(motor) => set({ motor })} options={ENGINES} />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-6">
        <label className="md:col-span-4">
          <span className={label}>Servidor</span>
          <input className={`${field(isDark)} w-full`} value={c.servidor} onChange={(e) => set({ servidor: e.target.value })} placeholder="localhost, 192.168.0.10 o db.tuempresa.com" autoComplete="off" spellCheck={false} required />
        </label>
        <label className="md:col-span-2">
          <span className={label}>Puerto</span>
          <input className={`${field(isDark)} w-full font-mono`} inputMode="numeric" value={c.puerto ?? ''} onChange={(e) => set({ puerto: e.target.value ? Number(e.target.value.replace(/\D/g, '')) || null : null })} placeholder={String(engine.port)} />
        </label>
        <label className="md:col-span-2">
          <span className={label}>Base</span>
          <input className={`${field(isDark)} w-full`} value={c.base} onChange={(e) => set({ base: e.target.value })} autoComplete="off" spellCheck={false} required />
        </label>
        <label className="md:col-span-2">
          <span className={label}>Usuario</span>
          <input className={`${field(isDark)} w-full`} value={c.usuario} onChange={(e) => set({ usuario: e.target.value })} autoComplete="off" spellCheck={false} required />
        </label>
        <label className="md:col-span-2">
          <span className={label}>Contraseña</span>
          <input className={`${field(isDark)} w-full`} type="password" value={password} onChange={(e) => { setPassword(e.target.value); setCheck(null); }} placeholder={editing ? 'La guardada' : ''} autoComplete="new-password" />
        </label>
        <label className="md:col-span-4">
          <span className={label}>Nombre (para reconocerla)</span>
          <input className={`${field(isDark)} w-full`} value={c.nombre ?? ''} onChange={(e) => set({ nombre: e.target.value })} placeholder={c.base && c.servidor ? `${c.base} en ${c.servidor}` : 'Ventas de la tienda'} />
        </label>
        <label className="md:col-span-2">
          <span className={label}>Filas como mucho</span>
          <input className={`${field(isDark)} w-full font-mono`} inputMode="numeric" value={c.tope ?? DEFAULT_LIMIT} onChange={(e) => set({ tope: Number(e.target.value.replace(/\D/g, '')) || 1 })} />
        </label>
      </div>
      <p className={`mt-2 text-[13px] ${muted(isDark)}`}>
        Con tablas enormes, mejor filtrar o agrupar en la consulta: la base hace el trabajo y tu compu solo recibe lo que hace falta.
      </p>

      {check && (
        <p role={check.ok ? 'status' : 'alert'} className={`mt-5 flex items-start gap-2 text-sm font-bold ${check.ok ? (check.cifrada ? 'text-pal-violet' : '') : 'text-[#c0264a]'}`}>
          {check.ok ? (
            <>
              {check.cifrada ? <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <LockOpen className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
              {check.cifrada ? `Conectada a ${check.version}, por una conexión cifrada.` : `Conectada a ${check.version}, pero sin cifrar: lo que viaja por la red se puede leer. En una red de confianza alcanza; si no, pedí que el servidor active TLS.`}
            </>
          ) : check.error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <button type="submit" disabled={!ready || !!busy} className={PRIMARY}>
          {busy === 'guardar' ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <KeyRound className="h-5 w-5" aria-hidden />} Guardar
        </button>
        <button type="button" disabled={!ready || !!busy} onClick={() => act('probar')} className={soft(isDark)}>
          {busy === 'probar' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Probar conexión
        </button>
        {editing && (confirming ? (
          <>
            <button type="button" onClick={() => act('borrar')} className={DANGER}>Borrar la conexión</button>
            <button type="button" onClick={() => setConfirming(false)} className={soft(isDark)}>No</button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={`${soft(isDark)} ml-auto`} title="Borra la conexión y su contraseña del llavero (la base no se toca)">
            <Trash2 className="h-4 w-4" aria-hidden /> Borrar
          </button>
        ))}
      </div>
    </form>
  );
};

/** Una conexión guardada: elegir una de sus tablas o escribir una consulta. */
const Elegir: React.FC<{ c: Saved; isDark: boolean; onEdit: () => void; onOpen: (id: string, pick: Pick, name: string) => void }> = ({ c, isDark, onEdit, onOpen }) => {
  const [mode, setMode] = useState<'tabla' | 'consulta'>('tabla');
  const [tables, setTables] = useState<BaseTable[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    desktop.tables(c.id).then(setTables, (e) => setError(message(e)));
  }, [c.id]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (tables ?? []).filter((t) => !q || `${t.esquema ?? ''}.${t.nombre}`.toLowerCase().includes(q));
  }, [tables, search]);
  const schemas = new Set(tables?.map((t) => t.esquema)).size > 1;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-extrabold tracking-[-0.03em]">{c.nombre}</h2>
          <p className={`mt-1 text-sm ${muted(isDark)}`}>
            {ENGINES.find((e) => e.id === c.motor)?.label} · {c.usuario}@{c.servidor} · trae hasta {num(c.tope)} filas
          </p>
        </div>
        <button type="button" onClick={onEdit} className={soft(isDark)}>
          <Pencil className="h-4 w-4" aria-hidden /> Editar
        </button>
      </div>

      <div className="mt-6">
        <Segmented label="Qué traer" group="que-traer" value={mode} isDark={isDark} onChange={setMode} options={[{ id: 'tabla', label: 'Una tabla', icon: Table2 }, { id: 'consulta', label: 'Mi consulta', icon: Play }]} />
      </div>

      {mode === 'tabla' ? (
        <div className="mt-5">
          {error ? (
            <p role="alert" className="text-sm font-bold text-[#c0264a]">{error}</p>
          ) : !tables ? (
            <p className={`inline-flex items-center gap-2 text-sm ${muted(isDark)}`}><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Conectando…</p>
          ) : (
            <>
              {tables.length > 8 && (
                <label className="relative block max-w-sm">
                  <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${muted(isDark)}`} aria-hidden />
                  <input className={`${field(isDark)} w-full pl-9`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Buscar entre ${tables.length} tablas`} aria-label="Buscar una tabla" />
                </label>
              )}
              <ul className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
                {shown.map((t) => {
                  const big = t.filas != null && t.filas > c.tope;
                  const name = schemas && t.esquema ? `${t.esquema}.${t.nombre}` : t.nombre;
                  return (
                    <li key={`${t.esquema}.${t.nombre}`}>
                      <button
                        type="button"
                        onClick={() => onOpen(c.id, { tabla: t.nombre, esquema: t.esquema }, `${c.nombre} · ${t.nombre}`)}
                        className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-mio-sm px-3.5 py-2.5 text-left transition-colors duration-150 cursor-pointer ${FOCUS} ${isDark ? 'hover:bg-white/[0.07]' : 'hover:bg-pal-soft-2'}`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-bold">{name}</span>
                          {t.vista && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${isDark ? 'bg-white/[0.1]' : 'bg-pal-mute'}`}>vista</span>}
                        </span>
                        <span className={`font-mono text-[13px] tabular-nums ${big ? 'text-pal-violet' : muted(isDark)}`} title={big ? `Trae las primeras ${num(c.tope)}` : undefined}>
                          {t.filas == null ? '' : `~${num(t.filas)} filas${big ? ' · más que el tope' : ''}`}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {shown.length === 0 && <li className={`px-3.5 py-2.5 text-sm ${muted(isDark)}`}>Ninguna tabla se llama así.</li>}
              </ul>
            </>
          )}
        </div>
      ) : (
        <form className="mt-5" onSubmit={(e) => { e.preventDefault(); onOpen(c.id, { consulta: query }, `${c.nombre} · consulta`); }}>
          <label>
            <span className="mb-1.5 block text-sm font-bold">Consulta (SELECT)</span>
            <textarea
              className={`${field(isDark)} min-h-[180px] w-full py-3 font-mono text-[14px] leading-relaxed`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={'SELECT fecha, sucursal, producto, cantidad, monto\nFROM ventas\nWHERE fecha >= \'2025-01-01\''}
              spellCheck={false}
            />
          </label>
          <p className={`mt-2 text-[13px] ${muted(isDark)}`}>Una sola consulta que empiece con SELECT o WITH. Corre en modo de solo lectura.</p>
          <button type="submit" disabled={!query.trim()} className={`${PRIMARY} mt-5`}>
            <Play className="h-5 w-5" aria-hidden /> Traer y analizar
          </button>
        </form>
      )}
    </div>
  );
};
