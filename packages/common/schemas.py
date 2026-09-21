from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class ItemBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    platform: str
    price: float
    unit: Optional[str] = None
    in_stock: bool = True
    updated_at: Optional[datetime] = None
