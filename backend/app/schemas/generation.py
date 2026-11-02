from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional, List


class ActualRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    start_time: datetime
    settlement_period: int
    settlement_date: str
    fuel_type: str
    generation_mw: float
    publish_time: datetime


class ForecastRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    start_time: datetime
    publish_time: datetime
    generation_mw: float
    dataset: str


class ForecastHistoryItem(BaseModel):
    publish_time: datetime
    target_time: datetime
    generation_mw: float
    lead_time_hours: float
    is_eligible_day_ahead: bool
    cutoff_used: str


class ForecastHistoryResponse(BaseModel):
    target_time: datetime
    selected_day_ahead_mw: Optional[float]
    selected_publish_time: Optional[datetime]
    actual_mw: Optional[float]
    revisions: List[ForecastHistoryItem]
