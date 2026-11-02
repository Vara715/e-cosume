from datetime import datetime
from pydantic import BaseModel, Field
from typing import List


class ScenarioRequest(BaseModel):
    base_demand_mw: float = Field(default=32000.0, ge=1000.0, le=70000.0, description="Hypothetical baseline customer demand in MW")
    start_date: str = Field(default="2026-01-01", description="Start date (YYYY-MM-DD)")
    end_date: str = Field(default="2026-01-31", description="End date (YYYY-MM-DD)")
    cutoff_time: str = Field(default="11:00", description="Day-ahead cutoff time (HH:MM)")


class ScenarioInterval(BaseModel):
    start_time: datetime
    base_demand_mw: float
    forecast_wind_mw: float
    actual_wind_mw: float
    planned_residual_mw: float  # demand - forecast_wind
    actual_residual_mw: float   # demand - actual_wind
    imbalance_mw: float         # forecast_wind - actual_wind
    exposure_type: str          # "SHORTFALL_RISK" (under-procured) or "SURPLUS_RISK" (over-procured) or "BALANCED"


class ScenarioSummary(BaseModel):
    base_demand_mw: float
    total_shortfall_mwh: float
    total_surplus_mwh: float
    max_shortfall_mw: float
    max_surplus_mw: float
    shortfall_intervals: int
    surplus_intervals: int
    disclaimer: str
    intervals: List[ScenarioInterval]
