//! Ayudas que comparten las pruebas.

/// Nanosegundos desde 1970 como `Timestamp.isoformat()` de pandas (AAAA-MM-DDTHH:MM:SS).
pub fn iso(ns: i64) -> String {
    let secs = ns.div_euclid(1_000_000_000);
    let (days, rem) = (secs.div_euclid(86_400), secs.rem_euclid(86_400));
    let (y, m, d) = mio_engine::clean::civil_from_days(days);
    format!("{y:04}-{m:02}-{d:02}T{:02}:{:02}:{:02}", rem / 3600, rem % 3600 / 60, rem % 60)
}
