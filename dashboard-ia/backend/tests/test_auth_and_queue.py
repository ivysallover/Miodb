"""
Sesión y cola del motor:
- sin token válido de Firebase no se analiza, no se exporta, no se chatea (core/auth.py);
- los análisis esperan su turno en orden y quien espera puede saber su lugar (core/analysis_queue.py).
La verificación del token se prueba con una clave RSA generada acá: firma, destinatario, emisor y vencimiento.
"""
import asyncio
import io
import time

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.testclient import TestClient
from google.auth import crypt as google_crypt
from google.auth import jwt as google_jwt

import core.auth as auth
from core.analysis_queue import AnalysisQueue
from core.config import get_settings
from main import app

PROJECT = "proyecto-de-prueba"
KID = "clave-1"


@pytest.fixture(scope="module")
def keys():
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
    )
    public_pem = private.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode()
    return private_pem, public_pem


def _token(private_pem, **overrides):
    now = int(time.time())
    claims = {
        "iss": f"https://securetoken.google.com/{PROJECT}",
        "aud": PROJECT,
        "sub": "usuario-1",
        "email": "alguien@ejemplo.com",
        "iat": now,
        "exp": now + 600,
    }
    claims.update(overrides)
    signer = google_crypt.RSASigner.from_string(private_pem, KID)
    return google_jwt.encode(signer, claims).decode()


@pytest.fixture
def with_certs(keys, monkeypatch):
    _, public_pem = keys
    monkeypatch.setattr(auth, "_fetch_certs", lambda force=False: {KID: public_pem})


# ── Token verification ──────────────────────────────────────────────────────────────────────────

def test_a_valid_token_gives_its_user(keys, with_certs):
    claims = auth.verify_firebase_token(_token(keys[0]), PROJECT)
    assert claims["sub"] == "usuario-1"


@pytest.mark.parametrize(
    "override",
    [
        {"aud": "otro-proyecto"},
        {"iss": "https://securetoken.google.com/otro-proyecto"},
        {"exp": int(time.time()) - 3600, "iat": int(time.time()) - 7200},
        {"sub": ""},
    ],
    ids=["otro destinatario", "otro emisor", "vencido", "sin usuario"],
)
def test_a_token_that_is_not_for_this_project_or_expired_is_refused(keys, with_certs, override):
    with pytest.raises(ValueError):
        auth.verify_firebase_token(_token(keys[0], **override), PROJECT)


def test_a_token_signed_with_another_key_is_refused(with_certs):
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048).private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
    )
    with pytest.raises(ValueError):
        auth.verify_firebase_token(_token(other), PROJECT)


# ── The endpoints ───────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def strict(monkeypatch, keys):
    settings = get_settings()
    monkeypatch.setattr(settings, "REQUIRE_AUTH", True)
    monkeypatch.setattr(settings, "FIREBASE_PROJECT_ID", PROJECT)
    monkeypatch.setattr(auth, "_fetch_certs", lambda force=False: {KID: keys[1]})
    return TestClient(app)


CSV = b"fecha,ventas\n" + b"\n".join(f"2025-01-{d:02d},{100 + d}".encode() for d in range(1, 29))


@pytest.mark.parametrize(
    "method,path",
    [
        ("post", "/api/analyze"),
        ("post", "/api/v1/analyze"),
        ("post", "/api/profile"),
        ("post", "/api/export/pdf"),
        ("post", "/api/chat"),
        ("post", "/api/narrative"),
        ("get", "/api/queue/abcdefgh12345678"),
        ("delete", "/api/uploads/x"),
    ],
)
def test_no_session_no_service(strict, method, path):
    r = getattr(strict, method)(path)
    assert r.status_code == 401
    assert "iniciar sesión" in r.json()["detail"]


def test_a_junk_token_is_refused(strict):
    r = strict.post("/api/analyze", headers={"Authorization": "Bearer no-es-un-token"})
    assert r.status_code == 401


def test_health_stays_open(strict):
    assert strict.get("/api/health").status_code == 200


def test_a_signed_in_user_is_analysed(strict, keys):
    headers = {"Authorization": f"Bearer {_token(keys[0])}", "X-Request-Id": "ticket-de-prueba-1"}
    r = strict.post(
        "/api/analyze",
        files={"file": ("ventas.csv", io.BytesIO(CSV), "text/csv")},
        data={"target_col": "ventas"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    # the line knows nothing of a finished request
    q = strict.get("/api/queue/ticket-de-prueba-1", headers=headers)
    assert q.status_code == 200 and q.json()["state"] == "none"


def test_a_malformed_ticket_is_refused(strict, keys):
    r = strict.get("/api/queue/mal ticket!", headers={"Authorization": f"Bearer {_token(keys[0])}"})
    assert r.status_code in (400, 404)


# ── The line ────────────────────────────────────────────────────────────────────────────────────

def test_the_line_goes_in_order_and_tells_each_one_its_place():
    async def scenario():
        q = AnalysisQueue(slots=1, max_waiting=5)
        order, gate = [], asyncio.Event()

        async def job(name, hold=False):
            async with q.slot(name):
                order.append(name)
                if hold:
                    await gate.wait()

        first = asyncio.create_task(job("a", hold=True))
        await asyncio.sleep(0.01)
        second = asyncio.create_task(job("b"))
        third = asyncio.create_task(job("c"))
        await asyncio.sleep(0.01)

        assert q.status("a")["state"] == "running"
        assert q.status("b") == {"state": "waiting", "position": 1, "waiting": 2, "running": 1}
        assert q.status("c")["position"] == 2
        assert q.status("zzz")["state"] == "none"

        gate.set()
        await asyncio.gather(first, second, third)
        assert order == ["a", "b", "c"]
        assert q.status("c")["state"] == "none"

    asyncio.run(scenario())


def test_a_full_line_says_so_instead_of_growing():
    async def scenario():
        q = AnalysisQueue(slots=1, max_waiting=1)
        gate = asyncio.Event()

        async def hold(name):
            async with q.slot(name):
                await gate.wait()

        a = asyncio.create_task(hold("a"))
        await asyncio.sleep(0.01)
        b = asyncio.create_task(hold("b"))
        await asyncio.sleep(0.01)
        with pytest.raises(HTTPException) as err:
            async with q.slot("c"):
                pass
        assert err.value.status_code == 429
        gate.set()
        await asyncio.gather(a, b)

    asyncio.run(scenario())


def test_someone_who_leaves_while_waiting_does_not_block_the_line():
    async def scenario():
        q = AnalysisQueue(slots=1, max_waiting=5)
        gate = asyncio.Event()

        async def hold(name):
            async with q.slot(name):
                await gate.wait()

        a = asyncio.create_task(hold("a"))
        await asyncio.sleep(0.01)
        b = asyncio.create_task(hold("b"))
        await asyncio.sleep(0.01)
        b.cancel()
        await asyncio.sleep(0.01)
        assert q.status("b")["state"] == "none"
        gate.set()
        await a
        async with q.slot("d"):  # the line still works
            pass

    asyncio.run(scenario())


def test_the_line_has_a_weight_limit_but_the_first_always_gets_in():
    async def scenario():
        q = AnalysisQueue(slots=1, max_waiting=10, max_bytes=100)
        gate = asyncio.Event()

        async def hold(name, size):
            async with q.slot(name, size):
                await gate.wait()

        a = asyncio.create_task(hold("a", 500))  # más pesado que el tope, pero no hay nadie: entra
        await asyncio.sleep(0.01)
        with pytest.raises(HTTPException) as err:
            async with q.slot("b", 10):
                pass
        assert err.value.status_code == 429
        gate.set()
        await a
        assert q._held == 0  # al terminar, el peso se libera
        async with q.slot("c", 50):
            pass

    asyncio.run(scenario())
