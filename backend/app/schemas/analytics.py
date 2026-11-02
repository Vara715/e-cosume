from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List


class IntervalComparison(BaseModel):
    start_time: datetime
    settlement_date: str
    hour: int
    actual_mw: float
    forecast_mw: float
    publish_time: datetime
    delta_mw: float  # Forecast - Actual
    abs_error_mw: float
    pct_error: Optional[float] = None
    under_procured: bool  # Forecast > Actual: shortfall risk
    over_procured: bool   # Forecast < Actual: surplus risk


class DailyAccuracyItem(BaseModel):
    date: str
    mae: float
    rmse: float
    wape: Optional[float] = None
    bias: float
    sample_count: int
    actual_avg_mw: float
    forecast_avg_mw: float


class HourlyAccuracyItem(BaseModel):
    hour: int
    mae: float
    rmse: float
    wape: Optional[float] = None
    bias: float
    sample_count: int


class ErrorDistributionBin(BaseModel):
    bin_label: str
    bin_start: float
    bin_end: float
    count: int
    percentage: float


class AccuracySummary(BaseModel):
    mae: float
    rmse: float
    wape: Optional[float]
    bias: float
    max_absolute_error: float
    median_absolute_error: float
    sample_size: int
    expected_intervals: int
    completeness_pct: float
    start_date: str
    end_date: str
    cutoff_time: str
    daily_metrics: List[DailyAccuracyItem]
    hourly_metrics: List[HourlyAccuracyItem]
    error_distribution: List[ErrorDistributionBin]


class OverviewResponse(BaseModel):
    delivery_date: str
    cutoff_time: str
    latest_eligible_publish: Optional[datetime]
    avg_forecast_mw: float
    peak_forecast_mw: float
    actual_avg_mw: Optional[float]
    actual_peak_mw: Optional[float]
    daily_mae: Optional[float]
    daily_bias: Optional[float]
    completeness_pct: float
    intervals: List[IntervalComparison]
