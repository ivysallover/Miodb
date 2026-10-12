"""
core/analysis_queue.py
Cola de análisis: el motor corre pocos análisis a la vez (la RAM del servidor es chica) y los demás
esperan su turno, en orden de llegada. Cada pedido trae un ticket (`X-Request-Id`) para que quien espera
pueda preguntar en qué lugar de la fila está y la página le diga "estamos teniendo breves demoras".
"""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Set

from fastapi import HTTPException


class AnalysisQueue:
    def __init__(self, slots: int, max_waiting: int):
        self.slots = max(1, int(slots))
        self.max_waiting = max(0, int(max_waiting))
        self._sem: Optional[asyncio.Semaphore] = None  # created inside the running loop
        self._waiting: List[str] = []
        self._running: Set[str] = set()

    def _semaphore(self) -> asyncio.Semaphore:
        if self._sem is None:
            self._sem = asyncio.Semaphore(self.slots)
        return self._sem

    @asynccontextmanager
    async def slot(self, ticket: str):
        """Espera el turno (FIFO) y lo libera al terminar, pase lo que pase."""
        if len(self._running) >= self.slots and len(self._waiting) >= self.max_waiting:
            raise HTTPException(
                status_code=429,
                detail="Hay muchos análisis en curso en este momento. Probá de nuevo en un minuto.",
                headers={"Retry-After": "30"},
            )
        self._waiting.append(ticket)
        try:
            await self._semaphore().acquire()
        except BaseException:
            # the client left (or the request was cancelled) while it waited
            if ticket in self._waiting:
                self._waiting.remove(ticket)
            raise
        if ticket in self._waiting:
            self._waiting.remove(ticket)
        self._running.add(ticket)
        try:
            yield
        finally:
            self._running.discard(ticket)
            self._semaphore().release()

    def status(self, ticket: str) -> Dict[str, object]:
        """Dónde está un ticket: corriendo, esperando (con su lugar) o desconocido."""
        if ticket in self._running:
            return {"state": "running", "position": 0, "waiting": len(self._waiting), "running": len(self._running)}
        if ticket in self._waiting:
            return {
                "state": "waiting",
                "position": self._waiting.index(ticket) + 1,
                "waiting": len(self._waiting),
                "running": len(self._running),
            }
        return {"state": "none", "position": 0, "waiting": len(self._waiting), "running": len(self._running)}
