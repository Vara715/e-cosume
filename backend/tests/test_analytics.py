import pytest
import math
from datetime import datetime, date, timezone
from unittest.mock import MagicMock

from backend.app.schemas.analytics import IntervalComparison
from backend.app.services.analytics import AnalyticsService


def make_interval(hour: int, act: float, fcst: float, dt_str: str = "2026-01-15") -> IntervalComparison:
    delta = round(fcst - act, 2)
    abs_err = round(abs(delta), 2)
    return IntervalComparison(
        start_time=datetime(2026, 1, 15, hour, 0, tzinfo=timezone.utc),
        settlement_date=dt_str,
        hour=hour,
        actual_mw=act,
        forecast_mw=fcst,
        publish_time=datetime(2026, 1, 14, 9, 30, tzinfo=timezone.utc),
        delta_mw=delta,
        abs_error_mw=abs_err,
        pct_error=round((abs_err / act) * 100, 2) if act > 0 else None,
        under_procured=delta > 0,
        over_procured=delta < 0
    )


def test_deterministic_metric_calculations():
    """
    Synthetic dataset with hand-verified mathematical outcomes:
    actuals = [1000, 2000, 3000, 4000]
    forecasts = [1100, 1900, 3300, 4000]
    deltas = [+100, -100, +300, 0]
    abs_errors = [100, 100, 300, 0]

    Expected:
    MAE = (100 + 100 + 300 + 0) / 4 = 125.0
    RMSE = sqrt((10000 + 10000 + 90000 + 0) / 4) = sqrt(27500) = 165.83
    WAPE = (500 / 10000) * 100 = 5.0%
    Bias = (+100 - 100 + 300 + 0) / 4 = +75.0
    Max AE = 300.0
    Median AE = 100.0
    """
    mock_recon = MagicMock()
    mock_recon.reconstruct_day_ahead.return_value = [
        make_interval(0, 1000.0, 1100.0),
        make_interval(1, 2000.0, 1900.0),
        make_interval(2, 3000.0, 3300.0),
        make_interval(3, 4000.0, 4000.0),
    ]

    service = AnalyticsService(mock_recon)
    summary = service.compute_accuracy_summary(date(2026, 1, 15), date(2026, 1, 15))

    assert summary.mae == 125.0
    assert summary.rmse == pytest.approx(165.83, 0.01)
    assert summary.wape == 5.0
    assert summary.bias == 75.0
    assert summary.max_absolute_error == 300.0
    assert summary.median_absolute_error == 100.0
    assert summary.sample_size == 4


def test_zero_actual_generation_wape_safety():
    """
    Ensure zero denominator in WAPE does not raise ZeroDivisionError and sets wape to None.
    """
    mock_recon = MagicMock()
    mock_recon.reconstruct_day_ahead.return_value = [
        make_interval(0, 0.0, 50.0),
        make_interval(1, 0.0, 30.0),
    ]

    service = AnalyticsService(mock_recon)
    summary = service.compute_accuracy_summary(date(2026, 1, 15), date(2026, 1, 15))

    assert summary.wape is None
    assert summary.mae == 40.0
    assert summary.bias == 40.0


def test_systematic_under_forecasting_bias():
    """
    All forecasts lower than actuals -> negative bias (over-procurement / surplus risk).
    """
    mock_recon = MagicMock()
    mock_recon.reconstruct_day_ahead.return_value = [
        make_interval(0, 5000.0, 4500.0),  # -500
        make_interval(1, 6000.0, 5700.0),  # -300
    ]

    service = AnalyticsService(mock_recon)
    summary = service.compute_accuracy_summary(date(2026, 1, 15), date(2026, 1, 15))

    assert summary.bias == -400.0
    assert summary.mae == 400.0
