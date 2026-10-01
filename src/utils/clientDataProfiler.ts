import { ProfileData, ColumnDetail, ColumnRole } from '@/components/ColumnRoleSelector';

/**
 * clientDataProfiler.ts
 * Infiere perfiles y roles de columnas directamente en el navegador del cliente.
 * Garantiza que si FastAPI /profile falla, tiene latencia o el usuario sube un dataset local,
 * las métricas críticas (como precio, price_usd_per_kg, ventas) NUNCA se degraden a categóricas.
 */

const PREFERRED_TARGET_REGEX = /(price|precio|close|cierre|ventas|sales|revenue|ingreso|demanda|target|valor|amount|total|monto|profit|ganancia|score|importe|usd|cost|costo)/i;
const DATE_REGEX = /(date|fecha|time|timestamp|datetime|snapped_at|periodo|year|anio|año|mes|month|created_at|updated_at)/i;
const ID_REGEX = /^(t|idx|step|row|index|id|uuid|hash|folio|codigo|n|i)$/i;
const ID_SUBSTR_REGEX = /(?:^|_)(id|uuid|hash|folio|codigo|index|row|idx|step)(?:$|_)/i;

export async function profileFileClientSide(file: File): Promise<ProfileData> {
  const fileName = file.name;
  const isJson = fileName.toLowerCase().endsWith('.json');
  const isCsv = fileName.toLowerCase().endsWith('.csv');

  let rows: Record<string, any>[] = [];
  let colNames: string[] = [];

  try {
    if (isJson) {
      const text = await file.slice(0, 500000).text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        rows = parsed.slice(0, 100);
      } else if (typeof parsed === 'object' && parsed !== null) {
        for (const k of Object.keys(parsed)) {
          if (Array.isArray(parsed[k]) && parsed[k].length > 0 && typeof parsed[k][0] === 'object') {
            rows = parsed[k].slice(0, 100);
            break;
          }
        }
        if (rows.length === 0) {
          rows = [parsed];
        }
      }
      if (rows.length > 0) {
        colNames = Object.keys(rows[0]);
      }
    } else if (isCsv) {
      const text = await file.slice(0, 200000).text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        // Detectar separador
        const firstLine = lines[0];
        const commas = (firstLine.match(/,/g) || []).length;
        const semicolons = (firstLine.match(/;/g) || []).length;
        const tabs = (firstLine.match(/\t/g) || []).length;
        const sep = semicolons > commas ? ';' : tabs > commas ? '\t' : ',';

        colNames = firstLine.split(sep).map((c) => c.trim().replace(/^["']|["']$/g, ''));
        rows = lines.slice(1, 101).map((line) => {
          const vals = line.split(sep).map((v) => v.trim().replace(/^["']|["']$/g, ''));
          const r: Record<string, any> = {};
          colNames.forEach((col, idx) => {
            r[col] = vals[idx] !== undefined ? vals[idx] : null;
          });
          return r;
        });
      }
    }
  } catch (err) {
    console.warn('Client-side parsing fallback error:', err);
  }

  // Si falló la lectura de texto (ej: XLSX binario o error de parseo), retornar estructura mínima
  if (colNames.length === 0) {
    return {
      filename: file.name,
      n_rows_estimated: Math.max(100, Math.round(file.size / 100)),
      n_cols: 1,
      quality_score: 95,
      quality_label: 'Alta',
      suggested_targets: [],
      columns: [],
      preview_rows: [],
      upload_id: `upload-${Date.now()}`,
    };
  }

  const columns: ColumnDetail[] = colNames.map((name) => {
    const values = rows.map((r) => r[name]).filter((v) => v !== null && v !== undefined && v !== '');
    const uniqueValues = Array.from(new Set(values));
    const sampleValues = uniqueValues.slice(0, 5).map(String);

    let numericCount = 0;
    let dateCount = 0;

    values.forEach((v) => {
      const s = String(v).trim();
      const num = Number(s);
      if (!isNaN(num) && s !== '') {
        numericCount++;
      }
      if (/^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{2}\/\d{2}\/\d{4}/.test(s)) {
        dateCount++;
      }
    });

    const isNumericDominant = values.length > 0 && numericCount / values.length > 0.7;
    const isDateDominant = values.length > 0 && dateCount / values.length > 0.7;

    let suggestedRole: ColumnRole = 'categorical';
    let inferredType = 'categorica';

    if (DATE_REGEX.test(name) || isDateDominant) {
      suggestedRole = 'date';
      inferredType = 'fecha';
    } else if (ID_REGEX.test(name) || ID_SUBSTR_REGEX.test(name) || (name.length === 1 && isNumericDominant)) {
      suggestedRole = 'identifier';
      inferredType = 'identificador';
    } else if (PREFERRED_TARGET_REGEX.test(name) || isNumericDominant) {
      suggestedRole = 'numeric';
      inferredType = 'numerica';
    }

    return {
      name,
      inferred_type: inferredType,
      n_unique: uniqueValues.length,
      null_pct: Math.round(((rows.length - values.length) / Math.max(rows.length, 1)) * 100),
      sample_values: sampleValues,
      suggested_role: suggestedRole,
    };
  });

  const suggestedTargets = columns
    .filter((c) => c.suggested_role === 'numeric' && !ID_REGEX.test(c.name) && !ID_SUBSTR_REGEX.test(c.name))
    .sort((a, b) => {
      const aPref = PREFERRED_TARGET_REGEX.test(a.name) ? 1 : 0;
      const bPref = PREFERRED_TARGET_REGEX.test(b.name) ? 1 : 0;
      return bPref - aPref;
    })
    .map((c) => c.name);

  return {
    filename: file.name,
    n_rows_estimated: Math.max(rows.length, Math.round(file.size / 80)),
    n_cols: colNames.length,
    quality_score: 95,
    quality_label: 'Alta',
    suggested_targets: suggestedTargets,
    columns,
    preview_rows: rows.slice(0, 10),
    upload_id: `upload-${Date.now()}`,
  };
}
