"""
core/pii_sanitizer.py
Módulo de anonimización y sanitización de Información Personal Identificable (PII)
para proteger la privacidad de los usuarios antes de interactuar con modelos LLM (Google Gemini).
"""

import re
from typing import Any, Dict, List, Union


# ---------------------------------------------------------------------------
# Expresiones regulares de detección de PII
# ---------------------------------------------------------------------------

EMAIL_PATTERN = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
    re.IGNORECASE
)

# CUIT / CUIL argentino: prefijo 20, 23, 24, 27, 30, 33, 34 + 8 dígitos + 1 verificador
CUIT_CUIL_PATTERN = re.compile(
    r"\b(?:20|23|24|27|30|33|34)[-.]?\d{8}[-.]?\d\b"
)

# DNI argentino con mención de contexto explícito para evitar falsos positivos con métricas
DNI_PATTERN = re.compile(
    r"(?i)\b(?:dni|documento|id_persona|identificacion)\s*[:#=]?\s*(\d{1,2}\.?\d{3}\.?\d{3})\b"
)

# Teléfonos argentinos y formato internacional
PHONE_PATTERN = re.compile(
    r"(?:\+?54\s?9?\s?)?(?:0?[1-9]\d{1,3})[-.\s]?[1-9]\d{2,3}[-.\s]?\d{4}\b"
)

# Tarjetas de crédito (13 a 19 dígitos, con o sin guiones/espacios)
CARD_PATTERN = re.compile(
    r"\b(?:\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}|\d{4}[ -]?\d{6}[ -]?\d{5})\b"
)


def _luhn_checksum_valid(card_str: str) -> bool:
    """Verifica si una secuencia numérica cumple el algoritmo de Luhn (ISO/IEC 7812)."""
    digits = [int(c) for c in card_str if c.isdigit()]
    if len(digits) < 13 or len(digits) > 19:
        return False
    checksum = 0
    reverse_digits = digits[::-1]
    for i, d in enumerate(reverse_digits):
        if i % 2 == 1:
            doubled = d * 2
            checksum += doubled - 9 if doubled > 9 else doubled
        else:
            checksum += d
    return checksum % 10 == 0


def sanitize_text(text: str) -> str:
    """
    Enmascara direcciones de correo, CUITs, DNIs, teléfonos y tarjetas de crédito
    en una cadena de texto.
    """
    if not isinstance(text, str) or not text:
        return text

    # 1. Emails
    text = EMAIL_PATTERN.sub("[REDACTED_EMAIL]", text)

    # 2. CUIT / CUIL
    text = CUIT_CUIL_PATTERN.sub("[REDACTED_CUIT]", text)

    # 3. DNI con contexto
    text = DNI_PATTERN.sub("DNI [REDACTED_DNI]", text)

    # 4. Tarjetas de crédito con chequeo de Luhn
    def _mask_card(match: re.Match) -> str:
        matched_str = match.group(0)
        digits_only = re.sub(r"\D", "", matched_str)
        if _luhn_checksum_valid(digits_only):
            return "[REDACTED_CARD]"
        return matched_str

    text = CARD_PATTERN.sub(_mask_card, text)

    # 5. Teléfonos
    text = PHONE_PATTERN.sub("[REDACTED_PHONE]", text)

    return text


def sanitize_pii(data: Any) -> Any:
    """
    Sanitiza recursivamente diccionarios, listas y valores primitivos
    para que ningún dato personal llegue al contexto del LLM.
    """
    if isinstance(data, str):
        return sanitize_text(data)
    elif isinstance(data, dict):
        sanitized_dict = {}
        for k, v in data.items():
            # Si el nombre de la clave es explícitamente sensible, redactar valor
            key_lower = str(k).lower()
            if any(term in key_lower for term in ("password", "token", "tarjeta", "credit_card", "secret")):
                sanitized_dict[k] = "[REDACTED_SECRET]"
            elif any(term in key_lower for term in ("dni", "cuit", "cuil", "documento", "passport")):
                sanitized_dict[k] = "[REDACTED_ID]"
            elif any(term in key_lower for term in ("email", "correo")):
                sanitized_dict[k] = "[REDACTED_EMAIL]"
            elif any(term in key_lower for term in ("telefono", "phone", "celular", "whatsapp")):
                sanitized_dict[k] = "[REDACTED_PHONE]"
            else:
                sanitized_dict[k] = sanitize_pii(v)
        return sanitized_dict
    elif isinstance(data, list):
        return [sanitize_pii(item) for item in data]
    elif isinstance(data, tuple):
        return tuple(sanitize_pii(item) for item in data)
    else:
        return data
