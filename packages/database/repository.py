from datetime import datetime
from typing import Any
from .connection import SessionLocal
from .models import InventorySnapshot, ScanJobRun, Notification


def save_snapshot(parsed_data: dict | list[dict], campaign_id: str | None = None, job_run_id: str | None = None) -> int:
    """Universal save function supporting single and bulk snapshot persistence."""
    if not parsed_data:
        return 0

    records = [parsed_data] if isinstance(parsed_data, dict) else parsed_data
    session = SessionLocal()
    try:
        snapshots = []
        for r in records:
            data = dict(r)
            if campaign_id and "campaign_id" not in data:
                data["campaign_id"] = campaign_id
            if job_run_id and "job_run_id" not in data:
                data["job_run_id"] = job_run_id
            snapshots.append(InventorySnapshot(**data))

        session.add_all(snapshots)
        session.commit()
        return len(snapshots)
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def update_job_run_status(job_run_id: str, status: str, items_count: int = 0, error_message: str | None = None):
    """Updates the execution status of a scan job run."""
    session = SessionLocal()
    try:
        run = session.query(ScanJobRun).filter(ScanJobRun.id == job_run_id).first()
        if run:
            run.status = status
            run.total_items_found = items_count
            if error_message:
                run.error_message = error_message
            if status in ("completed", "failed"):
                run.completed_at = datetime.utcnow()
            session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def record_job_run_progress(
    job_run_id: str,
    platform: str,
    pincode: str,
    items_count: int = 0,
    success: bool = True,
    error_message: str | None = None,
):
    """
    Granularly updates ScanJobRun as individual platform/pincode tasks complete.
    Aggregates total_items_found and marks job as 'completed' when all tasks finish.
    """
    if not job_run_id:
        return
    session = SessionLocal()
    try:
        run = session.query(ScanJobRun).filter(ScanJobRun.id == job_run_id).first()
        if run:
            run.total_items_found = (run.total_items_found or 0) + items_count
            meta = dict(run.execution_metadata or {})
            completed_tasks = meta.get("completed_tasks", 0) + 1
            meta["completed_tasks"] = completed_tasks
            task_log = meta.get("task_logs", [])
            task_log.append({
                "platform": platform,
                "pincode": pincode,
                "items_count": items_count,
                "status": "success" if success else "failed",
                "error": error_message,
                "timestamp": datetime.utcnow().isoformat(),
            })
            meta["task_logs"] = task_log[-50:]  # Keep last 50 task entries
            run.execution_metadata = meta

            total_dispatched = meta.get("total_tasks_dispatched", 0)
            if total_dispatched > 0 and completed_tasks >= total_dispatched:
                run.status = "completed"
                run.completed_at = datetime.utcnow()
            elif run.status == "pending":
                run.status = "running"

            session.commit()
    except Exception:
        session.rollback()
    finally:
        session.close()



def create_tenant_notification(tenant_id: str, n_type: str, title: str, message: str, metadata: dict | None = None):
    """Creates an in-app notification entry for a tenant."""
    session = SessionLocal()
    try:
        notification = Notification(
            tenant_id=tenant_id,
            type=n_type,
            title=title,
            message=message,
            metadata_json=metadata or {},
        )
        session.add(notification)
        session.commit()
    except Exception:
        session.rollback()
    finally:
        session.close()