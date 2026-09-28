import sys
from pathlib import Path

# Add project root to sys.path so 'packages' can be imported
PROJECT_ROOT = Path(__file__).resolve().parents[4]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from packages.database.connection import get_db
from packages.database.models import Notification
try:
    from ..schemas.responses import NotificationItem, NotificationListResponse
except ImportError:
    from schemas.responses import NotificationItem, NotificationListResponse

router = APIRouter(prefix="/notifications", tags=["Notifications & Alerts"])


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    tenant_id: str | None = Query(None, description="Optional tenant ID"),
    unread_only: bool = Query(False, description="Filter only unread notifications"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Returns in-app notification feed including scan completions, stockouts, and billing alerts."""
    query = db.query(Notification)
    if tenant_id:
        query = query.filter(Notification.tenant_id == tenant_id)
    if unread_only:
        query = query.filter(Notification.is_read == False)

    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()

    unread_count = (
        db.query(Notification)
        .filter(Notification.is_read == False)
        .count()
    )

    items = [
        NotificationItem(
            id=str(n.id),
            tenant_id=str(n.tenant_id),
            type=n.type,
            title=n.title,
            message=n.message,
            is_read=n.is_read,
            metadata_json=n.metadata_json,
            created_at=n.created_at,
        )
        for n in notifications
    ]

    return NotificationListResponse(
        unread_count=unread_count,
        total_notifications=len(items),
        notifications=items,
    )


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
):
    """Marks a single notification as read."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    db.commit()
    return {"success": True, "id": notification_id, "is_read": True}


@router.post("/mark-all-read")
def mark_all_notifications_read(
    tenant_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Marks all notifications as read for the tenant."""
    query = db.query(Notification).filter(Notification.is_read == False)
    if tenant_id:
        query = query.filter(Notification.tenant_id == tenant_id)

    updated_count = query.update({Notification.is_read: True})
    db.commit()
    return {"success": True, "marked_count": updated_count}
