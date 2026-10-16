//! Motor de análisis de MIO para la app de escritorio.
//!
//! Cada pieza reproduce la del motor de Python (`dashboard-ia/backend`), que es la referencia: las
//! pruebas de `tests/` comparan los números de las dos con las mismas series.

pub mod forecast;
pub mod lgbm;
pub mod prophet;
