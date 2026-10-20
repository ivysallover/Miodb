//! Fechas como días contados desde 1970-01-01 (o nanosegundos, como guarda pandas las fechas): pasar
//! de y a año-mes-día, el día de la semana, los períodos de pandas (la semana que cierra el domingo,
//! el mes) y cómo se escriben. Las usan la limpieza, los gráficos, los valores raros y el pronóstico.

/// Nanosegundos en un día.
pub const DAY_NS: i64 = 86_400_000_000_000;

/// Año, mes y día de un día contado desde 1970-01-01 (algoritmo de Howard Hinnant).
pub fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    (yoe + era * 400 + i64::from(m <= 2), m, d)
}

/// El día (desde 1970-01-01) de un año, mes y día (la inversa de `civil_from_days`).
pub fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = if m > 2 { m - 3 } else { m + 9 };
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

pub fn days_in_month(y: i64, m: i64) -> i64 {
    match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        _ if (y % 4 == 0 && y % 100 != 0) || y % 400 == 0 => 29,
        _ => 28,
    }
}

/// El domingo que cierra la semana de `day` (la etiqueta de `pd.Grouper(freq="W")`); 1970-01-01 fue jueves.
pub fn week_end(day: i64) -> i64 {
    day + (6 - (day + 3).rem_euclid(7))
}

/// El primer día del mes de `day` (la etiqueta de `freq="MS"`).
pub fn month_start(day: i64) -> i64 {
    let (y, m, _) = civil_from_days(day);
    days_from_civil(y, m, 1)
}

/// El primer día del mes siguiente al de `day`.
pub fn next_month_start(day: i64) -> i64 {
    let (y, m, _) = civil_from_days(day);
    if m == 12 { days_from_civil(y + 1, 1, 1) } else { days_from_civil(y, m + 1, 1) }
}

/// "AAAA-MM-DD".
pub fn ymd(day: i64) -> String {
    let (y, m, d) = civil_from_days(day);
    format!("{y:04}-{m:02}-{d:02}")
}

/// "AAAA-MM-DD HH:MM:SS" de nanosegundos desde 1970 (`str(Timestamp)` de pandas).
pub fn timestamp(ns: i64) -> String {
    let s = ns.rem_euclid(DAY_NS) / 1_000_000_000;
    format!("{} {:02}:{:02}:{:02}", ymd(ns.div_euclid(DAY_NS)), s / 3600, s % 3600 / 60, s % 60)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn las_fechas_van_y_vuelven() {
        for day in [-800_000, -1, 0, 59, 19_723, 2_932_896] {
            let (y, m, d) = civil_from_days(day);
            assert_eq!(days_from_civil(y, m, d), day);
        }
        assert_eq!(ymd(19_723), "2024-01-01");
        assert_eq!(week_end(19_723), 19_729); // lunes 1/1/2024 -> domingo 7/1
        assert_eq!(month_start(19_753), 19_723);
        assert_eq!(next_month_start(19_723 + 340), 19_723 + 366); // 6/12/2024 -> 1/1/2025
        assert_eq!(timestamp(19_723 * DAY_NS + 37_800_000_000_000), "2024-01-01 10:30:00");
    }
}
