//! La vista general de una planilla: un análisis de toda la tabla, antes de elegir qué columna mirar
//! en detalle. De cada columna, su tipo, cuántos vacíos traía, cuántos valores distintos tiene y cómo
//! se reparten (los números en tramos; el resto, los más comunes); qué números se mueven juntos; de
//! qué fecha a qué fecha va y qué meses faltan; y lo que conviene revisar, en palabras.

use crate::anomalies::cell_text;
use crate::clean::{median, quantile, Col, Data, CATEGORICAL, DATE, ID, NUMERIC, TEXT};
use crate::dates::{month_start, next_month_start, ymd, DAY_NS};
use crate::pynum::{pearson, std};
use crate::sheet::Sheet;
use serde_json::{json, Value};
use std::collections::{BTreeMap, HashMap};

/// Tramos del gráfico de cada columna de números.
const BINS: usize = 12;
/// Cuántos de los valores más comunes se muestran de cada columna que no es de números.
const TOP: usize = 6;
/// Columnas de números que entran en el mapa de relaciones (las primeras).
const MAX_RELATED: usize = 12;
/// Desde qué correlación (en valor absoluto) dos columnas "se mueven juntas".
const STRONG: f64 = 0.5;
/// Desde qué parte de vacíos una columna merece un aviso.
const MANY_EMPTY: f64 = 0.3;

fn present(c: &Col) -> Option<Vec<f64>> {
    Some(c.numbers()?.iter().copied().filter(|x| !x.is_nan()).collect())
}

/// Un número que se puede mandar a la pantalla (`null` si no lo es).
fn finite(x: f64) -> Value {
    if x.is_finite() { json!(x) } else { Value::Null }
}

/// Mínimo, máximo, promedio, mediana, desvío y suma; cuántos quedan lejos del resto (fuera de 1,5
/// veces el rango del medio, la regla de las cajas); y los demás en `BINS` tramos iguales, así unos
/// pocos valores enormes no aplastan el gráfico.
fn numbers(v: &[f64]) -> Value {
    if v.is_empty() {
        return Value::Null;
    }
    let (min, max) = v.iter().fold((f64::INFINITY, f64::NEG_INFINITY), |(a, b), &x| (a.min(x), b.max(x)));
    let sum: f64 = v.iter().sum();
    let mut sorted = v.to_vec();
    let (q1, q3) = (quantile(&mut sorted, 0.25), quantile(&mut sorted, 0.75));
    let (lo, hi) = (q1 - 1.5 * (q3 - q1), q3 + 1.5 * (q3 - q1));
    let (from, to) = (lo.max(min), hi.min(max));
    let width = (to - from) / BINS as f64;
    let mut counts = vec![0usize; if width > 0.0 { BINS } else { 1 }];
    for &x in v.iter().filter(|&&x| x >= lo && x <= hi) {
        let b = if width > 0.0 { (((x - from) / width) as usize).min(BINS - 1) } else { 0 };
        counts[b] += 1;
    }
    json!({
        "min": min, "max": max, "promedio": sum / v.len() as f64, "mediana": median(v.to_vec()), "desvio": finite(std(v)), "suma": sum,
        "tramos": { "desde": from, "hasta": to, "cuentas": counts },
        "alejados": v.iter().filter(|&&x| x < lo || x > hi).count(),
    })
}

/// Los valores más comunes (como texto), con cuántas filas tiene cada uno, y cuántas quedan en el resto.
fn common(c: &Col, n: usize) -> Value {
    let mut counts: HashMap<String, usize> = HashMap::new();
    let mut empty = 0;
    for i in 0..n {
        match cell_text(c, i).as_str() {
            "null" | "" => empty += 1,
            t => *counts.entry(t.to_string()).or_default() += 1,
        }
    }
    let mut top: Vec<(String, usize)> = counts.into_iter().collect();
    top.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    let shown: usize = top.iter().take(TOP).map(|t| t.1).sum();
    json!({ "comunes": top.iter().take(TOP).map(|(v, k)| json!([v, k])).collect::<Vec<_>>(), "resto": n - shown - empty })
}

/// Filas por mes de una columna de fechas (el primer día de cada mes, de punta a punta: los meses sin
/// filas también, con cero).
fn months(t: &[Option<i64>]) -> Option<Vec<(i64, usize)>> {
    let mut by_month: BTreeMap<i64, usize> = BTreeMap::new();
    for ns in t.iter().flatten() {
        *by_month.entry(month_start(ns.div_euclid(DAY_NS))).or_default() += 1;
    }
    let (&first, &last) = (by_month.keys().next()?, by_month.keys().next_back()?);
    let mut out = Vec::new();
    let mut m = first;
    while m <= last {
        out.push((m, by_month.get(&m).copied().unwrap_or(0)));
        m = next_month_start(m);
    }
    Some(out)
}

fn dates(t: &[Option<i64>]) -> Value {
    let days: Vec<i64> = t.iter().flatten().map(|ns| ns.div_euclid(DAY_NS)).collect();
    let (Some(from), Some(to)) = (days.iter().min(), days.iter().max()) else { return Value::Null };
    let per_month = months(t).unwrap_or_default();
    json!({
        "desde": ymd(*from), "hasta": ymd(*to),
        "meses": per_month.iter().map(|(m, k)| json!([ymd(*m)[..7], k])).collect::<Vec<_>>(),
        "meses_vacios": per_month.iter().filter(|(_, k)| *k == 0).map(|(m, _)| ymd(*m)[..7].to_string()).collect::<Vec<_>>(),
    })
}

/// Una columna: su tipo (el del perfil), cuántos vacíos traía antes de limpiar, cuántos valores
/// distintos tiene y lo que corresponde a su tipo.
fn column(s: &Sheet, c: &Col) -> Value {
    let n = s.frame.rows();
    let kind = s.profile.kind(&c.name).unwrap_or(TEXT);
    // Las vacías que se reconocieron al limpiar o las que se completaron (lo que sea más: una celda
    // vacía de entrada no pasa por la detección de "N/A", "s/d"...).
    let count = |m: &BTreeMap<String, usize>| m.get(&c.name).copied().unwrap_or(0);
    let empty = count(&s.report.nulls_detected).max(count(&s.report.imputed)).max(c.null_count());
    let mut out = json!({ "nombre": c.name, "tipo": kind, "vacios": empty, "distintos": c.nunique() });
    match (&c.data, kind) {
        (Data::Time(t), _) => out["fechas"] = dates(t),
        (_, NUMERIC) => out["numeros"] = present(c).map_or(Value::Null, |v| numbers(&v)),
        _ => out["valores"] = common(c, n),
    }
    out
}

/// Qué columnas de números se mueven juntas: la correlación de cada par (de las primeras
/// `MAX_RELATED`) y los pares fuertes, de más a menos.
fn relations(s: &Sheet) -> Value {
    let names: Vec<String> = s.profile.of_kind(NUMERIC).into_iter().take(MAX_RELATED).collect();
    let values: Vec<Vec<f64>> = names.iter().filter_map(|n| s.frame.col(n)?.numbers().map(|v| v.into_owned())).collect();
    if values.len() < 2 {
        return Value::Null;
    }
    let matrix: Vec<Vec<f64>> = values.iter().map(|a| values.iter().map(|b| pearson(a, b)).collect()).collect();
    let mut strong: Vec<(usize, usize, f64)> = (0..names.len())
        .flat_map(|i| (i + 1..names.len()).map(move |j| (i, j)))
        .map(|(i, j)| (i, j, matrix[i][j]))
        .filter(|(_, _, r)| r.abs() >= STRONG)
        .collect();
    strong.sort_by(|a, b| b.2.abs().total_cmp(&a.2.abs()));
    json!({
        "columnas": names,
        "matriz": matrix.iter().map(|row| row.iter().map(|&r| finite(r)).collect::<Vec<_>>()).collect::<Vec<_>>(),
        "fuertes": strong.iter().take(5).map(|(i, j, r)| json!({ "a": names[*i], "b": names[*j], "r": r })).collect::<Vec<_>>(),
    })
}

/// Lo que conviene mirar antes de analizar, dicho en palabras.
fn warnings(s: &Sheet, columns: &[Value]) -> Vec<String> {
    let n = s.report.original_rows.max(1) as f64;
    let mut out = Vec::new();
    if s.report.duplicates_removed > 0 {
        out.push(format!("Había {} filas repetidas: quedaron afuera.", s.report.duplicates_removed));
    }
    for c in columns {
        let name = c["nombre"].as_str().unwrap_or_default();
        let empty = c["vacios"].as_u64().unwrap_or(0) as f64;
        if empty / n >= MANY_EMPTY {
            out.push(format!("«{name}» venía vacía en el {:.0} % de las filas.", empty / n * 100.0));
        }
        if c["distintos"].as_u64() == Some(1) {
            out.push(format!("«{name}» tiene el mismo valor en todas las filas: no aporta nada al análisis."));
        }
        if c["tipo"] == ID {
            out.push(format!("«{name}» parece un código (casi todos distintos): no se usa para buscar relaciones."));
        }
        if let Some(gaps) = c["fechas"]["meses_vacios"].as_array().filter(|g| !g.is_empty()) {
            out.push(format!("«{name}» no tiene filas en {} {} entre la primera y la última fecha.", gaps.len(), if gaps.len() == 1 { "mes" } else { "meses" }));
        }
    }
    out
}

/// La vista general de la planilla abierta, ya limpia.
pub fn overview(s: &Sheet) -> Value {
    let columns: Vec<Value> = s.columns().map(|c| column(s, c)).collect();
    let warnings = warnings(s, &columns);
    let count = |kind: &str| columns.iter().filter(|c| c["tipo"] == kind).count();
    json!({
        "filas": s.frame.rows(),
        "filas_originales": s.report.original_rows,
        "calidad": s.profile.quality_score,
        "tipos": { "numeros": count(NUMERIC), "fechas": count(DATE), "categorias": count(CATEGORICAL), "textos": count(TEXT), "codigos": count(ID) },
        "columnas": columns,
        "relaciones": relations(s),
        "avisos": warnings,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::progress::Progress;
    use std::path::Path;

    /// El ejemplo de la app: ventas de un año con clientes y productos. Cada columna con lo suyo, las
    /// unidades y el monto se mueven juntos, y los avisos salen en palabras.
    #[test]
    fn mira_toda_la_planilla() {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../src-tauri/ejemplos");
        let paths: Vec<_> = ["ventas_2025_1er_semestre.csv", "ventas_2025_2do_semestre.csv", "clientes.csv", "productos.csv"].iter().map(|f| dir.join(f)).collect();
        let s = Sheet::open_many(&paths.iter().map(|p| p.as_path()).collect::<Vec<_>>(), &Progress::NONE).unwrap();
        let o = overview(&s);
        assert_eq!(o["filas"], 3534);
        let col = |name: &str| o["columnas"].as_array().unwrap().iter().find(|c| c["nombre"] == name).unwrap().clone();

        let monto = col("monto");
        let tramos: u64 = monto["numeros"]["tramos"]["cuentas"].as_array().unwrap().iter().map(|k| k.as_u64().unwrap()).sum();
        assert_eq!(tramos + monto["numeros"]["alejados"].as_u64().unwrap(), 3534, "cada fila cae en un tramo o está lejos del resto");
        assert!((monto["numeros"]["suma"].as_f64().unwrap() - s.total("monto").unwrap()).abs() < 1e-6);
        assert!(monto["numeros"]["min"].as_f64() <= monto["numeros"]["mediana"].as_f64());

        let fecha = col("fecha");
        assert_eq!((&fecha["fechas"]["desde"], &fecha["fechas"]["hasta"]), (&json!("2025-01-01"), &json!("2025-12-31")), "{fecha}");
        assert_eq!(fecha["fechas"]["meses"].as_array().unwrap().len(), 12);

        let segmento = col("segmento");
        let comunes = segmento["valores"]["comunes"].as_array().unwrap();
        let shown: u64 = comunes.iter().map(|c| c[1].as_u64().unwrap()).sum();
        assert_eq!(shown + segmento["valores"]["resto"].as_u64().unwrap(), 3534);

        let r = &o["relaciones"];
        assert!(r["fuertes"].as_array().unwrap().iter().any(|p| (p["a"] == "unidades" && p["b"] == "monto") || (p["a"] == "monto" && p["b"] == "unidades")), "{r}");
        assert_eq!(col("unidades")["vacios"], 8, "las que venían vacías y completó la limpieza");
        assert!(o["avisos"].as_array().is_some());
    }
}
