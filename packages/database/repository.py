# <-- Centralized save_snapshot() function here
from .connection import SessionLocal
from .models import InventorySnapshot

def save_snapshot(parsed_data: dict):
    """Universal save function used by all scrapers."""
    session = SessionLocal()
    try:
        snapshot = InventorySnapshot(**parsed_data)
        session.add(snapshot)
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()