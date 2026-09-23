# packages/database/models.py
import uuid
from sqlalchemy import (
    Column,
    String,
    Numeric,
    Boolean,
    Integer,
    DateTime,
    Index,
    text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from .connection import Base


class InventorySnapshot(Base):
    """Immutable, timestamped record of an SKU's inventory state at a specific dark store."""

    __tablename__ = "inventory_snapshots"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )

    # Core identification fields
    brand_id = Column(String(100), nullable=True, index=True)
    platform = Column(String(50), nullable=False, index=True)  # e.g., 'instamart', 'blinkit', 'zepto'
    pincode = Column(String(10), nullable=False, index=True)
    dark_store_id = Column(String(100), nullable=False, index=True)  # e.g., podId in Instamart
    sku_id = Column(String(100), nullable=False, index=True)

    # Catalog & Product details
    parent_product_name = Column(String(255), nullable=True)
    title = Column(String(255), nullable=False)  # Variant display name
    brand = Column(String(100), nullable=True, index=True)
    size = Column(String(100), nullable=True)  # e.g., '300 ml', '1 kg'

    # Pricing & Stock
    mrp = Column(Numeric(10, 2), nullable=True)
    selling_price = Column(Numeric(10, 2), nullable=True)
    stock_status = Column(String(50), nullable=False, index=True)  # 'in_stock', 'out_of_stock'
    in_stock = Column(Boolean, nullable=False, default=True)
    max_allowed_cart_qty = Column(Integer, nullable=True)

    # Platform-specific unstructured data (JSONB)
    # Stores raw tags, delivery SLA, breach messages, dimensions, etc.
    platform_metadata = Column(JSONB, nullable=True, server_default=text("'{}'::jsonb"))

    # Timestamp
    scraped_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    # Composite indexes for fast analytical & timeseries queries
    __table_args__ = (
        Index(
            "ix_inventory_snapshots_lookup",
            "platform",
            "pincode",
            "sku_id",
            "scraped_at",
        ),
        Index(
            "ix_inventory_snapshots_dark_store",
            "platform",
            "dark_store_id",
            "sku_id",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<InventorySnapshot(platform='{self.platform}', "
            f"parent_product_name='{self.parent_product_name}', "
            f"title='{self.title}', "
            f"sku_id='{self.sku_id}', "
            f"store='{self.dark_store_id}', "
            f"stock={self.in_stock}, "
            f"scraped_at={self.scraped_at})>"
        )