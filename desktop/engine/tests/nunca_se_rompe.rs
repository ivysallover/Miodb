//! Planillas armadas al azar con de todo (textos, números con cualquier formato, fechas imposibles,
//! comillas sin cerrar, separadores mezclados, bytes que no son texto, filas de cualquier largo): el motor
//! puede decir que no entiende un archivo, pero nunca romperse. Siempre las mismas (semilla fija).

use mio_engine::progress::Progress;
use mio_engine::sheet::Sheet;

/// Números al azar sin depender de nada: siempre la misma secuencia.
struct Dice(u64);
impl Dice {
    fn next(&mut self) -> u64 {
        self.0 = self.0.wrapping_mul(6_364_136_223_846_793_005).wrapping_add(1_442_695_040_888_963_407);
        self.0 >> 33
    }
    fn pick<'a>(&mut self, options: &[&'a str]) -> &'a str {
        options[self.next() as usize % options.len()]
    }
    fn below(&mut self, n: u64) -> u64 {
        self.next() % n.max(1)
    }
}

const CELLS: [&str; 44] = [
    "", " ", "NA", "s/d", "-", "#N/A", "null", "0", "00123", "-1", "1.234,56", "1,234.56", "$ 1.234,56", "(500)", "500-", "ARS 12",
    "1e308", "-1e308", "inf", "NaN", "9999999999999999999999", "0,0001", "12 kg", "50 %", "%", "$", "TOTAL", "Subtotal",
    "31/02/2024", "2024-13-45", "01/01/1900", "1/1/2099 25:61", "15-ene-2024", "enero", "45123", "1731505641",
    "Sí", "X", "true", "Norte", "ñandú", "MuÃ±oz", "\"comillas\"", "a;b,c|d\te",
];

fn random_sheet(dice: &mut Dice) -> Vec<u8> {
    let sep = dice.pick(&[";", ",", "\t", "|"]);
    let cols = 1 + dice.below(12) as usize;
    let rows = dice.below(400) as usize;
    let mut text = String::new();
    if dice.below(5) == 0 {
        text.push_str("Reporte de ventas\n\n");
    }
    let header: Vec<String> = (0..cols).map(|j| if dice.below(8) == 0 { String::new() } else { format!("{}{j}", dice.pick(&["fecha", "monto", "zona", "codigo", "cant", "precio", "id", "lat"])) }).collect();
    text.push_str(&header.join(sep));
    text.push('\n');
    for _ in 0..rows {
        // Filas de cualquier largo, con columnas que a veces siguen un tipo y a veces cualquier cosa.
        let width = if dice.below(10) == 0 { dice.below(cols as u64 + 3) as usize } else { cols };
        let line: Vec<String> = (0..width).map(|j| match (j + dice.below(3) as usize) % 4 {
            0 => format!("{}", dice.below(100_000) as f64 / 100.0),
            1 => format!("{:02}/{:02}/20{:02}", 1 + dice.below(28), 1 + dice.below(12), 20 + dice.below(6)),
            _ => dice.pick(&CELLS).to_string(),
        }).collect();
        text.push_str(&line.join(sep));
        text.push('\n');
    }
    if dice.below(6) == 0 {
        text.push_str("\"comilla sin cerrar;");
    }
    let mut bytes = text.into_bytes();
    if dice.below(8) == 0 {
        // Bytes que no son texto en el medio.
        let at = dice.below(bytes.len() as u64) as usize;
        bytes.splice(at..at, [0xFF, 0x00, 0xC3, 0x28, 0x9F]);
    }
    bytes
}

#[test]
fn ninguna_planilla_rompe_el_motor() {
    let dir = std::env::temp_dir().join("mio_nunca_se_rompe");
    std::fs::create_dir_all(&dir).unwrap();
    // Otra semilla para buscar más casos: `MIO_AZAR=<número> cargo test --test nunca_se_rompe`.
    let seed = std::env::var("MIO_AZAR").ok().and_then(|s| s.parse().ok()).unwrap_or(20_261_103);
    let mut dice = Dice(seed);
    let (mut opened, mut refused) = (0, 0);
    for k in 0..300 {
        let path = dir.join(format!("azar_{k}.csv"));
        std::fs::write(&path, random_sheet(&mut dice)).unwrap();
        let outcome = std::panic::catch_unwind(|| {
            let Ok(s) = Sheet::open(&path, None, &Progress::NONE) else { return false };
            let a = s.analysis(None, &Progress::NONE).expect("si se abre, se analiza");
            let _ = (s.overview(), s.fields(), s.problems().len(), a);
            true
        });
        match outcome {
            Ok(true) => opened += 1,
            Ok(false) => refused += 1,
            Err(_) => panic!("la planilla {} rompió el motor", path.display()),
        }
    }
    assert!(opened > 200, "se abrieron {opened} y se rechazaron {refused}");
}
