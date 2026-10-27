//! El avance de abrir y analizar una planilla, para que la ventana muestre por dónde va: la etapa y,
//! si se sabe, cuánto de esa etapa (0 a 1). Sin quien escuche (`Progress::NONE`) no hace nada. Cada
//! aviso es también un lugar donde cortar si la persona canceló (`Progress::cancellable`).

/// Las etapas, en el orden en que pasan.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Stage {
    Reading,
    Cleaning,
    Charts,
    Drivers,
    Anomalies,
    Groups,
    Forecast,
}

impl Stage {
    /// El nombre que recibe la pantalla (`src/components/escritorio/desktop.ts`).
    pub fn id(self) -> &'static str {
        match self {
            Stage::Reading => "leyendo",
            Stage::Cleaning => "limpiando",
            Stage::Charts => "graficos",
            Stage::Drivers => "que_lo_mueve",
            Stage::Anomalies => "valores_raros",
            Stage::Groups => "grupos",
            Stage::Forecast => "pronostico",
        }
    }
}

/// Lo que se devuelve cuando la persona cancela.
pub const CANCELLED: &str = "Cancelaste el análisis.";

/// A quién avisar del avance y, si hay, la señal de que la persona canceló.
pub struct Progress<'a> {
    listener: Option<&'a (dyn Fn(Stage, Option<f64>) + Sync)>,
    stopped: Option<&'a (dyn Fn() -> bool + Sync)>,
}

impl Progress<'static> {
    pub const NONE: Progress<'static> = Progress { listener: None, stopped: None };
}

impl<'a> Progress<'a> {
    pub fn new(listener: &'a (dyn Fn(Stage, Option<f64>) + Sync)) -> Self {
        Progress { listener: Some(listener), stopped: None }
    }

    /// Avisa el avance y corta cuando `stopped` dice que la persona canceló.
    pub fn cancellable(listener: &'a (dyn Fn(Stage, Option<f64>) + Sync), stopped: &'a (dyn Fn() -> bool + Sync)) -> Self {
        Progress { listener: Some(listener), stopped: Some(stopped) }
    }

    /// Avisa por dónde va; si la persona canceló, devuelve el error para cortar con `?`.
    pub fn report(&self, stage: Stage, done: Option<f64>) -> Result<(), String> {
        if self.stopped.is_some_and(|stopped| stopped()) {
            return Err(CANCELLED.into());
        }
        if let Some(f) = self.listener {
            f(stage, done.map(|d| d.clamp(0.0, 1.0)));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn corta_cuando_se_cancela() {
        use std::sync::atomic::{AtomicBool, Ordering};
        let stop = AtomicBool::new(false);
        let seen = std::sync::Mutex::new(Vec::new());
        let tell = |s: Stage, _: Option<f64>| seen.lock().unwrap().push(s);
        let stopped = || stop.load(Ordering::Relaxed);
        let p = Progress::cancellable(&tell, &stopped);
        assert_eq!(p.report(Stage::Reading, None), Ok(()));
        stop.store(true, Ordering::Relaxed);
        assert_eq!(p.report(Stage::Cleaning, None), Err(CANCELLED.into()));
        assert_eq!(*seen.lock().unwrap(), [Stage::Reading], "lo cancelado ya no se avisa");
    }
}
