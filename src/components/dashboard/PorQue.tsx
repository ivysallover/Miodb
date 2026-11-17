import React, { useState } from 'react';
import type { VariationCategory, VariationSchema, VariationValue } from '../../../dashboard-ia/frontend/src/types/analysis';
import { Segmented } from '@/components/escritorio/Segmented';
import { Block, H2 } from './blocks';
import { cap, fmt, pct, type Finding } from './insights';

/**
 * "Por qué cambió": el último período contra el anterior y de dónde sale la diferencia, en palabras.
 * Los números los calcula el motor de escritorio (`desktop/engine/src/variation.rs`); acá solo se
 * cuentan. Sin `variation` (la web), no se muestra nada.
 */

const parts = (iso: string) => iso.split('-').map(Number) as [number, number, number];
/** Menos del 1 %: casi lo mismo. */
const SAME = 0.01;

const sign = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '');
const signed = (x: number) => `${sign(x)}${fmt(Math.abs(x))}`;
/** Una parte (0,12) como porcentaje, sin signo: «12 %». */
const share = (x: number) => `${pct(Math.abs(x) * 100)} %`;
const signedShare = (x: number) => `${sign(x)}${share(x)}`;
const dm = (iso: string) => {
  const [, m, d] = parts(iso);
  return `${d}/${m}`;
};
const month = (y: number, m: number, withYear: boolean) => new Date(y, m - 1, 1).toLocaleDateString('es-AR', withYear ? { month: 'long', year: 'numeric' } : { month: 'long' });

/** Cómo se llaman los dos períodos: «diciembre» y «noviembre», «del 1 al 15 de marzo» y «los mismos días de febrero», o semanas. */
export const periodNames = (v: VariationSchema): { after: string; before: string } => {
  const [ya, ma] = parts(v.despues.desde);
  const [yb, mb] = parts(v.antes.desde);
  if (v.periodo === 'semana') return { after: `la semana del ${dm(v.despues.desde)} al ${dm(v.despues.hasta)}`, before: 'la semana anterior' };
  const name = (y: number, m: number) => month(y, m, ya !== yb);
  if (v.parcial) return { after: `del 1 al ${parts(v.despues.hasta)[2]} de ${name(ya, ma)}`, before: `los mismos días de ${name(yb, mb)}` };
  return { after: name(ya, ma), before: name(yb, mb) };
};

/** El titular: cuánto subió o bajó lo que se mira, y entre qué períodos. */
export const headline = (v: VariationSchema): string => {
  const { after, before } = periodNames(v);
  const what = `«${v.columna}»`;
  const when = v.periodo === 'semana' ? `En ${after}` : cap(v.parcial ? after : `en ${after}`);
  if (v.variacion != null && Math.abs(v.variacion) < SAME) return `${when}, ${what} quedó casi igual que en ${before}.`;
  const how = v.diferencia > 0 ? 'subió' : 'bajó';
  const much = v.variacion != null ? ` ${share(v.variacion)}` : '';
  return `${when}, ${what} ${how}${much} frente a ${before}.`;
};

const stateText = (s: VariationValue['estado']) => (s === 'nuevo' ? ', nuevo' : s === 'perdido' ? ', ya no está' : '');
const mover = (x: VariationValue) => `${x.valor} (${signed(x.diferencia)}${stateText(x.estado)})`;
const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : xs[0]);

/** De dónde sale, en la categoría que mejor lo explica: los dos valores que más empujaron hacia el mismo lado (o, si se compensó, el que más subió y el que más bajó). */
export const explanation = (v: VariationSchema, c: VariationCategory): string => {
  const real = c.valores.filter((x) => x.estado != null);
  const flat = v.variacion != null && Math.abs(v.variacion) < SAME;
  if (flat) {
    const up = real.find((x) => x.diferencia > 0);
    const down = real.find((x) => x.diferencia < 0);
    if (!up || !down) return '';
    return `Se compensó: en «${c.nombre}», ${mover(up)} subió y ${mover(down)} bajó.`;
  }
  const toward = real.filter((x) => x.diferencia * v.diferencia > 0).slice(0, 2);
  if (!toward.length) return '';
  const most = c.explica >= 0.5 ? ` ${toward.length > 1 ? 'Entre los dos explican' : 'Explica'} el ${share(c.explica)} de la diferencia.` : '';
  return `Lo que más pesó, por «${c.nombre}»: ${list(toward.map(mover))}.${most}`;
};

/** Los que llegaron y los que se fueron en una categoría, si hay. */
export const comings = (c: VariationCategory): string => {
  const out: string[] = [];
  if (c.nuevos.cantidad) out.push(`${c.nuevos.cantidad === 1 ? '1 nuevo sumó' : `${c.nuevos.cantidad} nuevos sumaron`} ${signed(c.nuevos.suma)}`);
  if (c.perdidos.cantidad) out.push(`${c.perdidos.cantidad === 1 ? '1 que estaba ya no aparece' : `${c.perdidos.cantidad} que estaban ya no aparecen`} (${signed(c.perdidos.suma)})`);
  return out.length ? `En «${c.nombre}», ${list(out)}.` : '';
};

/** Precio o cantidad: qué pesó más y cuánto cambiaron las unidades y los precios. */
export const priceText = (v: VariationSchema): { title: string; text: string; byPrice: boolean } | null => {
  const p = v.precio_cantidad;
  if (!p || Math.abs(p.precio) + Math.abs(p.cantidad) === 0) return null;
  const byPrice = Math.abs(p.precio) > Math.abs(p.cantidad);
  const title = byPrice ? 'Pesó más el precio que la cantidad.' : 'Pesó más la cantidad que el precio.';
  const [u0, u1] = p.unidades;
  const units = u0 > 0 ? `Se vendieron ${share(u1 / u0 - 1)} ${u1 >= u0 ? 'más' : 'menos'} unidades` : '';
  const prices = p.precios != null ? `los precios ${p.precios >= 0 ? 'subieron' : 'bajaron'} ${share(p.precios)} (en lo que se vendió en los dos períodos)` : '';
  const text = [units, prices].filter(Boolean).join(' y ');
  return { title, text: text ? `${text}.` : '', byPrice };
};

/** De cuánto a cuánto pasó, y contra el mismo período del año anterior si está. */
export const totals = (v: VariationSchema): string => {
  const year = v.anio_anterior?.total ? (v.despues.total ?? 0) / v.anio_anterior.total - 1 : null;
  return `${fmt(v.antes.total ?? 0)} → ${fmt(v.despues.total ?? 0)} (${signed(v.diferencia)}).${year != null ? ` Contra el mismo período del año anterior: ${signedShare(year)}.` : ''}`;
};

/** Todo "por qué cambió" en frases, para el informe y el mail: el titular, los totales, de dónde sale, quién llegó o se fue y precio o cantidad. */
export const whyLines = (v: VariationSchema): string[] => {
  const first = v.categorias[0];
  const price = priceText(v);
  return [headline(v), totals(v), first ? explanation(v, first) : '', first ? comings(first) : '', price ? `${price.title}${price.text ? ` ${price.text}` : ''}` : ''].filter(Boolean);
};

/** Cuánto movió cada valor, con su signo: para la tabla del informe. */
export const moved = signed;

/** Una fila del puente: el valor, si es nuevo o se fue, y su barra hacia un lado o al otro (con todo para el mismo lado, una sola dirección a lo ancho). */
const Row: React.FC<{ x: VariationValue; max: number; both: boolean; isDark: boolean; onRows?: () => void }> = ({ x, max, both, isDark, onRows }) => {
  const width = `${Math.max(2, (Math.abs(x.diferencia) / max) * 100)}%`;
  const up = x.diferencia >= 0;
  const bar = up ? 'bg-pal-violet' : isDark ? 'bg-zinc-500' : 'bg-pal-ink';
  const tag = x.estado === 'nuevo' ? 'nuevo' : x.estado === 'perdido' ? 'ya no está' : null;
  const name = (
    <span className="flex min-w-0 items-center gap-2">
      <span className="truncate font-bold">{x.valor}</span>
      {tag && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${up ? 'bg-pal-violet text-white' : isDark ? 'bg-white/[0.12]' : 'bg-pal-mute'}`}>{tag}</span>}
    </span>
  );
  return (
    <li className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]">
      {onRows ? (
        <button type="button" onClick={onRows} className="min-w-0 text-left underline-offset-4 hover:underline cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-pal-violet" title="Ver las filas">
          {name}
        </button>
      ) : name}
      {both ? (
        <span className="grid grid-cols-2" aria-hidden>
          <span className="flex justify-end">{!up && <span className={`h-3 rounded-l-full ${bar}`} style={{ width }} />}</span>
          <span className="flex">{up && <span className={`h-3 rounded-r-full ${bar}`} style={{ width }} />}</span>
        </span>
      ) : (
        <span className={`flex ${up ? '' : 'justify-end'}`} aria-hidden>
          <span className={`h-3 rounded-full ${bar}`} style={{ width }} />
        </span>
      )}
      <span className="font-mono text-[13px] tabular-nums">{signed(x.diferencia)}</span>
    </li>
  );
};

/** `slide`: en una sola pantalla (Presentar), los dos bloques a lo alto y precio o cantidad como frase. */
export const PorQue: React.FC<{ v: VariationSchema; isDark: boolean; onRows?: (rows: NonNullable<Finding['rows']>) => void; slide?: boolean }> = ({ v, isDark, onRows, slide }) => {
  const [pick, setPick] = useState(0);
  const cats = v.categorias;
  const at = Math.min(pick, cats.length - 1);
  const c = cats[at];
  const { before } = periodNames(v);
  const big = v.variacion != null ? signedShare(v.variacion) : signed(v.diferencia);
  // El titular se explica con la categoría que mejor lo cuenta (la primera), mire lo que mire la persona abajo.
  const why = cats.length ? explanation(v, cats[0]) : '';
  const came = cats.length ? comings(cats[0]) : '';
  const price = priceText(v);
  const tall = slide ? 'lg:h-full lg:overflow-y-auto' : '';
  const max = c ? Math.max(...c.valores.map((x) => Math.abs(x.diferencia)), 1e-9) : 1;
  const both = !!c && c.valores.some((x) => x.diferencia > 0) && c.valores.some((x) => x.diferencia < 0);
  const p = v.precio_cantidad;
  const tiles = p && price
    ? ([
        ['Por cantidad', p.cantidad, !price.byPrice],
        ['Por precio', p.precio, price.byPrice],
        ['Productos nuevos', p.nuevos, false],
        ['Los que no se vendieron', p.perdidos, false],
      ] as const).filter(([, x, lead]) => lead || x !== 0)
    : [];

  return (
    <>
      <Block span={c ? 5 : 12} tone="ink" kicker="Por qué cambió" isDark={isDark} sheet className={tall}>
        <p className="text-5xl font-extrabold leading-none tracking-[-0.045em] text-pal-lime sm:text-6xl">{big}</p>
        <h3 className="mt-4 text-2xl font-bold leading-[1.15] tracking-[-0.025em] sm:text-[1.7rem]">{headline(v)}</h3>
        <p className="mt-2 text-sm text-white/75">{totals(v)}</p>
        {(why || came || (slide && price)) && (
          <div className="mt-auto space-y-2 pt-5 text-[15px] leading-relaxed text-white/90">
            {why && <p>{why}</p>}
            {came && <p>{came}</p>}
            {slide && price && <p>{price.title} {price.text}</p>}
          </div>
        )}
      </Block>
      {c && (
        <Block span={7} tone="white" kicker="De dónde sale la diferencia" isDark={isDark} className={tall}>
          {cats.length > 1 && (
            <div className="mb-5">
              <Segmented label="Mirar por" group="por-que" value={at} isDark={isDark} onChange={setPick} options={cats.map((x, i) => ({ id: i, label: `Por ${x.nombre}` }))} />
            </div>
          )}
          <p className={`mb-4 text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Cuánto subió o bajó cada valor de «{c.nombre}» frente a {before}. Suman la diferencia total.
          </p>
          <ul className="space-y-2.5">
            {c.valores.map((x) => (
              <Row key={x.valor} x={x} max={max} both={both} isDark={isDark} onRows={onRows && x.estado != null ? () => onRows({ column: c.nombre, values: [x.valor] }) : undefined} />
            ))}
          </ul>
        </Block>
      )}
      {price && !slide && (
        <Block span={12} tone="violet" kicker="Precio o cantidad" isDark={isDark}>
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center lg:gap-10">
            <div>
              <h3 className={H2}>{price.title}</h3>
              {price.text && <p className="mt-3 text-base leading-relaxed text-white/90">{price.text}</p>}
            </div>
            <dl className={`mt-6 grid grid-cols-2 gap-2 lg:mt-0 ${tiles.length > 2 ? 'lg:grid-cols-4' : ''}`}>
              {tiles.map(([label, x, lead]) => (
                <div key={label} className="min-w-0 rounded-mio-sm bg-white/[0.1] px-4 py-3.5">
                  <dt className="text-xs text-white/85">{label}</dt>
                  <dd className={`mt-1 text-xl font-extrabold tabular-nums tracking-[-0.02em] ${lead ? 'text-pal-lime' : ''}`}>{signed(x)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Block>
      )}
    </>
  );
};
