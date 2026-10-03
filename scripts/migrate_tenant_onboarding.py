# scripts/migrate_tenant_onboarding.py
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import text
from packages.database.connection import engine

def migrate():
    statements = [
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website_url VARCHAR(255);",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS industry_category VARCHAR(100);",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS organization_size VARCHAR(50);",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS team_size VARCHAR(50);",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_count_estimate VARCHAR(30);",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS target_platforms JSONB NOT NULL DEFAULT '[\"blinkit\", \"zepto\", \"instamart\"]'::jsonb;",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN NOT NULL DEFAULT false;",
        "UPDATE tenants SET is_onboarded = false WHERE is_onboarded IS NULL;"
    ]
    with engine.connect() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
        conn.commit()
    print("Migration successful: Tenant table updated with onboarding fields.")

if __name__ == "__main__":
    migrate()
