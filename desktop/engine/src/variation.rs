//! Por qué cambió: el último período contra el anterior, y de dónde sale la diferencia.
//!
//! - **Qué se compara.** El último mes contra el anterior. Si el último mes está a medio cargar (la
//!   planilla tiene datos por día y termina antes de fin de mes), los mismos días de los dos meses: del 1
//!   al 15 contra del 1 al 15. Si no hay dos meses enteros, la última semana completa contra la anterior.
//!   Si existe, también el mismo período del año anterior (solo el total).
//! - **De dónde sale.** En cada categoría (cliente, producto, sucursal…), cuánto subió o bajó cada valor;
//!   las diferencias de una categoría suman exacto la diferencia total. Cada valor dice si es nuevo (no
//!   estaba antes), si se perdió (no está ahora) o si sigue. Una categoría que es el período mismo (el
//!   archivo de origen, el mes escrito en texto: ningún valor está en los dos períodos) no explica nada y
//!   queda afuera; dos categorías que son la misma con otro nombre (`producto` y su descripción) van una
//!   vez, con la que se lee mejor.
//! - **Precio o cantidad.** Si hay una columna de cantidades y otra de productos, la diferencia de lo que
//!   se mira se parte en lo que cambió la cantidad (a precio de antes), lo que cambió el precio, lo de los
//!   productos nuevos y lo de los que se dejaron de vender. Suman exacto la diferencia.
//!
//! Solo números: las frases las arma la pantalla (`src/components/dashboard/PorQue.tsx`).

use crate::clean::{Col, Data, CATEGORICAL, DATE, NUMERIC};
use crate::dates::{civil_from_days, days_from_civil, days_in_month, month_start, next_month_start, week_end, ymd, DAY_NS};
use crate::explore::labels;
use crate::forecaster::adds_up;
use crate::sheet::Sheet;
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};

/// Cuántos valores de cada categoría se muestran; el resto va junto en "Otros".
const MAX_SHOWN: usize = 8;
/// Cuántas categorías se mandan, como mucho.
const MAX_COLUMNS: usize = 6;
/// Días de margen para dar un mes por entero (un local que no abre el 1 ni el 31).
const GRACE: i64 = 3;
const NO_DATA: &str = "Sin dato";
const OTHERS: &str = "Otros";
/// Cómo se llama, por lo general, una columna de cantidades y una de productos.
const QUANTITY: [&str; 12] = ["unidad", "cantidad", "cant.", "qty", "units", "quantity", "kilos", "kg", "litros", "bultos", "cajas", "piezas"];
const PRODUCT: [&str; 8] = ["producto", "product", "articulo", "artículo", "item", "sku", "descripcion", "descripción"];

/// Un tramo de días, con los dos extremos adentro.
#[derive(Clone, Copy, Debug, PartialEq)]
struct Span {
    from: i64,
    to: i64,
}

impl Span {
    fn has(&self, day: i64) -> bool {
        (self.from..=self.to).contains(&day)
    }
}

#[derive(Debug, PartialEq)]
struct Periods {
    kind: &'static str,
    before: Span,
    after: Span,
    /// El último mes está a medio cargar: se comparan los mismos días.
    partial: bool,
    year_ago: Option<Span>,
}

/// El mismo tramo `months` meses antes: el mes entero si `s` es un mes entero; si no, los mismos días
/// (recortados al largo de aquel mes).
fn months_back(s: Span, months: i64) -> Span {
    let (y, m, _) = civil_from_days(s.from);
    let whole = s.to == next_month_start(s.from) - 1;
    let total = y * 12 + (m - 1) - months;
    let (y, m) = (total.div_euclid(12), total.rem_euclid(12) + 1);
    let from = days_from_civil(y, m, 1);
    let last = days_in_month(y, m) - 1;
    Span { from, to: from + if whole { last } else { (s.to - s.from).min(last) } }
}

/// Qué dos períodos se comparan, según los días que tienen datos.
fn periods(days: &BTreeSet<i64>) -> Option<Periods> {
    let (&first, &last) = (days.first()?, days.last()?);
    let months: BTreeSet<i64> = days.iter().map(|&d| month_start(d)).collect();
    // Más de dos fechas por mes: datos por día o por semana (no un resumen mensual).
    let fine = days.len() > months.len() * 2;
    let after_start = month_start(last);
    let after_end = next_month_start(after_start) - 1;
    let whole = |s: Span| !fine || first <= s.from + GRACE;
    let partial = fine && last < after_end - GRACE;
    let after = Span { from: after_start, to: if partial { last } else { after_end } };
    let before = months_back(after, 1);
    if months.contains(&before.from) && whole(before) {
        let year_ago = Some(months_back(after, 12)).filter(|s| months.contains(&s.from) && whole(*s));
        return Some(Periods { kind: "mes", before, after, partial, year_ago });
    }
    if !fine {
        return None;
    }
    // Sin dos meses enteros: la última semana completa (una que termina en domingo sin ventas, también)
    // contra la anterior.
    let mut end = week_end(last);
    if last < end - 1 {
        end -= 7;
    }
    let after = Span { from: end - 6, to: end };
    let before = Span { from: end - 13, to: end - 7 };
    let any = |s: Span| days.range(s.from..=s.to).next().is_some();
    (first <= before.from + 1 && any(before) && any(after)).then_some(Periods { kind: "semana", before, after, partial: false, year_ago: None })
}

fn finite(x: f64) -> Value {
    if x.is_finite() { json!(x) } else { Value::Null }
}

fn period(s: Span, total: f64) -> Value {
    json!({ "desde": ymd(s.from), "hasta": ymd(s.to), "total": finite(total) })
}

/// Las filas con dato de los dos períodos (`(fila, 0)` antes, `(fila, 1)` después): lo único que se recorre
/// para cada categoría, no toda la planilla.
type Picked = [(usize, usize)];

/// Lo que tiene un valor de una categoría en los dos períodos: suma y filas, antes y después.
#[derive(Clone, Default)]
struct Sides {
    sum: [f64; 2],
    rows: [usize; 2],
}

impl Sides {
    fn delta(&self) -> f64 {
        self.sum[1] - self.sum[0]
    }
    fn state(&self) -> &'static str {
        match self.rows {
            [0, _] => "nuevo",
            [_, 0] => "perdido",
            _ => "sigue",
        }
    }
    fn add(&mut self, o: &Sides) {
        for k in 0..2 {
            self.sum[k] += o.sum[k];
            self.rows[k] += o.rows[k];
        }
    }
}

/// Una categoría que explica la diferencia: cada valor con lo suyo, de lo que más se movió a lo que menos.
struct Breakdown<'a> {
    col: &'a Col,
    values: Vec<(String, Sides)>,
    /// Qué parte de la diferencia explican sus dos valores que más se movieron hacia el mismo lado.
    explains: f64,
    /// Para reconocer dos columnas que son la misma categoría con otros nombres.
    signature: Vec<(i64, i64, usize, usize)>,
    /// Largo promedio de sus valores: entre dos iguales, la que se lee mejor (el nombre y no el código).
    readable: f64,
}

impl<'a> Breakdown<'a> {
    /// `None` si no explica nada: un solo valor, o ninguno en los dos períodos (la columna es el período mismo).
    fn of(col: &'a Col, picked: &Picked, v: &[f64], delta: f64) -> Option<Breakdown<'a>> {
        let l = labels(col);
        let mut per = vec![Sides::default(); l.names.len()];
        for &(i, k) in picked {
            let s = &mut per[l.of_row[i] as usize];
            s.sum[k] += v[i];
            s.rows[k] += 1;
        }
        // Un mismo texto puede venir de dos valores (un 7 y un "7"): van juntos. En orden fijo, para que la
        // misma planilla dé siempre lo mismo hasta el último decimal.
        let mut merged: BTreeMap<String, Sides> = BTreeMap::new();
        for (name, s) in l.names.into_iter().zip(per).filter(|(_, s)| s.rows != [0, 0]) {
            merged.entry(name.unwrap_or_else(|| NO_DATA.into())).or_default().add(&s);
        }
        let mut values: Vec<(String, Sides)> = merged.into_iter().collect();
        if values.len() < 2 || !values.iter().any(|(_, s)| s.state() == "sigue") {
            return None;
        }
        values.sort_by(|a, b| b.1.delta().abs().total_cmp(&a.1.delta().abs()).then_with(|| a.0.cmp(&b.0)));
        let toward: f64 = values.iter().map(|(_, s)| s.delta()).filter(|d| d * delta > 0.0).take(2).sum();
        let explains = if delta == 0.0 { 0.0 } else { (toward / delta).min(1.0) };
        let mut signature: Vec<(i64, i64, usize, usize)> = values.iter().map(|(_, s)| ((s.sum[0] * 100.0).round() as i64, (s.sum[1] * 100.0).round() as i64, s.rows[0], s.rows[1])).collect();
        signature.sort_unstable();
        let readable = values.iter().map(|(n, _)| n.chars().count()).sum::<usize>() as f64 / values.len() as f64;
        Some(Breakdown { col, values, explains, signature, readable })
    }

    /// Cuánto sirve para contar el cambio: que pocos valores lo expliquen, y mejor si son muchos valores
    /// (que un cliente explique la mitad dice más que un segmento de tres).
    fn score(&self) -> f64 {
        self.explains * (self.values.len() as f64).ln()
    }

    fn to_json(&self) -> Value {
        let value = |name: &str, s: &Sides, state: Option<&str>| {
            json!({ "valor": name, "antes": s.sum[0], "despues": s.sum[1], "diferencia": s.delta(), "filas": s.rows, "estado": state })
        };
        let (shown, rest) = self.values.split_at(self.values.len().min(MAX_SHOWN));
        let mut out: Vec<Value> = shown.iter().map(|(n, s)| value(n, s, Some(s.state()))).collect();
        if !rest.is_empty() {
            let mut others = Sides::default();
            rest.iter().for_each(|(_, s)| others.add(s));
            out.push(value(OTHERS, &others, None));
        }
        let count = |state: &str| {
            let (n, sum) = self.values.iter().filter(|(_, s)| s.state() == state).fold((0, 0.0), |(n, sum), (_, s)| (n + 1, sum + s.delta()));
            json!({ "cantidad": n, "suma": sum })
        };
        json!({
            "nombre": self.col.name,
            "distintos": self.values.len(),
            "valores": out,
            "nuevos": count("nuevo"),
            "perdidos": count("perdido"),
            "explica": self.explains,
        })
    }
}

fn named(list: &[&str], name: &str) -> bool {
    let n = name.to_lowercase();
    list.iter().any(|k| n.contains(k))
}

/// La diferencia partida en cantidad, precio, productos nuevos y productos perdidos (lo que no entra en
/// ninguna, por ejemplo un producto que tiene monto pero no cantidad en un período, va en `resto`).
fn price_and_quantity(qty_name: &str, q: &[f64], product: &Col, picked: &Picked, v: &[f64], delta: f64) -> Value {
    let l = labels(product);
    // Por producto: [monto antes, monto después] y [cantidad antes, cantidad después].
    let mut per = vec![([0.0f64; 2], [0.0f64; 2]); l.names.len()];
    for &(i, k) in picked {
        let e = &mut per[l.of_row[i] as usize];
        e.0[k] += v[i];
        if !q[i].is_nan() {
            e.1[k] += q[i];
        }
    }
    let (mut volume, mut price, mut new, mut lost) = (0.0, 0.0, 0.0, 0.0);
    // Para el cambio de precio promedio: lo vendido ahora a precio de ahora y a precio de antes.
    let (mut at_now, mut at_before) = (0.0, 0.0);
    let mut units = [0.0; 2];
    for (m, u) in &per {
        units = [units[0] + u[0], units[1] + u[1]];
        match (u[0] > 0.0, u[1] > 0.0) {
            (true, true) => {
                let before = m[0] / u[0];
                volume += (u[1] - u[0]) * before;
                price += m[1] - u[1] * before;
                at_now += m[1];
                at_before += u[1] * before;
            }
            (false, true) if m[0] == 0.0 => new += m[1],
            (true, false) if m[1] == 0.0 => lost -= m[0],
            _ => {}
        }
    }
    json!({
        "cantidad_columna": qty_name,
        "producto_columna": product.name,
        "cantidad": volume,
        "precio": price,
        "nuevos": new,
        "perdidos": lost,
        "resto": delta - volume - price - new - lost,
        "unidades": units,
        "precios": if at_before > 0.0 { finite(at_now / at_before - 1.0) } else { Value::Null },
    })
}

/// Por qué cambió `target` entre los dos últimos períodos; `null` si no se puede decir (sin fecha, sin
/// dos períodos con datos, o una columna que sumada no dice nada, como un precio).
pub fn variation(s: &Sheet, target: &str) -> Value {
    let (Some(date), true) = (s.profile.of_kind(DATE).into_iter().next(), s.profile.kind(target) == Some(NUMERIC) && adds_up(target)) else {
        return Value::Null;
    };
    let (Some(Data::Time(t)), Some(v)) = (s.frame.col(&date).map(|c| &c.data), s.frame.col(target).and_then(|c| c.numbers())) else {
        return Value::Null;
    };
    let day = |i: usize| t[i].filter(|_| !v[i].is_nan()).map(|ns| ns.div_euclid(DAY_NS));
    let Some(p) = periods(&(0..t.len()).filter_map(day).collect()) else { return Value::Null };

    // Una sola pasada por la planilla: las filas de cada período, sus totales y el del año anterior.
    let (mut picked, mut totals, mut year) = (Vec::new(), [0.0; 2], 0.0);
    for (i, d) in (0..t.len()).filter_map(|i| Some((i, day(i)?))) {
        let k = if p.before.has(d) { 0 } else if p.after.has(d) { 1 } else {
            if p.year_ago.is_some_and(|y| y.has(d)) {
                year += v[i];
            }
            continue;
        };
        totals[k] += v[i];
        picked.push((i, k));
    }
    let delta = totals[1] - totals[0];

    let mut found: Vec<Breakdown> = Vec::new();
    for b in s.profile.of_kind(CATEGORICAL).iter().filter_map(|n| Breakdown::of(s.frame.col(n)?, &picked, &v, delta)) {
        match found.iter_mut().find(|f| f.signature == b.signature) {
            Some(same) if b.readable > same.readable => *same = b,
            Some(_) => {}
            None => found.push(b),
        }
    }
    found.sort_by(|a, b| b.score().total_cmp(&a.score()).then_with(|| a.col.name.cmp(&b.col.name)));

    // Precio o cantidad: con una columna de cantidades y una de productos (la que se lee mejor, ya elegida arriba).
    let quantity = s.profile.of_kind(NUMERIC).into_iter().find(|n| n != target && adds_up(n) && named(&QUANTITY, n));
    let product = found.iter().find(|b| named(&PRODUCT, &b.col.name)).map(|b| b.col);
    let split = match (quantity, product) {
        (Some(name), Some(product)) => s.frame.col(&name).and_then(|c| c.numbers()).map(|q| price_and_quantity(&name, &q, product, &picked, &v, delta)),
        _ => None,
    };
    found.truncate(MAX_COLUMNS);

    json!({
        "columna": target,
        "periodo": p.kind,
        "parcial": p.partial,
        "antes": period(p.before, totals[0]),
        "despues": period(p.after, totals[1]),
        "diferencia": delta,
        "variacion": if totals[0] > 0.0 { finite(delta / totals[0]) } else { Value::Null },
        "categorias": found.iter().map(Breakdown::to_json).collect::<Vec<_>>(),
        "precio_cantidad": split,
        "anio_anterior": p.year_ago.map(|y| period(y, year)),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::progress::Progress;
    use std::path::Path;

    fn day(y: i64, m: i64, d: i64) -> i64 {
        days_from_civil(y, m, d)
    }
    fn span(a: (i64, i64, i64), b: (i64, i64, i64)) -> Span {
        Span { from: day(a.0, a.1, a.2), to: day(b.0, b.1, b.2) }
    }
    fn every_day(from: i64, to: i64) -> BTreeSet<i64> {
        (from..=to).collect()
    }
    fn close(a: f64, b: f64) {
        assert!((a - b).abs() < 1e-6 * (1.0 + b.abs()), "{a} y {b}");
    }

    #[test]
    fn elige_que_comparar() {
        // Un año entero por día: diciembre contra noviembre, sin el año anterior.
        let p = periods(&every_day(day(2025, 1, 1), day(2025, 12, 31))).unwrap();
        assert_eq!((p.kind, p.partial), ("mes", false));
        assert_eq!((p.before, p.after), (span((2025, 11, 1), (2025, 11, 30)), span((2025, 12, 1), (2025, 12, 31))));
        assert_eq!(p.year_ago, None);

        // Termina el 15 de marzo: del 1 al 15 de marzo contra del 1 al 15 de febrero, y lo mismo de un año antes.
        let p = periods(&every_day(day(2024, 1, 1), day(2025, 3, 15))).unwrap();
        assert!(p.partial);
        assert_eq!((p.before, p.after), (span((2025, 2, 1), (2025, 2, 15)), span((2025, 3, 1), (2025, 3, 15))));
        assert_eq!(p.year_ago, Some(span((2024, 3, 1), (2024, 3, 15))));

        // Termina el 31 de marzo a medias: el 31 contra un febrero de 28 días, recortado a febrero.
        let p = periods(&every_day(day(2025, 2, 1), day(2025, 3, 30))).unwrap();
        assert!(!p.partial, "dos días antes de fin de mes cuenta como entero");

        // Un resumen por mes (una fila el 1 de cada mes): mes contra mes, sin "a medio cargar".
        let monthly: BTreeSet<i64> = (1..=6).map(|m| day(2025, m, 1)).collect();
        let p = periods(&monthly).unwrap();
        assert_eq!((p.kind, p.partial, p.after), ("mes", false, span((2025, 6, 1), (2025, 6, 30))));

        // Si febrero está entero, del 1 al 5 de marzo contra del 1 al 5 de febrero.
        let p = periods(&every_day(day(2025, 1, 20), day(2025, 3, 5))).unwrap();
        assert_eq!((p.kind, p.partial, p.before), ("mes", true, span((2025, 2, 1), (2025, 2, 5))));
        // Desde el 10 de febrero (febrero no está entero): la última semana completa contra la anterior.
        let p = periods(&every_day(day(2025, 2, 10), day(2025, 3, 5))).unwrap();
        assert_eq!(p.kind, "semana");
        assert_eq!((p.before, p.after), (span((2025, 2, 17), (2025, 2, 23)), span((2025, 2, 24), (2025, 3, 2))));

        // Un solo mes por día, empezado a mitad de mes: nada que comparar.
        assert!(periods(&every_day(day(2025, 1, 25), day(2025, 1, 31))).is_none());
        assert!(periods(&BTreeSet::new()).is_none());
    }

    /// Una planilla escrita a mano: dos meses, un cliente que se va, uno que llega, un producto que sube de
    /// precio y otro que vende más unidades.
    #[test]
    fn explica_la_diferencia() {
        let dir = std::env::temp_dir().join("mio_variacion_test");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("ventas.csv");
        let mut csv = String::from("fecha;cliente;producto;descripcion;unidades;monto;mes\n");
        // Octubre: Ana compra café (a 100) y Beto yerba (a 50); Carla todavía no está.
        // Noviembre: Beto no compra más y llega Carla, que lleva el doble de yerba; el café sube a 120.
        let units = |d: i64| d % 5 + 1;
        let (mut cafe, mut yerba) = ([0.0; 2], [0.0; 2]);
        for d in 1..=31 {
            csv.push_str(&format!("{d:02}/10/2025;Ana;CAF;Café molido;{};{};octubre\n", units(d), units(d) * 100));
            csv.push_str(&format!("{d:02}/10/2025;Beto;YER;Yerba mate;{};{};octubre\n", units(d), units(d) * 50));
            cafe[0] += units(d) as f64;
            yerba[0] += units(d) as f64;
        }
        for d in 1..=30 {
            csv.push_str(&format!("{d:02}/11/2025;Ana;CAF;Café molido;{};{};noviembre\n", units(d), units(d) * 120));
            csv.push_str(&format!("{d:02}/11/2025;Carla;YER;Yerba mate;{};{};noviembre\n", 2 * units(d), 2 * units(d) * 50));
            cafe[1] += units(d) as f64;
            yerba[1] += 2.0 * units(d) as f64;
        }
        std::fs::write(&path, csv).unwrap();
        let s = Sheet::open(&path, None, &Progress::NONE).unwrap();
        let w = variation(&s, "monto");

        assert_eq!((&w["periodo"], &w["parcial"]), (&json!("mes"), &json!(false)), "{w}");
        let (before, after) = (cafe[0] * 100.0 + yerba[0] * 50.0, cafe[1] * 120.0 + yerba[1] * 50.0);
        close(w["antes"]["total"].as_f64().unwrap(), before);
        close(w["despues"]["total"].as_f64().unwrap(), after);
        close(w["diferencia"].as_f64().unwrap(), after - before);

        let cats = w["categorias"].as_array().unwrap();
        let names: Vec<&str> = cats.iter().map(|c| c["nombre"].as_str().unwrap()).collect();
        assert!(!names.contains(&"mes"), "el mes en texto es el período mismo: {names:?}");
        assert!(names.contains(&"descripcion") ^ names.contains(&"producto"), "producto y descripción son lo mismo: va una sola: {names:?}");
        assert!(names.contains(&"descripcion"), "la que se lee mejor: {names:?}");
        for c in cats {
            let sum: f64 = c["valores"].as_array().unwrap().iter().map(|v| v["diferencia"].as_f64().unwrap()).sum();
            close(sum, after - before);
        }
        let cliente = cats.iter().find(|c| c["nombre"] == "cliente").unwrap();
        let of = |name: &str| cliente["valores"].as_array().unwrap().iter().find(|v| v["valor"] == name).unwrap().clone();
        assert_eq!((&of("Beto")["estado"], &of("Carla")["estado"], &of("Ana")["estado"]), (&json!("perdido"), &json!("nuevo"), &json!("sigue")));
        assert_eq!((&cliente["nuevos"]["cantidad"], &cliente["perdidos"]["cantidad"]), (&json!(1), &json!(1)));
        close(cliente["perdidos"]["suma"].as_f64().unwrap(), -yerba[0] * 50.0);

        // Precio y cantidad: el café cambió de unidades a 100 y subió 20 por unidad; la yerba, solo de unidades.
        let pq = &w["precio_cantidad"];
        assert_eq!((&pq["cantidad_columna"], &pq["producto_columna"]), (&json!("unidades"), &json!("descripcion")));
        close(pq["cantidad"].as_f64().unwrap(), (cafe[1] - cafe[0]) * 100.0 + (yerba[1] - yerba[0]) * 50.0);
        close(pq["precio"].as_f64().unwrap(), cafe[1] * 20.0);
        let parts: f64 = ["cantidad", "precio", "nuevos", "perdidos", "resto"].iter().map(|k| pq[k].as_f64().unwrap()).sum();
        close(parts, after - before);
        close(pq["resto"].as_f64().unwrap(), 0.0);
        close(pq["precios"].as_f64().unwrap(), (cafe[1] * 120.0 + yerba[1] * 50.0) / (cafe[1] * 100.0 + yerba[1] * 50.0) - 1.0);

        // Lo que sumado no dice nada (un precio), no.
        assert!(variation(&s, "precio").is_null());
    }

    /// El ejemplo de la app: diciembre contra noviembre, cada categoría cierra con la diferencia y la que
    /// va primero es la que mejor la explica.
    #[test]
    fn el_ejemplo_de_la_app() {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../src-tauri/ejemplos");
        let paths: Vec<_> = ["ventas_2025_1er_semestre.csv", "ventas_2025_2do_semestre.csv", "clientes.csv", "productos.csv"].iter().map(|f| dir.join(f)).collect();
        let s = Sheet::open_many(&paths.iter().map(|p| p.as_path()).collect::<Vec<_>>(), &Progress::NONE).unwrap();
        let w = variation(&s, "monto");
        assert_eq!((&w["antes"]["desde"], &w["despues"]["hasta"]), (&json!("2025-11-01"), &json!("2025-12-31")), "{w}");
        let delta = w["diferencia"].as_f64().unwrap();
        let cats = w["categorias"].as_array().unwrap();
        assert!(cats.len() >= 3, "{cats:?}");
        for c in cats {
            let sum: f64 = c["valores"].as_array().unwrap().iter().map(|v| v["diferencia"].as_f64().unwrap()).sum();
            close(sum, delta);
        }
        let scores: Vec<f64> = cats.iter().map(|c| c["explica"].as_f64().unwrap() * (c["distintos"].as_f64().unwrap()).ln()).collect();
        assert!(scores.windows(2).all(|w| w[0] >= w[1]), "de la que más explica a la que menos: {scores:?}");
        let names: Vec<&str> = cats.iter().map(|c| c["nombre"].as_str().unwrap()).collect();
        assert!(!(names.contains(&"cliente") && names.contains(&"cliente_id")), "{names:?}");
        let pq = &w["precio_cantidad"];
        let parts: f64 = ["cantidad", "precio", "nuevos", "perdidos", "resto"].iter().map(|k| pq[k].as_f64().unwrap()).sum();
        close(parts, delta);
    }
}
