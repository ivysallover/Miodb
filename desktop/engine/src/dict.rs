//! Columna guardada como diccionario: cada valor distinto una sola vez y, por fila, el número del
//! valor (lo mismo que `category` en pandas o `dictionary` en Arrow). Una columna de un millón de
//! filas con seis regiones guarda seis textos, y lo que se hace valor por valor (recortar, leer
//! fechas, pasar texto a número) se hace una vez por valor distinto, no una vez por fila.

use rustc_hash::FxHashMap;
use std::hash::Hash;

#[derive(Debug, Clone, PartialEq)]
pub struct Dict<T> {
    values: Vec<T>,
    codes: Vec<u32>,
}

impl<T> Default for Dict<T> {
    fn default() -> Self {
        Dict { values: Vec::new(), codes: Vec::new() }
    }
}

impl<T: Clone> Dict<T> {
    /// Arma el diccionario con los valores de cada fila; `key` dice cuándo dos valores son el mismo.
    pub fn build<K: Hash + Eq>(rows: impl IntoIterator<Item = T>, key: impl Fn(&T) -> K) -> Self {
        let mut seen: FxHashMap<K, u32> = FxHashMap::default();
        let mut d = Dict::default();
        for v in rows {
            let code = *seen.entry(key(&v)).or_insert_with(|| {
                d.values.push(v);
                (d.values.len() - 1) as u32
            });
            d.codes.push(code);
        }
        d
    }

    pub fn len(&self) -> usize {
        self.codes.len()
    }

    pub fn is_empty(&self) -> bool {
        self.codes.is_empty()
    }

    pub fn get(&self, row: usize) -> &T {
        &self.values[self.codes[row] as usize]
    }

    /// Los valores fila por fila.
    pub fn iter(&self) -> impl Iterator<Item = &T> + '_ {
        self.codes.iter().map(|&c| &self.values[c as usize])
    }

    /// El número del valor de cada fila (índice en `values()`).
    pub fn codes(&self) -> &[u32] {
        &self.codes
    }

    /// Los valores distintos (cada uno una vez).
    pub fn values(&self) -> &[T] {
        &self.values
    }

    /// Cuántas filas tiene cada valor distinto, en el orden de `values()`.
    pub fn counts(&self) -> Vec<usize> {
        let mut n = vec![0; self.values.len()];
        for &c in &self.codes {
            n[c as usize] += 1;
        }
        n
    }

    /// `f` sobre cada valor distinto, devuelto fila por fila.
    pub fn per_row<U: Clone>(&self, mut f: impl FnMut(&T) -> U) -> Vec<U> {
        let mapped: Vec<U> = self.values.iter().map(&mut f).collect();
        self.codes.iter().map(|&c| mapped[c as usize].clone()).collect()
    }

    /// Otro diccionario con `f` aplicado a cada valor distinto; los que quedan iguales se juntan.
    pub fn map<U: Clone, K: Hash + Eq>(&self, f: impl FnMut(&T) -> U, key: impl Fn(&U) -> K) -> Dict<U> {
        let mapped = Dict::build(self.values.iter().map(f), key);
        Dict { codes: self.codes.iter().map(|&c| mapped.codes[c as usize]).collect(), values: mapped.values }
    }

    /// Otro tipo para cada valor, sin juntar nada: `f` no puede volver iguales dos valores distintos.
    pub fn convert<U>(self, f: impl FnMut(T) -> U) -> Dict<U> {
        Dict { values: self.values.into_iter().map(f).collect(), codes: self.codes }
    }

    /// Como `map`, en el lugar; si `f` no cambia ningún valor, la columna queda como está (sin copiarla).
    pub fn update<K: Hash + Eq>(&mut self, mut f: impl FnMut(&T) -> T, key: impl Fn(&T) -> K)
    where
        T: PartialEq,
    {
        if self.values.iter().any(|v| f(v) != *v) {
            *self = self.map(&mut f, key);
        }
    }

    /// Solo las filas `rows`, sin los valores que dejan de usarse.
    pub fn keep(&self, rows: &[usize]) -> Dict<T> {
        let mut new_code = vec![u32::MAX; self.values.len()];
        let mut d = Dict::default();
        for &i in rows {
            let old = self.codes[i] as usize;
            if new_code[old] == u32::MAX {
                new_code[old] = d.values.len() as u32;
                d.values.push(self.values[old].clone());
            }
            d.codes.push(new_code[old]);
        }
        d
    }
}

/// Arma una columna de texto fila por fila (al leer): un texto repetido no se vuelve a copiar.
#[derive(Default)]
pub struct TextBuilder {
    seen: FxHashMap<Box<str>, u32>,
    null: Option<u32>,
    dict: Dict<Option<String>>,
}

impl TextBuilder {
    pub fn push(&mut self, v: Option<&str>) {
        let values = &mut self.dict.values;
        let mut add = |v: Option<String>| {
            values.push(v);
            (values.len() - 1) as u32
        };
        let code = match v {
            None => *self.null.get_or_insert_with(|| add(None)),
            Some(s) => match self.seen.get(s) {
                Some(&c) => c,
                None => {
                    let c = add(Some(s.to_string()));
                    self.seen.insert(s.into(), c);
                    c
                }
            },
        };
        self.dict.codes.push(code);
    }

    pub fn finish(self) -> Dict<Option<String>> {
        self.dict
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn guarda_cada_valor_una_vez_y_junta_los_que_quedan_iguales() {
        let d = Dict::build([" Ana", "Beto", " Ana", "Ana"].map(String::from), |s| s.clone());
        assert_eq!(d.values().len(), 3);
        assert_eq!(d.counts(), vec![2, 1, 1]);
        let trimmed = d.map(|s| s.trim().to_string(), |s| s.clone());
        assert_eq!(trimmed.values(), ["Ana", "Beto"]);
        assert_eq!(trimmed.iter().cloned().collect::<Vec<_>>(), ["Ana", "Beto", "Ana", "Ana"]);
        assert_eq!(trimmed.keep(&[1, 3]).values(), ["Beto", "Ana"]);
        assert_eq!(d.per_row(|s| s.len()), vec![4, 4, 4, 3]);
    }
}
