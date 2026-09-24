# packages/database/connection.py
import os
from contextlib import contextmanager
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://stoki_user:stoki_password@localhost:5432/stoki_db",
)

# Engine configuration with connection pooling and health checks
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # Tests connections before using them to prevent dropped session errors
    pool_size=10,             # Number of persistent connections
    max_overflow=20,          # Extra burst connections under high load
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Shared Declarative Base for models
Base = declarative_base()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """Context manager for workers and scripts. Handles commit, rollback, and closing automatically."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency injection provider."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()