import logging
import sys
from collections import deque

log_buffer: deque = deque(maxlen=100)

class RingBufferHandler(logging.Handler):
    def emit(self, record):
        try:
            msg = self.format(record)
            log_buffer.append(msg)
        except Exception:
            pass

def setup_logging():
    formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    
    buffer_handler = RingBufferHandler()
    buffer_handler.setFormatter(formatter)

    root_logger = logging.getLogger("dashboard_api")
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(stream_handler)
    root_logger.addHandler(buffer_handler)
    
    # Suppress verbose third party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    return root_logger

logger = setup_logging()

def get_recent_logs(limit: int = 50) -> list:
    return list(log_buffer)[-limit:]
