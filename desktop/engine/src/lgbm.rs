//! LightGBM por su interfaz en C (compilado dentro del programa).
//!
//! Se usa la interfaz en C directamente y no el envoltorio de `lightgbm3` porque LightGBM decide cómo
//! agrupar los datos al crear el conjunto de entrenamiento, y para eso necesita los mismos parámetros
//! que el modelo (por ejemplo `min_data_in_leaf`). Python se los pasa; el envoltorio, no.

use lightgbm3_sys as ffi;
use std::ffi::{CStr, CString};
use std::os::raw::c_void;

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
    /// Predicción para filas (por fila).
    pub fn predict(&self, x: &[f64]) -> Result<Vec<f64>, String> {
        let rows = x.len() / self.n_features as usize;
        let mut out = vec![0.0f64; rows];
        let mut len: i64 = 0;
        let p = CString::new("num_threads=1").unwrap();
        unsafe {
            check(ffi::LGBM_BoosterPredictForMat(
                self.handle, x.as_ptr() as *const c_void, ffi::C_API_DTYPE_FLOAT64 as i32, rows as i32, self.n_features,
                1, ffi::C_API_PREDICT_NORMAL as i32, 0, -1, p.as_ptr(), &mut len, out.as_mut_ptr(),
            ))?;
        }
        out.truncate(len as usize);
        Ok(out)
    }
}
