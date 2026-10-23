/**
 * Los estilos que comparten las pantallas de la app de escritorio, en un solo lugar: contorno de foco,
 * botones, la losa obsidiana y los colores de superficie y texto secundario según el modo.
 */
export const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7647eb]';

/** El botón principal (lima): la acción más importante de una pantalla. */
export const PRIMARY = `inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-[#bdf559] px-7 text-base font-bold text-zinc-950 transition-colors duration-200 hover:bg-[#c8ff6a] active:scale-[0.97] cursor-pointer disabled:opacity-50 ${FOCUS}`;

/** Un enlace de texto (ir a otra pantalla). */
export const LINK = `inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-1 text-sm font-bold underline-offset-4 hover:underline cursor-pointer ${FOCUS}`;

/** Un botón secundario, sobre la superficie de la pantalla. */
export const soft = (isDark: boolean) =>
  `inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-sm font-bold transition-colors duration-200 active:scale-[0.97] cursor-pointer disabled:opacity-50 ${FOCUS} ${isDark ? 'bg-white/[0.08] hover:bg-white/[0.16]' : 'bg-[#f3f3f5] hover:bg-[#e4dcff]'}`;

/** Un campo de selección o de texto. */
export const field = (isDark: boolean) =>
  `min-h-[44px] rounded-mio-sm px-3 text-base font-medium disabled:opacity-60 ${FOCUS} ${isDark ? 'bg-white/[0.08] text-white placeholder:text-zinc-500' : 'bg-[#f3f3f5] text-zinc-950 placeholder:text-zinc-500'}`;

/** La losa obsidiana, apenas levantada en modo oscuro para que no se pierda contra la página. */
export const slab = (isDark: boolean) => (isDark ? 'bg-[#16122a]' : 'bg-[#0b0914]');

/** El bloque de superficie (blanco o casi negro) y el texto secundario sobre él. */
export const surface = (isDark: boolean) => (isDark ? 'bg-[#0e0d16] text-white' : 'bg-white text-zinc-950');
export const muted = (isDark: boolean) => (isDark ? 'text-zinc-400' : 'text-zinc-600');

/** El bloque lila (ayuda y guía), apenas violeta en los dos modos. */
export const lilac = (isDark: boolean) => (isDark ? 'bg-[#221a45] text-white' : 'bg-[#e9e3ff] text-zinc-950');
