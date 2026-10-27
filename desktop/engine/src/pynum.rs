//! Números calculados y escritos como en el motor de Python (numpy y pandas): sumas, promedios por
//! grupo, redondeos, separador de miles y "1.2K", para que los gráficos y los números de la pantalla
//! digan lo mismo que en la web. Las columnas `float32` (achicadas por la limpieza) se calculan en
//! precisión simple, como lo hacen numpy y pandas.

/// `round(x, d)` de Python (al par, sobre el valor binario exacto).
pub fn py_round(x: f64, d: usize) -> f64 {
    format!("{x:.d$}").parse().unwrap_or(x)
}

/// `max(lo, min(hi, x))` de Python: como `clamp`, salvo que un NaN da `hi` (Python no lo propaga).
pub fn py_clamp(x: f64, lo: f64, hi: f64) -> f64 {
    if x.is_nan() { hi } else { x.clamp(lo, hi) }
}

/// El valor en la precisión de la columna (`float32` o `float64`). Sumar, restar, multiplicar o
/// dividir en `f64` y después pasar a `f32` da lo mismo que hacerlo en `f32`.
pub fn cast(x: f64, f32: bool) -> f64 {
    if f32 { x as f32 as f64 } else { x }
}

/// `Series.round(d)` de pandas (escala, redondeo al par y vuelve, en la precisión de la columna).
pub fn np_round(x: f64, d: i32, f32: bool) -> f64 {
    let k = 10f64.powi(d);
    cast(cast(x * k, f32).round_ties_even() / k, f32)
}

/// `sum()` de numpy: el primer valor y después la suma por pares del resto (bloques de 8).
pub fn np_sum(v: &[f64], f32: bool) -> f64 {
    fn pairwise(a: &[f64], f32: bool) -> f64 {
        let add = |x: f64, y: f64| cast(x + y, f32);
        let n = a.len();
        if n < 8 {
            a.iter().fold(0.0, |s, x| add(s, *x))
        } else if n <= 128 {
            let mut r = [0.0; 8];
            r.copy_from_slice(&a[..8]);
            let full = n - n % 8;
            for chunk in a[8..full].chunks(8) {
                r.iter_mut().zip(chunk).for_each(|(acc, x)| *acc = add(*acc, *x));
            }
            let res = add(add(add(r[0], r[1]), add(r[2], r[3])), add(add(r[4], r[5]), add(r[6], r[7])));
            a[full..].iter().fold(res, |s, x| add(s, *x))
        } else {
            let half = n / 2 - (n / 2) % 8;
            add(pairwise(&a[..half], f32), pairwise(&a[half..], f32))
        }
    }
    match v.split_first() {
        Some((first, rest)) => cast(*first + pairwise(rest, f32), f32),
        None => 0.0,
    }
}

/// Suma compensada (Kahan) como `group_mean` de pandas, en la precisión de la columna.
#[derive(Default, Clone, Copy)]
pub struct Kahan {
    sum: f64,
    comp: f64,
    pub n: usize,
}

impl Kahan {
    pub fn add(&mut self, x: f64, f32: bool) {
        let y = cast(x - self.comp, f32);
        let t = cast(self.sum + y, f32);
        self.comp = cast(cast(t - self.sum, f32) - y, f32);
        self.sum = t;
        self.n += 1;
    }

    /// El promedio (NaN sin valores).
    pub fn mean(&self, f32: bool) -> f64 {
        if self.n == 0 { f64::NAN } else { cast(self.sum / self.n as f64, f32) }
    }
}

pub fn mean(v: &[f64]) -> f64 {
    v.iter().sum::<f64>() / v.len() as f64
}

/// Desvío estándar muestral (`std()`, sin vacíos), sin copiar los valores.
pub fn std(v: &[f64]) -> f64 {
    let present = || v.iter().filter(|x| !x.is_nan());
    let n = present().count();
    if n < 2 {
        return f64::NAN;
    }
    let m = present().sum::<f64>() / n as f64;
    (present().map(|a| (a - m).powi(2)).sum::<f64>() / (n - 1) as f64).sqrt()
}

/// Correlación de Pearson con las filas donde están los dos valores (como `DataFrame.corr`), sin
/// copiar los valores.
pub fn pearson(x: &[f64], y: &[f64]) -> f64 {
    let pairs = || x.iter().zip(y).filter(|(p, q)| !p.is_nan() && !q.is_nan());
    let n = pairs().count();
    if n < 2 {
        return f64::NAN;
    }
    let ma = pairs().map(|(p, _)| p).sum::<f64>() / n as f64;
    let mb = pairs().map(|(_, q)| q).sum::<f64>() / n as f64;
    let (mut sab, mut saa, mut sbb) = (0.0, 0.0, 0.0);
    for (p, q) in pairs() {
        sab += (p - ma) * (q - mb);
        saa += (p - ma).powi(2);
        sbb += (q - mb).powi(2);
    }
    (sab / (saa * sbb).sqrt()).clamp(-1.0, 1.0)
}

/// Separador de miles con coma, como `f"{x:,}"`.
fn thousands(int: &str) -> String {
    let (sign, digits) = int.strip_prefix('-').map_or(("", int), |d| ("-", d));
    let mut out = String::new();
    for (i, ch) in digits.chars().enumerate() {
        if i > 0 && (digits.len() - i) % 3 == 0 {
            out.push(',');
        }
        out.push(ch);
    }
    format!("{sign}{out}")
}

/// `f"{x:.3g}"` de Python.
fn general3(x: f64) -> String {
    if x == 0.0 {
        return "0".into();
    }
    let exp = format!("{x:.2e}");
    let (mantissa, e) = exp.split_once('e').unwrap();
    let e: i32 = e.parse().unwrap();
    let trim = |s: String| if s.contains('.') { s.trim_end_matches('0').trim_end_matches('.').to_string() } else { s };
    if !(-4..3).contains(&e) {
        format!("{}e{}{:02}", trim(mantissa.to_string()), if e < 0 { '-' } else { '+' }, e.abs())
    } else {
        trim(format!("{x:.*}", (2 - e).max(0) as usize))
    }
}

/// Como `_fmt_num_label`: 1.2M, 3.4K o el número con un decimal.
pub fn label(v: f64) -> String {
    let a = v.abs();
    if a >= 1e6 {
        format!("{:.1}M", v / 1e6)
    } else if a >= 1e3 {
        format!("{:.1}K", v / 1e3)
    } else if a >= 1.0 {
        let s = format!("{v:.1}");
        let (int, dec) = s.split_once('.').unwrap();
        format!("{}.{dec}", thousands(int))
    } else {
        general3(v)
    }
}

/// `f"{n:,}"` de un entero.
pub fn count_label(n: usize) -> String {
    thousands(&n.to_string())
}

/// `format_number` del motor de la web para un decimal: 1.2M, 3.4K o con dos decimales.
pub fn format_number(n: f64) -> String {
    if n.abs() >= 1e6 {
        format!("{:.1}M", n / 1e6)
    } else if n.abs() >= 1e3 {
        format!("{:.1}K", n / 1e3)
    } else {
        let s = format!("{n:.2}");
        let (int, dec) = s.split_once('.').unwrap();
        format!("{}.{dec}", thousands(int))
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn el_tope_es_el_de_python_tambien_con_nan() {
        assert_eq!(super::py_clamp(1.7, -1.0, 1.0), 1.0);
        assert_eq!(super::py_clamp(-3.0, -1.0, 1.0), -1.0);
        assert_eq!(super::py_clamp(0.25, -1.0, 1.0), 0.25);
        assert_eq!(super::py_clamp(f64::NAN, -1.0, 1.0), 1.0, "max(-1, min(1, nan)) da 1 en Python");
    }

    use super::{format_number, general3, label};

    #[test]
    fn los_numeros_se_escriben_como_en_python() {
        assert_eq!(label(1_234_567.0), "1.2M");
        assert_eq!(label(1234.0), "1.2K");
        assert_eq!(label(999.95), "1,000.0");
        assert_eq!(label(12.34), "12.3");
        assert_eq!(general3(0.000_123_45), "0.000123");
        assert_eq!(general3(0.5), "0.5");
        assert_eq!(general3(0.000_01), "1e-05");
        assert_eq!(format_number(512.345), "512.35");
        assert_eq!(format_number(-2_500_000.0), "-2.5M");
    }
}
