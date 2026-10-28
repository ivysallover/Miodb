//! LightGBM por su interfaz en C (compilado dentro del programa).
//!
//! Se usa la interfaz en C directamente y no el envoltorio de `lightgbm3` porque LightGBM decide cómo
//! agrupar los datos al crear el conjunto de entrenamiento, y para eso necesita los mismos parámetros
//! que el modelo (por ejemplo `min_data_in_leaf`). Python se los pasa; el envoltorio, no.

use lightgbm3_sys as ffi;
use std::ffi::{CStr, CString};
use std::os::raw::c_void;

/// LightGBM trae funciones para leer datos de Apache Arrow, que MIO no usa. En Windows su biblioteca
/// estática deja afuera la pieza de nanoarrow que esas funciones llaman, y el programa no se puede
/// juntar (`LNK2019: ArrowSchemaViewInit`); en Mac y Linux el armado descarta lo que nadie usa. Este
/// reemplazo contesta "no se puede" (EINVAL) y nunca se llama: MIO le pasa a LightGBM sus números, no
/// datos de Arrow.
#[cfg(windows)]
#[no_mangle]
pub extern "C" fn ArrowSchemaViewInit(_view: *mut c_void, _schema: *const c_void, _error: *mut c_void) -> i32 {
    22
}

fn check(code: i32) -> Result<(), String> {
    if code == 0 {
        return Ok(());
    }
    let msg = unsafe { CStr::from_ptr(ffi::LGBM_GetLastError()) };
    Err(format!("LightGBM: {}", msg.to_string_lossy()))
}

/// Un modelo entrenado. Se libera solo.
pub struct Model {
    handle: ffi::BoosterHandle,
    n_features: i32,
}

impl Drop for Model {
    fn drop(&mut self) {
        unsafe { ffi::LGBM_BoosterFree(self.handle) };
    }
}

/// Entrena con `x` (filas, por fila), `y` y los parámetros en formato `clave=valor` separados por
/// espacios. Los mismos parámetros se usan para armar los datos y para el modelo, como en Python.
pub fn train(x: &[f64], n_rows: usize, n_features: usize, y: &[f32], params: &str, rounds: usize) -> Result<Model, String> {
    if x.len() != n_rows * n_features || y.len() != n_rows {
        return Err("tamaños de datos inconsistentes".into());
    }
    let p = CString::new(params).map_err(|e| e.to_string())?;
    let label = CString::new("label").unwrap();
    let mut data: ffi::DatasetHandle = std::ptr::null_mut();
    unsafe {
        check(ffi::LGBM_DatasetCreateFromMat(
            x.as_ptr() as *const c_void, ffi::C_API_DTYPE_FLOAT64 as i32, n_rows as i32, n_features as i32, 1,
            p.as_ptr(), std::ptr::null_mut(), &mut data,
        ))?;
        let result = (|| {
            check(ffi::LGBM_DatasetSetField(data, label.as_ptr(), y.as_ptr() as *const c_void, n_rows as i32, ffi::C_API_DTYPE_FLOAT32 as i32))?;
            let mut booster: ffi::BoosterHandle = std::ptr::null_mut();
            check(ffi::LGBM_BoosterCreate(data, p.as_ptr(), &mut booster))?;
            let model = Model { handle: booster, n_features: n_features as i32 };
            let mut finished = 0;
            for _ in 0..rounds {
                check(ffi::LGBM_BoosterUpdateOneIter(model.handle, &mut finished))?;
                if finished != 0 {
                    break;
                }
            }
            Ok(model)
        })();
        ffi::LGBM_DatasetFree(data);
        result
    }
}

impl Model {
    /// `kind` de LightGBM para las filas `x` (por fila); `per_row` valores por fila.
    fn predict_as(&self, x: &[f64], kind: u32, per_row: usize) -> Result<Vec<f64>, String> {
        let rows = x.len() / self.n_features as usize;
        let mut out = vec![0.0f64; rows * per_row];
        let mut len: i64 = 0;
        let p = CString::new("num_threads=1").unwrap();
        unsafe {
            check(ffi::LGBM_BoosterPredictForMat(
                self.handle, x.as_ptr() as *const c_void, ffi::C_API_DTYPE_FLOAT64 as i32, rows as i32, self.n_features,
                1, kind as i32, 0, -1, p.as_ptr(), &mut len, out.as_mut_ptr(),
            ))?;
        }
        out.truncate(len as usize);
        Ok(out)
    }

    /// Predicción para filas (por fila).
    pub fn predict(&self, x: &[f64]) -> Result<Vec<f64>, String> {
        self.predict_as(x, ffi::C_API_PREDICT_NORMAL, 1)
    }

    /// Valores SHAP de cada fila (`pred_contrib=True`, TreeSHAP de LightGBM): una columna por
    /// variable y, al final, el valor base del modelo.
    pub fn contributions(&self, x: &[f64]) -> Result<Vec<f64>, String> {
        self.predict_as(x, ffi::C_API_PREDICT_CONTRIB, self.n_features as usize + 1)
    }

    /// Cuántas veces usa el modelo cada variable para dividir (`feature_importances_`).
    pub fn split_importance(&self) -> Result<Vec<f64>, String> {
        let mut out = vec![0.0f64; self.n_features as usize];
        unsafe { check(ffi::LGBM_BoosterFeatureImportance(self.handle, 0, ffi::C_API_FEATURE_IMPORTANCE_SPLIT as i32, out.as_mut_ptr()))? };
        Ok(out)
    }
}
