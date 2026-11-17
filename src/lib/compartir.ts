import { Bytes, Timestamp, collection, doc, getDoc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Compartir un análisis: la app de escritorio sube el resultado ya calculado y devuelve un enlace que se
 * abre en la web, solo para mirar (`/compartido/<id>`, `CompartidoPage`). La planilla no se sube nunca.
 *
 * En Firestore: `compartidos/{id}` (la ficha: de quién es, nombre, columna, cuándo vence) y
 * `compartidos/{id}/datos/analisis` (el análisis comprimido). El id es largo y al azar: quien tiene el
 * enlace lo abre, nadie puede listarlos. Las reglas están en `dashboard-ia/firestore.rules`.
 */

/** Cada cuánto vence un enlace, en días (`null`: no vence). */
export type Expiry = 7 | 30 | null;
export type Share = { id: string; nombre: string; columna: string; creado: Date | null; vence: Date | null; filas: boolean };

/** Lo más que puede pesar el análisis comprimido (un documento de Firestore llega a 1 MiB). */
export const MAX_BYTES = 900_000;
const ROWS = ['anomaly_records', 'sample_records'] as const;

export { shareIdOf, sharePath } from './compartirRuta';

/** Un id de 128 bits al azar, en 22 letras que entran en una dirección. */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Lo que se sube: el análisis tal cual o, sin filas, sin los registros de ejemplo de los valores raros (lo
 * único del análisis que son filas enteras de la planilla). Los totales por categoría y los gráficos quedan.
 */
export function prepare(analisis: unknown, withRows: boolean): unknown {
  if (withRows) return analisis;
  const a = analisis as { anomalies?: { metrics?: Record<string, unknown> } };
  if (!a?.anomalies?.metrics) return analisis;
  const metrics = { ...a.anomalies.metrics };
  for (const k of ROWS) if (k in metrics) metrics[k] = [];
  return { ...a, anomalies: { ...a.anomalies, metrics } };
}

const through = async (bytes: Uint8Array, stream: CompressionStream | DecompressionStream) =>
  new Uint8Array(await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream)).arrayBuffer());

/** El análisis comprimido (gzip), para que entre en un documento. */
export const pack = (value: unknown) => through(new TextEncoder().encode(JSON.stringify(value)), new CompressionStream('gzip'));
export const unpack = async (bytes: Uint8Array): Promise<unknown> => JSON.parse(new TextDecoder().decode(await through(bytes, new DecompressionStream('gzip'))));

const date = (t: unknown) => (t instanceof Timestamp ? t.toDate() : null);
const toShare = (id: string, d: Record<string, unknown>): Share => ({ id, nombre: String(d.nombre ?? ''), columna: String(d.columna ?? ''), creado: date(d.creado), vence: date(d.vence), filas: d.filas === true });

/** Sube el análisis y devuelve el id del enlace. */
export async function share(uid: string, what: { analisis: unknown; nombre: string; columna: string; filas: boolean; dias: Expiry }): Promise<string> {
  const gz = await pack(prepare(what.analisis, what.filas));
  if (gz.length > MAX_BYTES) throw new Error(what.filas ? 'Este análisis es muy grande para compartirlo con filas. Probá con "Sin filas".' : 'Este análisis es muy grande para compartirlo.');
  const id = newId();
  const card = doc(db, 'compartidos', id);
  const batch = writeBatch(db);
  batch.set(card, {
    uid,
    nombre: what.nombre.slice(0, 200),
    columna: what.columna.slice(0, 200),
    filas: what.filas,
    creado: serverTimestamp(),
    vence: what.dias ? Timestamp.fromMillis(Date.now() + what.dias * 86_400_000) : null,
  });
  batch.set(doc(card, 'datos', 'analisis'), { gz: Bytes.fromUint8Array(gz) });
  await batch.commit();
  return id;
}

/** Los enlaces de esta cuenta, del más nuevo al más viejo. */
export async function myShares(uid: string): Promise<Share[]> {
  const found = await getDocs(query(collection(db, 'compartidos'), where('uid', '==', uid)));
  return found.docs.map((d) => toShare(d.id, d.data())).sort((a, b) => (b.creado?.getTime() ?? 0) - (a.creado?.getTime() ?? 0));
}

/** Deja de compartir: el enlace deja de abrir y el análisis se borra de la web. */
export async function unshare(id: string): Promise<void> {
  const card = doc(db, 'compartidos', id);
  const batch = writeBatch(db);
  batch.delete(doc(card, 'datos', 'analisis'));
  batch.delete(card);
  await batch.commit();
}

/** Lo compartido en un enlace, o `null` si no existe, venció o se dejó de compartir. */
export async function openShare(id: string): Promise<{ share: Share; analisis: unknown } | null> {
  const card = doc(db, 'compartidos', id);
  try {
    const [meta, data] = await Promise.all([getDoc(card), getDoc(doc(card, 'datos', 'analisis'))]);
    const gz = data.get('gz');
    if (!meta.exists() || !(gz instanceof Bytes)) return null;
    return { share: toShare(id, meta.data()), analisis: await unpack(gz.toUint8Array()) };
  } catch (e) {
    // Vencido o borrado: las reglas no lo dejan leer.
    if ((e as { code?: string })?.code === 'permission-denied') return null;
    throw e;
  }
}
