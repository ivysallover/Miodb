"""
models/forecast_candidates.py
Los modelos que compiten por la predicción y la competencia en sí.

Cada candidato recibe la serie ya agregada (semanas, meses o días: como mucho unos cientos de
puntos) y devuelve los próximos `steps` valores. Ninguno trae dependencias nuevas: numpy, scikit-learn
y LightGBM ya están cargados por el resto del motor, así que sumarlos casi no cuesta RAM (medido:
toda la competencia agrega ~16 MB y ~1 s con las librerías ya en memoria).

La competencia esconde los últimos tramos de la serie, le pide a cada candidato que los prediga y
gana el que menos se equivoca en promedio. Lo que un modelo "ya vio" no cuenta.
"""
from __future__ import annotations

import time
from typing import Callable, Dict, List, Optional, Sequence

import numpy as np

Predictor = Callable[[np.ndarray, int], np.ndarray]

# Nombres que ve la persona (en castellano, sin siglas cuando se puede).
NAMES = {
    "prophet": "Prophet",
    "holt": "Holt-Winters amortiguado",
    "theta": "Theta",
    "ridge": "Regresión con rezagos",
    "lightgbm": "LightGBM con rezagos",
}

# Debajo de esto un candidato no compite: con menos historia memoriza en vez de aprender.
MIN_TRAIN = {"holt": 8, "theta": 8, "ridge": 24, "lightgbm": 60, "prophet": 10}

# Un candidato que tarda más que esto en sus tramos queda afuera: con la fila de análisis, un pedido
# lento hace esperar a todos (Prophet a veces tarda varios segundos en ajustarse con ciertas series).
MAX_SECONDS_PER_CANDIDATE = 6.0

# Dos candidatos "empatan" si el segundo erra a lo sumo un 10 % más que el primero: entonces también
# compite el promedio de ambos, que suele ser más estable que cualquiera solo.
TIE_RATIO = 1.10


def _mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.mean(np.abs((y_true - y_pred) / (np.abs(y_true) + 1e-4))) * 100)


# ----------------------------------------------------------------------------------------------
# Candidatos
# ----------------------------------------------------------------------------------------------

def holt(train: np.ndarray, steps: int, season: int = 0) -> np.ndarray:
    """
    Holt-Winters aditivo con tendencia amortiguada. Los parámetros salen de una grilla chica que
    minimiza el error a un paso sobre la misma historia. Sin temporada si no hay al menos dos
    temporadas completas.
    """
    y = np.asarray(train, dtype=float)
    n = len(y)
    m = season if season and n >= 2 * season else 0
    best = None
    for a in (0.1, 0.3, 0.5, 0.8):
        for b in (0.0, 0.05, 0.2):
            for phi in (0.8, 0.9, 0.98):
                for g in ((0.05, 0.2, 0.4) if m else (0.0,)):
                    if m:
                        level = float(np.mean(y[:m]))
                        seas = list(y[:m] - level)
                    else:
                        level, seas = float(y[0]), []
                    trend = 0.0
                    sse = 0.0
                    for i in range(n):
                        s = seas[i % m] if m else 0.0
                        pred = level + phi * trend + s
                        if i >= (m or 1):
                            sse += (y[i] - pred) ** 2
                        prev = level
                        level = a * (y[i] - s) + (1 - a) * (level + phi * trend)
                        trend = b * (level - prev) + (1 - b) * phi * trend
                        if m:
                            seas[i % m] = g * (y[i] - level) + (1 - g) * s
                    if best is None or sse < best[0]:
                        best = (sse, level, trend, list(seas), phi)
    _, level, trend, seas, phi = best
    out = np.empty(steps)
    damp = 0.0
    for h in range(steps):
        damp += phi ** (h + 1)
        out[h] = level + damp * trend + (seas[(n + h) % m] if m else 0.0)
    return out


def _seasonal_profile(y: np.ndarray, m: int) -> np.ndarray:
    """Promedio por posición dentro de la temporada, sobre la serie sin su recta (suma cero)."""
    x = np.arange(len(y))
    slope, icpt = np.polyfit(x, y, 1)
    resid = y - (icpt + slope * x)
    prof = np.array([resid[i::m].mean() for i in range(m)])
    return prof - prof.mean()


def theta(train: np.ndarray, steps: int, season: int = 0) -> np.ndarray:
    """
    Método Theta (ganador de la competencia M3): suavizado exponencial simple más la mitad de la
    pendiente de largo plazo. Si hay dos temporadas completas, se le quita la temporada antes y se
    le devuelve después.
    """
    y = np.asarray(train, dtype=float)
    n = len(y)
    m = season if season and n >= 2 * season else 0
    prof = _seasonal_profile(y, m) if m else None
    z = y - prof[np.arange(n) % m] if m else y
    slope = float(np.polyfit(np.arange(n), z, 1)[0])
    best = None
    for a in (0.1, 0.2, 0.3, 0.5, 0.7, 0.9):
        level, sse = float(z[0]), 0.0
        for v in z[1:]:
            sse += (v - level) ** 2
            level = a * v + (1 - a) * level
        if best is None or sse < best[0]:
            best = (sse, a, level)
    _, a, level = best
    h = np.arange(1, steps + 1)
    out = level + 0.5 * slope * (h - 1 + 1.0 / a - ((1 - a) ** n) / a)
    if m:
        out = out + prof[(n + h - 1) % m]
    return out


def _lag_matrix(y: np.ndarray, k: int):
    X = np.lib.stride_tricks.sliding_window_view(y[:-1], k)
    return X, y[k:]


def ridge(train: np.ndarray, steps: int, season: int = 0) -> np.ndarray:
    """Regresión lineal sobre los últimos k valores (k = una temporada, o un tercio de la serie)."""
    from sklearn.linear_model import Ridge

    y = np.asarray(train, dtype=float)
    k = max(2, min(season or 4, len(y) // 3))
    mu, sd = float(y.mean()), float(y.std()) or 1.0
    z = (y - mu) / sd
    X, t = _lag_matrix(z, k)
    model = Ridge(alpha=1.0).fit(X, t)
    hist = list(z)
    out = []
    for _ in range(steps):
        p = float(model.predict(np.asarray(hist[-k:])[None, :])[0])
        out.append(p)
        hist.append(p)
    return np.asarray(out) * sd + mu


def lightgbm(train: np.ndarray, steps: int, season: int = 0) -> np.ndarray:
    """
    Árboles de LightGBM sobre los cambios de un período al otro (un árbol no sabe extrapolar una
    tendencia; sumando los cambios predichos sí). Un solo hilo y semilla fija: mismo resultado y
    poca memoria.
    """
    import warnings

    import lightgbm as lgb

    y = np.asarray(train, dtype=float)
    d = np.diff(y)
    k = max(2, min(season or 4, len(d) // 3))
    X, t = _lag_matrix(d, k)
    with warnings.catch_warnings():
        # scikit-learn avisa por nombres de columnas en cada predicción: ruido en el log del servidor.
        warnings.simplefilter("ignore")
        model = lgb.LGBMRegressor(
            n_estimators=150, learning_rate=0.05, num_leaves=7, min_child_samples=5,
            subsample=1.0, random_state=0, n_jobs=1, verbose=-1,
        ).fit(np.ascontiguousarray(X), t)
        hist = list(d)
        level = float(y[-1])
        out = []
        for _ in range(steps):
            step = float(model.predict(np.asarray(hist[-k:])[None, :])[0])
            hist.append(step)
            level += step
            out.append(level)
    return np.asarray(out)


LOCAL: Dict[str, Callable[..., np.ndarray]] = {"holt": holt, "theta": theta, "ridge": ridge, "lightgbm": lightgbm}


# ----------------------------------------------------------------------------------------------
# Competencia
# ----------------------------------------------------------------------------------------------

def fold_origins(n_pts: int, hold: int, max_folds: int = 3, min_train: int = 10) -> List[int]:
    """Dónde corta cada tramo escondido: los últimos `hold` puntos, los `hold` anteriores, etc."""
    origins = []
    for k in range(1, max_folds + 1):
        o = n_pts - k * hold
        if o < min_train:
            break
        origins.append(o)
    return origins


def compete(
    y: np.ndarray,
    hold: int,
    season: int,
    extra: Optional[Dict[str, Predictor]] = None,
    nonneg: bool = False,
    max_folds: int = 3,
    max_seconds: float = MAX_SECONDS_PER_CANDIDATE,
) -> Optional[Dict[str, object]]:
    """
    Corre la competencia sobre la serie `y`. `extra` suma candidatos que no viven acá (Prophet, que
    necesita las fechas). Devuelve None si no hay forma de esconder tramos.

    Resultado:
      ranking  lista ordenada de {"id", "nombre", "error"} (error = MAPE promedio en %, fuera de muestra)
      winner   ids del ganador (uno, o dos si ganó su promedio)
      preds    predicciones por candidato y tramo, para medir bandas y árbitros
      origins  dónde empieza cada tramo escondido
    """
    y = np.asarray(y, dtype=float)
    n = len(y)
    origins = fold_origins(n, hold, max_folds)
    if not hold or not origins:
        return None

    pool: Dict[str, Predictor] = {}
    for cid, fn in LOCAL.items():
        if min(origins) >= MIN_TRAIN[cid]:
            pool[cid] = (lambda f: (lambda tr, st: f(tr, st, season)))(fn)
    for cid, fn in (extra or {}).items():
        if min(origins) >= MIN_TRAIN.get(cid, 10):
            pool[cid] = fn

    preds: Dict[str, List[np.ndarray]] = {}
    errors: Dict[str, float] = {}
    for cid, fn in pool.items():
        try:
            runs = []
            started = time.monotonic()
            for o in origins:
                if time.monotonic() - started > max_seconds:
                    raise TimeoutError("tardó demasiado")
                p = np.asarray(fn(y[:o], hold), dtype=float)[:hold]
                if p.shape != (hold,) or not np.all(np.isfinite(p)):
                    raise ValueError("predicción inválida")
                if nonneg:
                    p = np.maximum(p, 0.0)
                runs.append(p)
            preds[cid] = runs
            errors[cid] = float(np.mean([_mape(y[o:o + hold], p) for o, p in zip(origins, runs)]))
        except Exception:
            # Un candidato que falla queda afuera; la competencia sigue con los demás.
            continue
    if not errors:
        return None

    order = sorted(errors, key=errors.get)
    winner = [order[0]]
    if len(order) > 1 and errors[order[1]] <= TIE_RATIO * errors[order[0]]:
        a, b = order[0], order[1]
        avg = [(pa + pb) / 2 for pa, pb in zip(preds[a], preds[b])]
        avg_err = float(np.mean([_mape(y[o:o + hold], p) for o, p in zip(origins, avg)]))
        if avg_err < errors[a]:
            preds["+".join((a, b))] = avg
            errors["+".join((a, b))] = avg_err
            winner = [a, b]

    ranking = [{"id": c, "nombre": NAMES[c], "error": round(errors[c], 2)} for c in order]
    return {"ranking": ranking, "winner": winner, "preds": preds, "errors": errors, "origins": origins}


def winner_error(result: Dict[str, object]) -> float:
    errors = result["errors"]  # type: ignore[index]
    return float(errors["+".join(result["winner"])])  # type: ignore[arg-type]


def baseline_error(y: np.ndarray, origins: Sequence[int], hold: int) -> float:
    """Error promedio, en los mismos tramos, de la mejor regla trivial: repetir lo último o el promedio."""
    last = np.mean([_mape(y[o:o + hold], np.full(hold, y[o - 1])) for o in origins])
    mean = np.mean([_mape(y[o:o + hold], np.full(hold, float(np.mean(y[:o])))) for o in origins])
    return float(min(last, mean))


def band_margins(y: np.ndarray, runs: Sequence[np.ndarray], origins: Sequence[int], steps: int) -> np.ndarray:
    """
    Ancho de la banda por paso, sacado de cuánto se equivocó el ganador en los tramos escondidos:
    el mayor error de los tramos en ese paso (con tres tramos, aproxima un rango del 80 %). Más allá
    de lo medido, crece con la raíz de la distancia.
    """
    hold = len(runs[0])
    errs = np.array([np.abs(y[o:o + hold] - p) for o, p in zip(origins, runs)])
    per_step = np.maximum.accumulate(errs.max(axis=0))
    out = np.empty(steps)
    for h in range(steps):
        out[h] = per_step[h] if h < hold else per_step[-1] * np.sqrt((h + 1) / hold)
    return out
