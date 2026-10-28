import type { MioPetMood } from '@/components/pet/MioPet2D';
import { MENU } from './useDesktop';

/**
 * Lo que explica la guía, en un solo lugar: el recorrido de la primera vez (`Recorrido.tsx`) y la
 * página de ayuda (`Guia.tsx`) muestran estos mismos pasos.
 */
export const STEPS: { title: string; text: string; mood: MioPetMood }[] = [
  {
    title: 'Abrí una planilla',
    text: 'CSV o Excel, tal como la tenés. Elegila con el botón o soltala en cualquier parte de la ventana. Si son varias (los meses del mismo reporte, o las ventas y los clientes), elegilas juntas: MIO las une. Se leen en esta compu: no se suben a ningún lado ni se modifican.',
    mood: 'reposo',
  },
  {
    title: 'Elegí qué entender',
    text: 'MIO la limpia (fechas, montos con $ y puntos de miles, celdas vacías, filas de título) y te muestra sus columnas con números, con su total y cómo se movieron mes a mes. Primero va la que sugiere: elegís cuál analizar.',
    mood: 'trabajando',
  },
  {
    title: 'Mirá lo que encontró',
    text: 'Los números clave, los gráficos, qué mueve lo que analizás, los registros que se salen de lo normal, grupos parecidos y una predicción, si los datos alcanzan para hacerla.',
    mood: 'celebrando',
  },
  {
    title: 'Cambiá lo que se analiza',
    text: 'Arriba del resultado, en "Lo que se analiza", elegís otra columna (o, en un Excel, otra hoja) y se vuelve a analizar todo con esa.',
    mood: 'trabajando',
  },
  {
    title: 'Volvé cuando quieras',
    text: 'Cada planilla queda en Mis proyectos con su análisis. Si el archivo no cambió, se abre al instante en lo último que miraste. Si cambió (por ejemplo, le sumaste el mes nuevo), MIO lo analiza de nuevo y te dice qué cambió y cómo le fue a su predicción.',
    mood: 'durmiendo',
  },
];

/** Qué quiere decir cada parte del resultado. */
export const PARTS: { title: string; text: string }[] = [
  { title: 'Calidad', text: 'Qué tan lista está la planilla para analizarla: bajan el puntaje las celdas vacías, las filas repetidas, tener pocas columnas con números y tener pocas filas.' },
  { title: 'Qué lo mueve', text: 'Las columnas que más acompañan a lo que analizás. Acompañar no es causar: es una pista para mirar.' },
  { title: 'Lo que se sale de lo normal', text: 'Registros con combinaciones de valores poco comunes. Puede ser un error de carga o algo que vale la pena revisar.' },
  { title: 'Grupos parecidos', text: 'Filas que se parecen entre sí, armadas solas a partir de los números. Sirve para ver perfiles de clientes, productos o sucursales.' },
  { title: 'Desde la última vez', text: 'Aparece cuando la planilla cambió desde el análisis anterior: cuántas filas entraron, cuánto cambió el total, qué valores raros son nuevos y si lo que pasó cayó dentro del rango que había predicho MIO.' },
  { title: 'Predicción', text: 'Varios modelos predicen un tramo que se esconde y gana el que menos se equivoca. Si ninguno le gana a repetir el último valor o el promedio, MIO no muestra predicción y dice por qué.' },
];

/** Los atajos de teclado (en Windows, Ctrl en lugar de ⌘). */
export const SHORTCUTS: { keys: string; text: string }[] = [
  { keys: '⌘O', text: 'Abrir una planilla' },
  ...MENU.map((m, i) => ({ keys: `⌘${i + 1}`, text: m.label })),
];
