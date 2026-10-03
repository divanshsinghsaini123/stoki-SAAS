import logging
import sys
from pathlib import Path
from typing import Any

# Add project root to sys.path so 'packages' can be imported
PROJECT_ROOT = Path(__file__).resolve().parents[4]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from packages.database.connection import get_db
from packages.database.models import Platform

try:
    from ..schemas import PlatformResponse
except ImportError:
    from schemas import PlatformResponse

logger = logging.getLogger("platform-routes")
router = APIRouter(prefix="/platforms", tags=["Platforms Master Registry"])


@router.get("", response_model=list[PlatformResponse])
def get_active_platforms(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
):
    """
    Returns the master list of Q-Commerce platforms (Blinkit, Zepto, Swiggy Instamart, etc.)
    sorted by sort_order. Used by Onboarding, Settings, and Scanner dashboards.
    """
    query = db.query(Platform)
    if not include_inactive:
        query = query.filter(Platform.is_active == True)
    
    platforms = query.order_by(Platform.sort_order.asc()).all()
    return platforms


@router.get("/{platform_id}", response_model=PlatformResponse)
def get_platform_by_id(
    platform_id: str,
    db: Session = Depends(get_db),
):
    """Fetch details for a specific quick-commerce platform."""
    platform = db.query(Platform).filter(Platform.id == platform_id.lower()).first()
    if not platform:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Platform '{platform_id}' not found.",
        )
    return platform
