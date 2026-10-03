# scripts/migrate_and_seed_platforms.py
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import text
from packages.database.connection import engine, SessionLocal
from packages.database.models import Platform

INITIAL_PLATFORMS = [
    {
        "id": "blinkit",
        "display_name": "Blinkit",
        "slug": "blinkit",
        "tagline": "Instant 10-Min Delivery",
        "logo_url": None,
        "brand_color": "#F8CB46",
        "badge_bg": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        "is_active": True,
        "sort_order": 1,
    },
    {
        "id": "zepto",
        "display_name": "Zepto",
        "slug": "zepto",
        "tagline": "Ultra-Fast Dark Stores",
        "logo_url": None,
        "brand_color": "#8B5CF6",
        "badge_bg": "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        "is_active": True,
        "sort_order": 2,
    },
    {
        "id": "instamart",
        "display_name": "Swiggy Instamart",
        "slug": "instamart",
        "tagline": "Hyperlocal Grocery Fleet",
        "logo_url": None,
        "brand_color": "#FC8019",
        "badge_bg": "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
        "is_active": True,
        "sort_order": 3,
    },
    {
        "id": "bigbasket",
        "display_name": "BigBasket (BB Now)",
        "slug": "bigbasket",
        "tagline": "Tata Hyperlocal Network",
        "logo_url": None,
        "brand_color": "#84C225",
        "badge_bg": "bg-lime-500/10 text-lime-600 dark:text-lime-400 border-lime-500/20",
        "is_active": True,
        "sort_order": 4,
    },
    {
        "id": "flipkart_minutes",
        "display_name": "Flipkart Minutes",
        "slug": "flipkart_minutes",
        "tagline": "10-Minute Rapid Delivery",
        "logo_url": None,
        "brand_color": "#2874F0",
        "badge_bg": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        "is_active": True,
        "sort_order": 5,
    },
]

def migrate_and_seed():
    print("Creating 'platforms' table if not exists...")
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS platforms (
        id VARCHAR(50) PRIMARY KEY,
        display_name VARCHAR(100) NOT NULL,
        slug VARCHAR(50) UNIQUE NOT NULL,
        tagline VARCHAR(150),
        logo_url VARCHAR(500),
        brand_color VARCHAR(30),
        badge_bg VARCHAR(100),
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_platforms_slug ON platforms (slug);
    CREATE INDEX IF NOT EXISTS ix_platforms_is_active ON platforms (is_active);
    """
    with engine.connect() as conn:
        conn.execute(text(create_table_sql))
        conn.commit()

    print("Seeding initial platforms...")
    db = SessionLocal()
    try:
        for p_data in INITIAL_PLATFORMS:
            existing = db.query(Platform).filter(Platform.id == p_data["id"]).first()
            if not existing:
                platform = Platform(**p_data)
                db.add(platform)
                print(f"Added platform: {p_data['display_name']} ({p_data['id']})")
            else:
                existing.display_name = p_data["display_name"]
                existing.slug = p_data["slug"]
                existing.tagline = p_data["tagline"]
                existing.brand_color = p_data["brand_color"]
                existing.badge_bg = p_data["badge_bg"]
                existing.sort_order = p_data["sort_order"]
                print(f"Updated platform: {p_data['display_name']} ({p_data['id']})")
        db.commit()
        print("Platforms migration and seed completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_and_seed()
