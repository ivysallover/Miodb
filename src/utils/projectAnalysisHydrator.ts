/**
 * projectAnalysisHydrator.ts
 * Devuelve el análisis REAL de un proyecto guardado, buscándolo donde pueda estar (el propio objeto,
 * el almacenamiento del navegador, los proyectos guardados, el análisis activo).
 * Si no lo encuentra devuelve null: nunca inventa un análisis con cifras que no salieron de los datos.
 */

/** Ids of the two example cards that older versions of the Projects page invented. */
const INVENTED_IDS = new Set(['proj-demo-1', 'proj-demo-2']);

/**
 * Older versions of this file built a whole made-up analysis (97,2 % de precisión, "LightGBM + Prophet
 * AutoML", correlaciones a mano) and some browsers kept it in localStorage. The real engine never
 * answers with that motor name, so it is the signature of the invented one.
 */
const isInvented = (a: any) => a?.forecast?.metrics?.motor === 'LightGBM + Prophet AutoML';

export function hydrateProjectAnalysis(p: any): any | null {
  if (!p || INVENTED_IDS.has(p.id) || INVENTED_IDS.has(p.upload_id)) return null;
  const found = findAnalysis(p);
  return found && !isInvented(found) ? found : null;
}

function findAnalysis(p: any): any | null {

  // 1. Si p.data ya contiene el análisis completo real:
  if (p?.data && typeof p.data === 'object' && (p.data.profile || p.data.charts || p.data.forecast || p.data.anomalies || p.data.kpis)) {
    return p.data;
  }

  // 2. Si p es directamente el análisis completo (ej: desde mio_active_analysis o resultado crudo de analyze):
  if (p.profile && (p.charts || p.forecast || p.anomalies || p.kpis || p.numeric_columns || p.numericColumns)) {
    return p;
  }

  // 3. Si es una tarjeta de proyecto que no tiene .data en memoria, buscar en localStorage
  const targetId = p?.upload_id || p?.uploadId || p?.id;
  const title = p?.title || p?.filename;
  if (typeof window !== 'undefined') {
    try {
      if (targetId) {
        const raw = localStorage.getItem(`mio_result_${targetId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && (parsed.profile || parsed.charts || parsed.forecast || parsed.anomalies || parsed.kpis)) {
            return parsed;
          }
        }
      }

      if (title && title !== 'Dataset Guardado' && title !== 'Dataset Analizado' && !title.includes('Retail') && !title.includes('Cadena Frío')) {
        const rawTitle = localStorage.getItem(`mio_result_${title}`);
        if (rawTitle) {
          const parsedTitle = JSON.parse(rawTitle);
          if (parsedTitle && typeof parsedTitle === 'object' && (parsedTitle.profile || parsedTitle.charts || parsedTitle.forecast || parsedTitle.anomalies || parsedTitle.kpis)) {
            return parsedTitle;
          }
        }
      }

      // Buscar en los proyectos guardados
      const rawProjects = localStorage.getItem('mio_projects');
      if (rawProjects) {
        const list = JSON.parse(rawProjects);
        const match = list.find((it: any) => 
          (targetId && (it.id === targetId || it.upload_id === targetId || it.uploadId === targetId)) ||
          (title && title !== 'Dataset Guardado' && title !== 'Dataset Analizado' && !title.includes('Retail') && !title.includes('Cadena Frío') && (it.title === title || it.filename === title))
        );
        if (match && match.data && typeof match.data === 'object' && (match.data.profile || match.data.charts || match.data.forecast || match.data.anomalies || match.data.kpis)) {
          return match.data;
        }
      }

      // Buscar en el análisis activo actual si coincide con este proyecto
      const rawActive = localStorage.getItem('mio_active_analysis');
      if (rawActive) {
        const active = JSON.parse(rawActive);
        if (active && (
          (targetId && (active.upload_id === targetId || active.uploadId === targetId)) ||
          (title && title !== 'Dataset Guardado' && (active.filename === title || active.title === title))
        )) {
          if (active.profile || active.charts || active.forecast || active.anomalies || active.kpis) {
            return active;
          }
        }
      }
    } catch {}
  }

  // 4. No hay resultado guardado para este proyecto: se dice, no se inventa.
  return null;
}
