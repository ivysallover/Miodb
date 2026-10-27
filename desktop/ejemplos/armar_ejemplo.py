"""Arma las planillas del ejemplo que trae la app de escritorio ("Probar con un ejemplo").

Una distribuidora chica de almacén, 2025: las ventas del año en dos planillas (un semestre cada una,
con las mismas columnas: se apilan), los clientes y los productos (se cruzan por `cliente_id` = `id`
y `producto` = `codigo`). Escritas como las exporta un sistema de acá: punto y coma, montos con
"$ 1.234,50", fechas día/mes/año, alguna celda vacía y algunos pedidos fuera de lo normal, para que el
ejemplo muestre la limpieza, la unión, los valores raros y la predicción.

Se corre una vez y deja los archivos en `desktop/src-tauri/ejemplos/` (la app los lleva adentro):

    python3 desktop/ejemplos/armar_ejemplo.py
"""

import datetime as dt
import math
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "src-tauri" / "ejemplos"
random.seed(2025)

CLIENTES = [
    (1, "Almacén Don Pepe", "Minorista", "Rosario"),
    (2, "Supermercado La Estrella", "Mayorista", "Rosario"),
    (3, "Kiosco 24", "Minorista", "Funes"),
    (4, "Autoservicio El Sol", "Mayorista", "Santa Fe"),
    (5, "Despensa Mary", "Minorista", "Rosario"),
    (6, "Mercadito Norte", "Minorista", "Villa Gobernador Gálvez"),
    (7, "Distribuidora Litoral", "Mayorista", "Paraná"),
    (8, "Tienda Online MIO", "Online", "Rosario"),
    (9, "Almacén Las Rosas", "Minorista", "Pérez"),
    (10, "Maxi Ahorro", "Mayorista", "Córdoba"),
]
PRODUCTOS = [
    ("YER-1", "Yerba 1 kg", "Infusiones", 4200),
    ("CAF-5", "Café molido 500 g", "Infusiones", 6100),
    ("AZU-1", "Azúcar 1 kg", "Almacén", 1500),
    ("ACE-9", "Aceite 900 ml", "Almacén", 2900),
    ("FID-5", "Fideos 500 g", "Almacén", 1300),
    ("GAL-3", "Galletitas 300 g", "Golosinas", 1800),
    ("ALF-1", "Alfajor triple", "Golosinas", 900),
    ("GAS-2", "Gaseosa 2,25 l", "Bebidas", 2600),
]
PESO_SEGMENTO = {"Minorista": 1.0, "Mayorista": 4.2, "Online": 1.6}


def pesos(n: float) -> str:
    """$ 1.234,50"""
    entero, dec = f"{n:,.2f}".split(".")
    return f"$ {entero.replace(',', '.')},{dec}"


def ventas_del_dia(dia: dt.date):
    # Más ventas a medida que avanza el año, menos los domingos, un pico en diciembre y en marzo (vuelta a clases).
    tendencia = 1 + (dia.timetuple().tm_yday / 365) * 0.35
    semana = {6: 0.35, 5: 0.8}.get(dia.weekday(), 1.0)
    temporada = 1 + 0.25 * math.exp(-((dia.month - 12) ** 2) / 1.5) + 0.12 * math.exp(-((dia.month - 3) ** 2) / 0.6)
    for _ in range(max(1, round(random.gauss(9, 2.5) * tendencia * semana * temporada))):
        cliente = random.choice(CLIENTES)
        codigo, _, _, precio = random.choice(PRODUCTOS)
        unidades = max(1, round(random.lognormvariate(1.6, 0.55) * PESO_SEGMENTO[cliente[2]]))
        yield cliente[0], codigo, unidades, unidades * precio * random.uniform(0.95, 1.05)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    filas = {1: [], 2: []}
    dia = dt.date(2025, 1, 1)
    while dia.year == 2025:
        for cliente, codigo, unidades, monto in ventas_del_dia(dia):
            filas[1 if dia.month <= 6 else 2].append([dia.strftime("%d/%m/%Y"), str(cliente), codigo, str(unidades), pesos(monto)])
        dia += dt.timedelta(days=1)
    # Lo que se sale de lo normal: unos pedidos gigantes y unos con el monto en cero.
    for semestre in filas.values():
        for fila in random.sample(semestre, 6):
            fila[3] = str(int(fila[3]) * 25)
            fila[4] = pesos(float(fila[4][2:].replace(".", "").replace(",", ".")) * 25)
        for fila in random.sample(semestre, 3):
            fila[4] = pesos(0)
        # Celdas vacías, como en cualquier planilla real.
        for fila in random.sample(semestre, 8):
            fila[random.choice([3, 4])] = ""
    for semestre, nombre in [(1, "ventas_2025_1er_semestre.csv"), (2, "ventas_2025_2do_semestre.csv")]:
        lineas = ["fecha;cliente_id;producto;unidades;monto"] + [";".join(f) for f in filas[semestre]]
        (OUT / nombre).write_text("\n".join(lineas) + "\n", encoding="utf-8")
    (OUT / "clientes.csv").write_text("id;cliente;segmento;ciudad\n" + "".join(f"{i};{n};{s};{c}\n" for i, n, s, c in CLIENTES), encoding="utf-8")
    (OUT / "productos.csv").write_text("codigo;producto;categoria\n" + "".join(f"{c};{n};{k}\n" for c, n, k, _ in PRODUCTOS), encoding="utf-8")
    print(f"Listo: {OUT}")


if __name__ == "__main__":
    main()
