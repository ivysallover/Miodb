//! El ejemplo que trae la app ("Probar con un ejemplo"): las planillas de `ejemplos/` (armadas por
//! `desktop/ejemplos/armar_ejemplo.py`) van adentro del programa y se escriben en la carpeta de datos
//! de la app la primera vez que se piden, para abrirlas como cualquier planilla.

use std::path::Path;

/// Las planillas del ejemplo: dos semestres de ventas (se apilan), los clientes y los productos (se cruzan).
const FILES: [(&str, &[u8]); 4] = [
    ("ventas_2025_1er_semestre.csv", include_bytes!("../ejemplos/ventas_2025_1er_semestre.csv")),
    ("ventas_2025_2do_semestre.csv", include_bytes!("../ejemplos/ventas_2025_2do_semestre.csv")),
    ("clientes.csv", include_bytes!("../ejemplos/clientes.csv")),
    ("productos.csv", include_bytes!("../ejemplos/productos.csv")),
];

/// Deja las planillas del ejemplo en `dir` (si ya están iguales, no las toca) y devuelve sus rutas.
pub fn write_to(dir: &Path) -> std::io::Result<Vec<String>> {
    std::fs::create_dir_all(dir)?;
    FILES
        .iter()
        .map(|(name, bytes)| {
            let path = dir.join(name);
            if std::fs::read(&path).ok().as_deref() != Some(*bytes) {
                std::fs::write(&path, bytes)?;
            }
            Ok(path.to_string_lossy().into_owned())
        })
        .collect()
}

#[cfg(test)]
mod tests {
    #[test]
    fn deja_las_cuatro_planillas_y_no_las_reescribe() {
        let dir = std::env::temp_dir().join("mio_ejemplo_test");
        let _ = std::fs::remove_dir_all(&dir);
        let paths = super::write_to(&dir).unwrap();
        assert_eq!(paths.len(), 4);
        let before = std::fs::metadata(&paths[0]).unwrap().modified().unwrap();
        super::write_to(&dir).unwrap();
        assert_eq!(std::fs::metadata(&paths[0]).unwrap().modified().unwrap(), before, "si están iguales no se tocan (el proyecto sigue valiendo)");
    }
}
