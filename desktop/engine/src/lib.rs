//! Motor de análisis de MIO para la app de escritorio.
//!
//! Cada pieza reproduce la del motor de Python (`dashboard-ia/backend`), que es la referencia: las
//! pruebas de `tests/` comparan los números de las dos con las mismas series.

pub mod anomalies;
pub mod changes;
pub mod charts;
pub mod clean;
pub mod combine;
pub mod dates;
pub mod dict;
pub mod drivers;
pub mod export;
pub mod formats;
pub mod forecast;
pub mod forecaster;
pub mod lgbm;
pub mod profile;
pub mod progress;
pub mod prophet;
pub mod pynum;
pub mod reader;
pub mod segments;
pub mod sheet;
