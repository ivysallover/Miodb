/**
 * La dirección de un análisis compartido (`compartir.ts`). Va aparte para que la portada pueda reconocerla
 * sin cargar Firestore.
 */

/** El enlace de un análisis compartido. */
export const sharePath = (id: string) => `/compartido/${id}`;
/** El id de un enlace (22 letras al azar), o `null` si la dirección no es de uno. */
export const shareIdOf = (path: string) => /^\/compartido\/([A-Za-z0-9_-]{22})\/?$/.exec(path)?.[1] ?? null;
