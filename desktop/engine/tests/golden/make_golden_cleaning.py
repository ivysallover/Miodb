"""
Fotos de la limpieza del motor de Python, paso por paso, para comparar contra la de Rust.

Lee cada CSV como el motor (detect_csv_format + pd.read_csv) y corre los pasos de
`services/data_cleaning/pipeline.py` en el mismo orden, guardando después de cada paso la tabla
(nombres, tipo y valores de cada columna, e índice de filas) y lo que el paso devuelve aparte
(nulos detectados, locale, columnas de montos, tipos semánticos, atípicos, imputación, informe).
Usa los CSV del lector (`golden/csv/`) y los de limpieza (`golden/csv_limpieza/`, los escribe acá).

    desktop/.venv-referencia/bin/python desktop/engine/tests/golden/make_golden_cleaning.py
"""
import io
import json
import logging
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "dashboard-ia" / "backend"))
logging.disable(logging.CRITICAL)

from services.analysis_pipeline import detect_csv_format  # noqa: E402
from services.data_cleaning.schemas import CleaningConfig  # noqa: E402
from services.data_cleaning.step01_null_normalizer import normalize_headers_and_nulls  # noqa: E402
from services.data_cleaning.step02_empty_filter import filter_empty_rows_and_cols  # noqa: E402
from services.data_cleaning.step03_locale_detector import detect_dataset_locale  # noqa: E402
from services.data_cleaning.step04_string_normalizer import normalize_text_strings  # noqa: E402
from services.data_cleaning.step05_deduplicator import deduplicate_dataframe  # noqa: E402
from services.data_cleaning.step06_currency_sanitizer import sanitize_currencies  # noqa: E402
from services.data_cleaning.step07_numeric_coercion import coerce_numeric_columns  # noqa: E402
from services.data_cleaning.step08_temporal_parser import parse_temporal_columns  # noqa: E402
from services.data_cleaning.step09_semantic_profiler import profile_semantic_types  # noqa: E402
from services.data_cleaning.step10_outlier_engine import process_outliers  # noqa: E402
from services.data_cleaning.step11_contextual_imputer import impute_contextual_nulls  # noqa: E402
from services.data_cleaning.step12_memory_downcaster import downcast_memory_selective  # noqa: E402
from services.data_cleaning.step13_report_builder import build_cleaning_report  # noqa: E402

HERE = Path(__file__).parent
LIMPIEZA = HERE / "csv_limpieza"

rng = np.random.default_rng(5)
_atip = [round(float(v), 2) for v in rng.normal(100, 10, 60)] + [480.0, -200.0]
FILES = {
    "nulos_disfrazados.csv": "cliente,estado,nota\n  Ana  ,activo, ok \nBeto,s/d,bien\nCarla,-,\" N/A \"\nDiego,Sin dato,?\nEli,desconocido,listo\nFede,activo,  \n",
    "solo_espacios.csv": "nombre,ciudad\n  Ana  ,Rosario \n Beto, Córdoba\nCarla ,Salta\nDiego,  Jujuy  \n",
    "montos_ar.csv": "fecha;importe;margen;notas\n01/02/2024;$ 1.234,56;12,5%;uno\n02/02/2024;$980,10;8,0%;dos\n03/02/2024;$ 12.000,00;15%;tres\n04/02/2024;-$ 45,00;3,25%;cuatro\n05/02/2024;$ 7,5;10%;cinco\n",
    "montos_us.csv": "date,amount,rate\n2024-02-01,\"$1,234.56\",1.5\n2024-02-02,\"$980.10\",2.5\n2024-02-03,\"$12,000.00\",3.0\n2024-02-04,$45.00,4.25\n2024-02-05,$7.50,5.0\n",
    "fechas_mixtas.csv": "f_dia,f_iso,f_hora,f_mezcla,f_rota\n13/01/2024,2024-01-13,2024-01-13 10:30:00,13/01/2024,hoy\n05/02/2024,2024-02-05,2024-02-05 08:00:00,2024-02-05,ayer\n03/04/2024,2024-04-03,2024-04-03 23:59:59,03/04/2024,mañana\n28/02/2024,2024-02-28,2024-02-28 00:00:00,28-02-2024,nunca\n01/12/2024,2024-12-01,2024-12-01 12:00:00,01/12/2024,siempre\n",
    "duplicados.csv": "nombre,monto\nAna ,10\nAna,10\nBeto,20\nBeto,20\nCarla,30\n Ana,10\n",
    "vacias.csv": "a,b,c,d\n1,x,-,\n,,,\n2,y,-,\n-,s/d,n/a,\n3,z,--,\n4,w,-,\n",
    "atipicos.csv": "id_cliente,estado,monto,cp\n" + "".join(f"C{i:03d},{i % 3},{v},{5000 + i}\n" for i, v in enumerate(_atip)),
    "textos_unicode.csv": "producto,descripcion\nCafé,\"dos  espacios\"\nCafé,\"tab\tadentro\"\nTé,normal\nTé,\"  bordes  \"\n",
    "imputacion.csv": "fecha,ventas,categoria,comentario\n2024-01-01,10,A,hola\n2024-01-02,,B,\n2024-01-03,30,,chau\n2024-01-04,40,A,\n2024-01-05,,A,algo\n,60,B,más\n2024-01-07,70,A,\n",
    "numeros_texto.csv": "codigo,valor_ar,valor_us,mezcla\nA1,1.234,1.5,10\nA2,2.500,2.25,veinte\nA3,3.000,3.75,30\nA4,4.125,4.5,40\n",
    # Atípicos moderados: entre 1,5 y 2 rangos intercuartílicos (distinguen el umbral exacto).
    "atipicos_moderados.csv": "monto\n" + "".join(f"{v}\n" for v in [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 30, 31, 1]),
    "booleanos_con_huecos.csv": "a,b\nTrue,1\n,2\nFalse,3\nTrue,4\n",
}


def value(v):
    if v is None:
        return None
    if isinstance(v, (pd.Timestamp,)):
        return None if pd.isna(v) else v.isoformat()
    if isinstance(v, float) and math.isnan(v):
        return None
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(v, (np.floating, float)):
        f = float(v)
        if math.isinf(f):
            return "inf" if f > 0 else "-inf"
        return f
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.bool_, bool)):
        return bool(v)
    return v


def snap(df):
    return {
        "index": [int(i) for i in df.index],
        "columns": [{"name": str(c), "dtype": str(df[c].dtype), "values": [value(v) for v in df[c].tolist()]} for c in df.columns],
    }


def run(df_raw):
    cfg = CleaningConfig()
    steps = {}
    df_orig = df_raw.copy()
    df, nulls_detected, _ = normalize_headers_and_nulls(df_orig, cfg)
    steps["1_nulos"] = {"tabla": snap(df), "nulos_detectados": nulls_detected}
    df, rows_dropped, empty_cols, _ = filter_empty_rows_and_cols(df)
    steps["2_vacias"] = {"tabla": snap(df), "filas_eliminadas": rows_dropped, "columnas_eliminadas": empty_cols}
    if df.empty:
        return steps
    loc, dec, tho, dayfirst = detect_dataset_locale(df, cfg)
    steps["3_locale"] = {"locale": loc, "decimal": dec, "miles": tho, "dayfirst": dayfirst}
    df, _ = normalize_text_strings(df)
    steps["4_textos"] = {"tabla": snap(df)}
    df, dups, _ = deduplicate_dataframe(df, cfg)
    steps["5_duplicados"] = {"tabla": snap(df), "duplicados": dups}
    df, monetary, _ = sanitize_currencies(df, cfg, dec, tho)
    steps["6_montos"] = {"tabla": snap(df), "monetarias": sorted(monetary)}
    df, coerced, _ = coerce_numeric_columns(df, dec, monetary_cols=monetary)
    steps["7_numeros"] = {"tabla": snap(df), "convertidas": coerced}
    df, dates, ambiguous, _ = parse_temporal_columns(df, dayfirst)
    steps["8_fechas"] = {"tabla": snap(df), "fechas": dates, "ambiguas": ambiguous}
    type_map = profile_semantic_types(df, monetary)
    steps["9_tipos"] = {"tipos": type_map}
    df, outliers, _ = process_outliers(df, type_map, cfg, monetary)
    steps["10_atipicos"] = {"tabla": snap(df), "atipicos": outliers}
    df, imputed, actions11 = impute_contextual_nulls(df, type_map, cfg, monetary)
    steps["11_imputacion"] = {"tabla": snap(df), "imputados": imputed, "acciones": actions11}
    df, _ = downcast_memory_selective(df, type_map, monetary, cfg)
    steps["12_memoria"] = {"tabla": snap(df)}
    return steps


def main():
    LIMPIEZA.mkdir(exist_ok=True)
    for name, text in FILES.items():
        (LIMPIEZA / name).write_bytes(text.encode("utf-8"))
    cases = []
    for folder in (HERE / "csv", LIMPIEZA):
        for path in sorted(folder.iterdir()):
            data = path.read_bytes()
            enc, sep, skip = detect_csv_format(io.BytesIO(data))
            try:
                df = pd.read_csv(io.BytesIO(data), encoding=enc, sep=sep, skiprows=skip, engine="c", on_bad_lines="skip")
            except Exception:
                continue
            if df.empty:
                continue
            steps = run(df)
            cases.append({"file": f"{folder.name}/{path.name}", "steps": steps})
            last = steps.get("12_memoria") or steps.get("2_vacias")
            print(f"{folder.name + '/' + path.name:<40} {[c['dtype'] for c in last['tabla']['columns']]}")
    out = HERE / "cleaning.json"
    out.write_text(json.dumps({"origen": f"services/data_cleaning (pandas {pd.__version__})", "casos": cases}, indent=1, ensure_ascii=False))
    print(f"{len(cases)} planillas -> {out}")


if __name__ == "__main__":
    main()
