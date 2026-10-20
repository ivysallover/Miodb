//! El avance de abrir y analizar una planilla, para que la ventana muestre por dónde va: la etapa y,
//! si se sabe, cuánto de esa etapa (0 a 1). Sin quien escuche (`Progress::NONE`) no hace nada.

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

/// A quién avisar del avance.
pub struct Progress<'a>(Option<&'a (dyn Fn(Stage, Option<f64>) + Sync)>);

impl Progress<'static> {
    pub const NONE: Progress<'static> = Progress(None);
}

impl<'a> Progress<'a> {
    pub fn new(listener: &'a (dyn Fn(Stage, Option<f64>) + Sync)) -> Self {
        Progress(Some(listener))
    }

    pub fn report(&self, stage: Stage, done: Option<f64>) {
        if let Some(f) = self.0 {
            f(stage, done.map(|d| d.clamp(0.0, 1.0)));
        }
    }
}
