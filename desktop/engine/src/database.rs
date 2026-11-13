//! Leer de una base de datos: PostgreSQL o MySQL / MariaDB (`sqlx`), siempre solo lectura.
//!
//! - **Solo lectura de verdad.** Todo corre adentro de una transacción `READ ONLY`: la base misma
//!   rechaza cualquier escritura, aunque la consulta lo intente. Antes, una consulta propia tiene que
//!   ser una sola y empezar con `SELECT` o `WITH`, para decirlo en palabras y no con el error de la base.
//! - **Nada queda en la compu.** Se consulta cada vez; lo leído vive en memoria mientras se analiza.
//! - **Bases grandes.** Se traen hasta `limit` filas (se pide una más para saber si se cortó) y se avisa
//!   si se cortó. Una tabla dice antes cuántas filas tiene (aproximado, lo que sabe la base sin contarlas).
//!   Se lee de a partes: cancelar corta en la próxima tanda, y la consulta tiene un tiempo máximo.
//! - **Cifrado.** Si el servidor lo ofrece, la conexión va cifrada (TLS con los certificados del sistema);
//!   probar la conexión dice si lo está.
//!
//! Termina en la misma `reader::Table` que los archivos (`formats::from_columns`, con la misma regla de
//! tipos), así la limpieza, el perfil y los modelos no cambian.

use crate::dates::DAY_NS;
use crate::formats::{from_columns, Cell};
use crate::progress::{Progress, Stage};
use crate::reader::Table;
use futures_util::{Stream, TryStreamExt};
use rust_decimal::prelude::ToPrimitive;
use serde_json::{json, Value};
use sqlx::mysql::{MySqlConnectOptions, MySqlConnection, MySqlDatabaseError, MySqlRow, MySqlSslMode};
use sqlx::postgres::{PgConnectOptions, PgConnection, PgRow, PgSslMode};
use sqlx::types::chrono::{DateTime, Local, NaiveDate, NaiveDateTime, Utc};
use sqlx::types::Decimal;
use sqlx::{AssertSqlSafe, Column, Connection, Row, TypeInfo, ValueRef};
use std::time::Duration;

/// Cuántas filas se traen si no se dice otra cosa.
pub const DEFAULT_LIMIT: usize = 1_000_000;
const CONNECT_TIMEOUT: Duration = Duration::from_secs(15);
/// Cuánto puede tardar la consulta en la base; después la base la corta.
const QUERY_TIMEOUT_S: u64 = 15 * 60;
/// Cada cuántas filas se avisa el avance (y se mira si se canceló).
const EVERY: usize = 20_000;

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Engine {
    Postgres,
    MySql,
}

impl Engine {
    pub fn from_id(id: &str) -> Result<Engine, String> {
        match id {
            "postgres" => Ok(Engine::Postgres),
            "mysql" => Ok(Engine::MySql),
            _ => Err(format!("No conozco el motor «{id}»: puede ser PostgreSQL o MySQL.")),
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            Engine::Postgres => "PostgreSQL",
            Engine::MySql => "MySQL",
        }
    }

    /// Un nombre de tabla o esquema entre comillas, como lo pide cada motor.
    fn quote(self, ident: &str) -> String {
        match self {
            Engine::Postgres => format!("\"{}\"", ident.replace('"', "\"\"")),
            Engine::MySql => format!("`{}`", ident.replace('`', "``")),
        }
    }
}

/// Cómo llegar a la base. La contraseña la pone quien llama (la app la guarda en el llavero del sistema).
#[derive(Clone, Debug)]
pub struct Server {
    pub engine: Engine,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub user: String,
    pub password: String,
}

impl Server {
    /// Desde lo que manda la pantalla: `{motor, servidor, puerto, base, usuario}`.
    pub fn from_json(v: &Value, password: String) -> Result<Server, String> {
        let text = |k: &str| v[k].as_str().map(str::trim).filter(|s| !s.is_empty()).map(str::to_string);
        let engine = Engine::from_id(&text("motor").unwrap_or_default())?;
        let port = match &v["puerto"] {
            Value::Null => None,
            p => Some(p.as_u64().and_then(|p| u16::try_from(p).ok()).filter(|&p| p > 0).ok_or("El puerto tiene que ser un número entre 1 y 65535.")?),
        };
        Ok(Server {
            engine,
            host: text("servidor").ok_or("Falta el servidor (por ejemplo, localhost o 192.168.0.10).")?,
            port: port.unwrap_or(match engine {
                Engine::Postgres => 5432,
                Engine::MySql => 3306,
            }),
            database: text("base").ok_or("Falta el nombre de la base.")?,
            user: text("usuario").ok_or("Falta el usuario.")?,
            password,
        })
    }
}

/// Qué se trae: una tabla (o vista) entera, o una consulta propia.
#[derive(Clone, Debug, PartialEq)]
pub enum Pick {
    Table { schema: Option<String>, name: String },
    Query(String),
}

impl Pick {
    /// `{tabla, esquema?}` o `{consulta}`.
    pub fn from_json(v: &Value) -> Result<Pick, String> {
        if let Some(q) = v["consulta"].as_str() {
            return Ok(Pick::Query(q.to_string()));
        }
        let name = v["tabla"].as_str().filter(|s| !s.is_empty()).ok_or("Elegí una tabla o escribí una consulta.")?;
        Ok(Pick::Table { schema: v["esquema"].as_str().map(str::to_string), name: name.to_string() })
    }

    pub fn to_json(&self) -> Value {
        match self {
            Pick::Table { schema, name } => json!({ "tabla": name, "esquema": schema }),
            Pick::Query(q) => json!({ "consulta": q }),
        }
    }

    /// Cómo se nombra en pantalla: la tabla, o «consulta».
    pub fn label(&self) -> String {
        match self {
            Pick::Table { name, .. } => name.clone(),
            Pick::Query(_) => "consulta".into(),
        }
    }
}

/// Una consulta propia: una sola y que lea. Igual corre en una transacción de solo lectura; esto es para
/// decirlo antes y en palabras.
fn own_query(q: &str) -> Result<&str, String> {
    let q = q.trim().trim_end_matches(';').trim_end();
    // Los comentarios del principio no cuentan para ver con qué empieza.
    let mut head = q;
    loop {
        head = head.trim_start();
        if let Some(rest) = head.strip_prefix("--") {
            head = rest.split_once('\n').map_or("", |(_, r)| r);
        } else if let Some(rest) = head.strip_prefix("/*") {
            head = rest.split_once("*/").map_or("", |(_, r)| r);
        } else {
            break;
        }
    }
    let first = head.split(|c: char| !c.is_ascii_alphabetic()).next().unwrap_or("").to_ascii_lowercase();
    if first != "select" && first != "with" {
        return Err("La consulta tiene que empezar con SELECT (o WITH): MIO solo lee.".into());
    }
    if q.contains(';') {
        return Err("Escribí una sola consulta, sin «;» en el medio.".into());
    }
    Ok(q)
}

/// La consulta que se manda: la tabla entera o la propia, con una fila más que el tope (para saber si se
/// cortó). La propia va entre saltos de línea, así un comentario `--` al final no se come el paréntesis.
fn select(engine: Engine, pick: &Pick, limit: usize) -> Result<String, String> {
    let from = match pick {
        Pick::Table { schema: Some(s), name } => format!("{}.{}", engine.quote(s), engine.quote(name)),
        Pick::Table { schema: None, name } => engine.quote(name),
        Pick::Query(q) => format!("(\n{}\n) AS mio_consulta", own_query(q)?),
    };
    Ok(format!("SELECT * FROM {from} LIMIT {}", limit + 1))
}

/// Un error de la base, en palabras.
fn message(e: &sqlx::Error) -> String {
    match e {
        sqlx::Error::Database(d) => {
            // MySQL dice el error con su número; PostgreSQL, con su código SQLSTATE.
            let code = d.try_downcast_ref::<MySqlDatabaseError>().map_or_else(|| d.code().map(|c| c.into_owned()).unwrap_or_default(), |m| m.number().to_string());
            match code.as_str() {
                "28P01" | "28000" | "1045" => "El usuario o la contraseña no coinciden.".into(),
                "3D000" | "1049" => "Esa base no existe en el servidor: revisá el nombre.".into(),
                "42501" | "1142" | "1044" => "El usuario no tiene permiso para leer eso.".into(),
                "25006" | "1792" => "La consulta intenta modificar la base: MIO solo lee.".into(),
                "42P01" | "1146" => "No existe esa tabla (o vista).".into(),
                "42601" | "1064" => format!("La consulta tiene un error: {}", d.message()),
                "57014" | "3024" | "1969" => "La consulta tardó más de 15 minutos y la base la cortó. Probá traer menos filas o filtrar en la consulta.".into(),
                _ => format!("La base respondió con un error: {}", d.message()),
            }
        }
        sqlx::Error::Io(_) => "No pude llegar al servidor: revisá el servidor y el puerto, y que tu compu pueda llegar a él (red, VPN, firewall).".into(),
        sqlx::Error::Tls(e) => format!("Falló la conexión cifrada: {e}"),
        e => format!("No pude leer la base: {e}"),
    }
}

/// Una conexión abierta, de cualquiera de los dos motores.
enum Conn {
    Pg(PgConnection),
    My(MySqlConnection),
}

async fn connect(s: &Server) -> Result<Conn, String> {
    let open = async {
        match s.engine {
            Engine::Postgres => {
                let o = PgConnectOptions::new().host(&s.host).port(s.port).username(&s.user).password(&s.password).database(&s.database).ssl_mode(PgSslMode::Prefer).application_name("MIO");
                PgConnection::connect_with(&o).await.map(Conn::Pg)
            }
            Engine::MySql => {
                let o = MySqlConnectOptions::new().host(&s.host).port(s.port).username(&s.user).password(&s.password).database(&s.database).ssl_mode(MySqlSslMode::Preferred);
                MySqlConnection::connect_with(&o).await.map(Conn::My)
            }
        }
    };
    tokio::time::timeout(CONNECT_TIMEOUT, open)
        .await
        .map_err(|_| format!("El servidor no contestó en {} segundos: revisá el servidor y el puerto, y que tu compu pueda llegar a él (red, VPN, firewall).", CONNECT_TIMEOUT.as_secs()))?
        .map_err(|e| message(&e))
}

impl Conn {
    /// Una orden de la sesión (abrir la transacción, el tiempo máximo), sin preparar: no todas se pueden preparar.
    async fn run(&mut self, sql: String) -> Result<(), sqlx::Error> {
        let order = sqlx::raw_sql(AssertSqlSafe(sql));
        match self {
            Conn::Pg(c) => order.execute(&mut *c).await.map(drop),
            Conn::My(c) => order.execute(&mut *c).await.map(drop),
        }
    }

    /// Abre la transacción de solo lectura, con un tiempo máximo para la consulta.
    async fn read_only(&mut self) -> Result<(), String> {
        let fail = |e: sqlx::Error| message(&e);
        match self {
            Conn::Pg(_) => {
                self.run("BEGIN TRANSACTION READ ONLY".into()).await.map_err(fail)?;
                self.run(format!("SET LOCAL statement_timeout = {}", QUERY_TIMEOUT_S * 1000)).await.map_err(fail)
            }
            Conn::My(_) => {
                // El tiempo máximo se llama distinto en MySQL y en MariaDB: vale el que exista.
                let _ = self.run(format!("SET SESSION max_execution_time = {}", QUERY_TIMEOUT_S * 1000)).await;
                let _ = self.run(format!("SET SESSION max_statement_time = {QUERY_TIMEOUT_S}")).await;
                self.run("START TRANSACTION READ ONLY".into()).await.map_err(fail)
            }
        }
    }

    async fn close(self) {
        let _ = match self {
            Conn::Pg(c) => c.close().await,
            Conn::My(c) => c.close().await,
        };
    }
}

/// Prueba la conexión: la versión del servidor y si la conexión va cifrada.
pub async fn check(s: &Server) -> Result<Value, String> {
    let mut conn = connect(s).await?;
    let fail = |e: sqlx::Error| message(&e);
    let (version, encrypted) = match &mut conn {
        Conn::Pg(c) => {
            let v: String = sqlx::query_scalar("SELECT version()").fetch_one(&mut *c).await.map_err(fail)?;
            let ssl: Option<bool> = sqlx::query_scalar("SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()").fetch_optional(&mut *c).await.ok().flatten();
            // «PostgreSQL 16.2 on aarch64-apple-darwin, compiled by…»: alcanza con las dos primeras palabras.
            (v.split_whitespace().take(2).collect::<Vec<_>>().join(" "), ssl.unwrap_or(false))
        }
        Conn::My(c) => {
            let v: String = sqlx::query_scalar("SELECT VERSION()").fetch_one(&mut *c).await.map_err(fail)?;
            let cipher: Option<(String, String)> = sqlx::query_as("SHOW SESSION STATUS LIKE 'Ssl_cipher'").fetch_optional(&mut *c).await.ok().flatten();
            let name = if v.to_ascii_lowercase().contains("mariadb") { "MariaDB" } else { "MySQL" };
            (format!("{name} {}", v.split('-').next().unwrap_or(&v)), cipher.is_some_and(|(_, c)| !c.is_empty()))
        }
    };
    conn.close().await;
    Ok(json!({ "version": version, "cifrada": encrypted }))
}

/// Las tablas y vistas que el usuario puede leer, con cuántas filas tienen más o menos (lo que sabe la
/// base sin contarlas; `null` si no lo sabe o es una vista): `[{esquema, nombre, vista, filas}]`.
pub async fn tables(s: &Server) -> Result<Value, String> {
    let mut conn = connect(s).await?;
    let fail = |e: sqlx::Error| message(&e);
    let list: Vec<Value> = match &mut conn {
        Conn::Pg(c) => {
            let rows: Vec<(String, String, String, f64)> = sqlx::query_as(
                "SELECT n.nspname, c.relname, c.relkind::text, c.reltuples::float8 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace \
                 WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f') AND NOT c.relispartition AND n.nspname NOT IN ('pg_catalog', 'information_schema') \
                 AND n.nspname NOT LIKE 'pg\\_%' AND has_table_privilege(c.oid, 'SELECT') ORDER BY n.nspname <> 'public', n.nspname, c.relname",
            )
            .fetch_all(&mut *c)
            .await
            .map_err(fail)?;
            rows.into_iter().map(|(schema, name, kind, n)| json!({ "esquema": schema, "nombre": name, "vista": kind == "v" || kind == "m", "filas": (n >= 0.0).then_some(n as u64) })).collect()
        }
        Conn::My(c) => {
            let rows: Vec<(String, String, Option<u64>)> = sqlx::query_as(
                "SELECT CAST(TABLE_NAME AS CHAR), CAST(TABLE_TYPE AS CHAR), TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME",
            )
            .fetch_all(&mut *c)
            .await
            .map_err(fail)?;
            rows.into_iter().map(|(name, kind, n)| {
                let view = kind.contains("VIEW");
                json!({ "esquema": null, "nombre": name, "vista": view, "filas": if view { None } else { n } })
            }).collect()
        }
    };
    conn.close().await;
    if list.is_empty() {
        return Err("El usuario no puede leer ninguna tabla de esta base.".into());
    }
    Ok(json!(list))
}

/// Lo leído: la tabla, si se cortó en el tope y lo que no se pudo leer, en palabras.
pub struct Read {
    pub table: Table,
    pub truncated: bool,
    pub notes: Vec<String>,
}

/// Trae `pick` (hasta `limit` filas) en una transacción de solo lectura, avisando el avance.
pub async fn read(s: &Server, pick: &Pick, limit: usize, progress: &Progress<'_>) -> Result<Read, String> {
    progress.report(Stage::Reading, None)?;
    let sql = select(s.engine, pick, limit)?;
    let mut conn = connect(s).await?;
    conn.read_only().await?;
    // Armada acá a propósito: los nombres van entre comillas (`Engine::quote`) y la consulta propia la
    // escribe quien tiene acceso a la base, y corre en una transacción de solo lectura.
    let out = match &mut conn {
        Conn::Pg(c) => gather(sqlx::query(AssertSqlSafe(sql)).fetch(&mut *c), limit, progress, pg_cell).await,
        Conn::My(c) => gather(sqlx::query(AssertSqlSafe(sql)).fetch(&mut *c), limit, progress, my_cell).await,
    };
    // La transacción no cambió nada: se cierra la conexión y se descarta.
    conn.close().await;
    out
}

/// Junta las filas directo en columnas (sin guardar las filas aparte, que con millones duplica la memoria).
async fn gather<R: Row>(mut rows: impl Stream<Item = Result<R, sqlx::Error>> + Unpin, limit: usize, progress: &Progress<'_>, cell: fn(&R, usize, &str) -> Option<Cell>) -> Result<Read, String> {
    let (mut names, mut kinds, mut columns, mut unread): (Vec<String>, Vec<String>, Vec<Vec<Cell>>, Vec<bool>) = Default::default();
    let mut n = 0;
    while let Some(row) = rows.try_next().await.map_err(|e| message(&e))? {
        if n == 0 {
            names = row.columns().iter().map(|c| c.name().to_string()).collect();
            kinds = row.columns().iter().map(|c| c.type_info().name().to_string()).collect();
            columns = names.iter().map(|_| Vec::new()).collect();
            unread = vec![false; names.len()];
        }
        if n == limit {
            return finish(names, kinds, columns, unread, true);
        }
        for (i, col) in columns.iter_mut().enumerate() {
            col.push(cell(&row, i, &kinds[i]).unwrap_or_else(|| {
                unread[i] = true;
                Cell::Null
            }));
        }
        n += 1;
        if n % EVERY == 0 {
            progress.report(Stage::Reading, None)?;
        }
    }
    if n == 0 {
        return Err("La base no devolvió ninguna fila.".into());
    }
    finish(names, kinds, columns, unread, false)
}

fn finish(names: Vec<String>, kinds: Vec<String>, columns: Vec<Vec<Cell>>, unread: Vec<bool>, truncated: bool) -> Result<Read, String> {
    let notes = names
        .iter()
        .zip(&kinds)
        .zip(&unread)
        .filter(|(_, &u)| u)
        .map(|((name, kind), _)| format!("«{name}» es de tipo {kind} y MIO no pudo leer algunos valores: quedaron vacíos. Si la necesitás, convertila a texto o a número en la consulta."))
        .collect();
    Ok(Read { table: from_columns(names, columns)?, truncated, notes })
}

/// Días y momentos como nanosegundos desde 1970 (como guarda las fechas la planilla).
fn day_ns(d: NaiveDate) -> i64 {
    (d - NaiveDate::default()).num_days() * DAY_NS
}
fn moment_ns(t: NaiveDateTime) -> Option<i64> {
    t.and_utc().timestamp_nanos_opt()
}
/// Un momento con zona horaria, en la hora de esta compu (una venta de las 22 en Argentina es de ese día, no del siguiente en UTC).
fn local_ns(t: DateTime<Utc>) -> Option<i64> {
    moment_ns(t.with_timezone(&Local).naive_local())
}
fn decimal(d: Decimal) -> Option<Cell> {
    d.to_f64().map(Cell::Float)
}

/// Un valor de PostgreSQL; `None` si es de un tipo que MIO no lee o no se pudo leer.
fn pg_cell(row: &PgRow, i: usize, kind: &str) -> Option<Cell> {
    if row.try_get_raw(i).ok()?.is_null() {
        return Some(Cell::Null);
    }
    match kind {
        "INT2" => row.try_get::<i16, _>(i).ok().map(|v| Cell::Int(v.into())),
        "INT4" => row.try_get::<i32, _>(i).ok().map(|v| Cell::Int(v.into())),
        "INT8" => row.try_get::<i64, _>(i).ok().map(Cell::Int),
        "FLOAT4" => row.try_get::<f32, _>(i).ok().map(|v| Cell::Float(v.into())),
        "FLOAT8" => row.try_get::<f64, _>(i).ok().map(Cell::Float),
        "NUMERIC" => row.try_get::<Decimal, _>(i).ok().and_then(decimal),
        "BOOL" => row.try_get::<bool, _>(i).ok().map(Cell::Bool),
        "DATE" => row.try_get::<NaiveDate, _>(i).ok().map(|d| Cell::Time(day_ns(d))),
        "TIMESTAMP" => row.try_get::<NaiveDateTime, _>(i).ok().and_then(moment_ns).map(Cell::Time),
        "TIMESTAMPTZ" => row.try_get::<DateTime<Utc>, _>(i).ok().and_then(local_ns).map(Cell::Time),
        "TEXT" | "VARCHAR" | "BPCHAR" | "NAME" | "CHAR" => row.try_get::<String, _>(i).ok().map(Cell::Text),
        _ => None,
    }
}

/// Un valor de MySQL o MariaDB; `None` si es de un tipo que MIO no lee o no se pudo leer (una fecha
/// `0000-00-00`, por ejemplo).
fn my_cell(row: &MySqlRow, i: usize, kind: &str) -> Option<Cell> {
    if row.try_get_raw(i).ok()?.is_null() {
        return Some(Cell::Null);
    }
    let int = |v: i64| Some(Cell::Int(v));
    match kind {
        "BOOLEAN" => row.try_get::<bool, _>(i).ok().map(Cell::Bool),
        "TINYINT" => int(row.try_get::<i8, _>(i).ok()?.into()),
        "SMALLINT" => int(row.try_get::<i16, _>(i).ok()?.into()),
        "INT" | "MEDIUMINT" => int(row.try_get::<i32, _>(i).ok()?.into()),
        "BIGINT" => int(row.try_get::<i64, _>(i).ok()?),
        "TINYINT UNSIGNED" => int(row.try_get::<u8, _>(i).ok()?.into()),
        "SMALLINT UNSIGNED" | "YEAR" => int(row.try_get::<u16, _>(i).ok()?.into()),
        "INT UNSIGNED" | "MEDIUMINT UNSIGNED" => int(row.try_get::<u32, _>(i).ok()?.into()),
        "BIGINT UNSIGNED" => row.try_get::<u64, _>(i).ok().map(|v| i64::try_from(v).map_or(Cell::Float(v as f64), Cell::Int)),
        "FLOAT" => row.try_get::<f32, _>(i).ok().map(|v| Cell::Float(v.into())),
        "DOUBLE" => row.try_get::<f64, _>(i).ok().map(Cell::Float),
        "DECIMAL" => row.try_get::<Decimal, _>(i).ok().and_then(decimal),
        "DATE" => row.try_get::<NaiveDate, _>(i).ok().map(|d| Cell::Time(day_ns(d))),
        "DATETIME" => row.try_get::<NaiveDateTime, _>(i).ok().and_then(moment_ns).map(Cell::Time),
        "TIMESTAMP" => row.try_get::<DateTime<Utc>, _>(i).ok().and_then(local_ns).map(Cell::Time),
        "CHAR" | "VARCHAR" | "TEXT" | "TINYTEXT" | "MEDIUMTEXT" | "LONGTEXT" | "ENUM" | "SET" => row.try_get::<String, _>(i).ok().map(Cell::Text),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn arma_la_consulta_con_tope_y_comillas() {
        let t = |schema: Option<&str>, name: &str| Pick::Table { schema: schema.map(str::to_string), name: name.into() };
        assert_eq!(select(Engine::Postgres, &t(Some("ventas 2025"), "caja \"diaria\""), 100).unwrap(), "SELECT * FROM \"ventas 2025\".\"caja \"\"diaria\"\"\" LIMIT 101");
        assert_eq!(select(Engine::MySql, &t(None, "caja`x"), 5).unwrap(), "SELECT * FROM `caja``x` LIMIT 6");
        // Un comentario al final de la consulta propia no se come el paréntesis; el «;» del final no molesta.
        let q = Pick::Query("SELECT fecha, monto FROM ventas -- solo 2025\n;".into());
        assert_eq!(select(Engine::Postgres, &q, 10).unwrap(), "SELECT * FROM (\nSELECT fecha, monto FROM ventas -- solo 2025\n) AS mio_consulta LIMIT 11");
    }

    #[test]
    fn una_consulta_propia_solo_lee() {
        assert!(own_query("  /* informe */ -- mensual\n with t as (select 1) select * from t").is_ok());
        assert!(own_query("SELECT 1;").is_ok());
        for bad in ["DELETE FROM ventas", "update ventas set monto = 0", "SELECT 1; DROP TABLE ventas", "-- nada", "selected"] {
            assert!(own_query(bad).is_err(), "{bad}");
        }
        assert!(own_query("DROP TABLE x").unwrap_err().contains("solo lee"));
        assert!(own_query("SELECT 1; SELECT 2").unwrap_err().contains("una sola"));
    }

    #[test]
    fn lee_lo_que_manda_la_pantalla() {
        let s = Server::from_json(&json!({ "motor": "mysql", "servidor": " db.local ", "base": "tienda", "usuario": "lector" }), "x".into()).unwrap();
        assert_eq!((s.engine, s.host.as_str(), s.port), (Engine::MySql, "db.local", 3306), "sin puerto, el de cada motor");
        assert!(Server::from_json(&json!({ "motor": "oracle", "servidor": "a", "base": "b", "usuario": "c" }), String::new()).is_err());
        assert!(Server::from_json(&json!({ "motor": "postgres", "servidor": "a", "base": "b", "usuario": "c", "puerto": 70000 }), String::new()).unwrap_err().contains("puerto"));
        assert!(Server::from_json(&json!({ "motor": "postgres", "servidor": "", "base": "b", "usuario": "c" }), String::new()).unwrap_err().contains("servidor"));
        for p in [Pick::Query("SELECT 1".into()), Pick::Table { schema: Some("public".into()), name: "ventas".into() }, Pick::Table { schema: None, name: "ventas".into() }] {
            assert_eq!(Pick::from_json(&p.to_json()).unwrap(), p);
        }
        assert!(Pick::from_json(&json!({})).is_err());
    }

    #[test]
    fn las_fechas_quedan_como_en_la_planilla() {
        assert_eq!(day_ns(NaiveDate::from_ymd_opt(2024, 1, 1).unwrap()), 19_723 * DAY_NS);
        let t = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap().and_hms_opt(12, 30, 0).unwrap();
        assert_eq!(moment_ns(t), Some(19_723 * DAY_NS + (12 * 3600 + 30 * 60) * 1_000_000_000));
        assert!(matches!(decimal(Decimal::new(123_456, 2)), Some(Cell::Float(x)) if (x - 1234.56).abs() < 1e-9));
    }

    /// Contra un servidor de verdad, si hay uno: `MIO_BASE_PRUEBA='{"motor":"postgres","servidor":"localhost","base":"tienda","usuario":"lector","contrasena":"…","tabla":"ventas"}' cargo test --release -p mio-engine database -- --ignored`.
    #[tokio::test]
    #[ignore = "necesita un servidor: MIO_BASE_PRUEBA"]
    async fn contra_un_servidor() {
        let v: Value = serde_json::from_str(&std::env::var("MIO_BASE_PRUEBA").expect("MIO_BASE_PRUEBA")).unwrap();
        let s = Server::from_json(&v, v["contrasena"].as_str().unwrap_or_default().into()).unwrap();
        let info = check(&s).await.unwrap();
        assert!(info["version"].as_str().is_some_and(|v| !v.is_empty()), "{info}");
        assert!(tables(&s).await.unwrap().as_array().is_some_and(|t| !t.is_empty()));
        let pick = Pick::from_json(&v).unwrap();
        let r = read(&s, &pick, 5, &Progress::NONE).await.unwrap();
        assert!(r.table.rows() <= 5 && r.table.rows() > 0);
        // Un borrado escondido en un WITH pasa la revisión del texto: lo frena la transacción de solo lectura.
        if s.engine == Engine::Postgres {
            let sneaky = Pick::Query(format!("WITH x AS (DELETE FROM {} RETURNING *) SELECT * FROM x", s.engine.quote(&pick.label())));
            assert!(read(&s, &sneaky, 5, &Progress::NONE).await.err().is_some_and(|e| e.contains("solo lee")));
        }
    }
}
