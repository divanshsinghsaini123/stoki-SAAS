import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from packages.database.connection import get_db_context
from packages.database.models import InventorySnapshot


def show_records():
    with get_db_context() as db:
        records = db.query(InventorySnapshot).order_by(InventorySnapshot.scraped_at.desc()).all()
        print(f"\n[+] Total records in 'inventory_snapshots': {len(records)}\n")
        
        if not records:
            print("No records found yet. Push tasks with seed_tasks.py and run worker.py.")
            return

        fmt = "{:<12} | {:<8} | {:<25} | {:<10} | {:<12} | {:<10}"
        print(fmt.format("Platform", "Pincode", "Product Title", "Selling Price", "Stock Status", "Brand ID"))
        print("-" * 90)
        for r in records:
            title = (r.title[:22] + "...") if len(r.title) > 25 else r.title
            print(fmt.format(
                str(r.platform),
                str(r.pincode),
                title,
                str(r.selling_price),
                str(r.stock_status),
                str(r.brand_id)
            ))


if __name__ == "__main__":
    show_records()
