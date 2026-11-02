import pytest
from datetime import datetime, date, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.core.database import Base
from backend.app.models.generation import ActualGeneration, ForecastGeneration
from backend.app.services.reconstruction import ReconstructionService


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_day_ahead_selection_excludes_future_publications(test_db):
    """
    CRITICAL TEST:
    Delivery interval: 2026-01-15 14:00:00 UTC.
    Day D = 2026-01-15.
    Day-Ahead Cutoff on D-1 (2026-01-14) at 11:00 UTC.

    Publications:
    - 2026-01-14 06:00 UTC -> 3,000 MW (eligible)
    - 2026-01-14 09:30 UTC -> 3,400 MW (eligible, latest before 11:00 cutoff)
    - 2026-01-14 11:30 UTC -> 3,800 MW (EXCLUDED: after 11:00 cutoff)
    - 2026-01-14 16:00 UTC -> 4,000 MW (EXCLUDED: after 11:00 cutoff)
    - 2026-01-15 08:00 UTC -> 4,500 MW (EXCLUDED: intraday on delivery day)

    Actual:
    - 2026-01-15 14:00 UTC -> 3,200 MW
    - 2026-01-15 14:30 UTC -> 3,400 MW
    -> Hourly average actual = 3,300 MW
    """
    target_dt = datetime(2026, 1, 15, 14, 0, tzinfo=timezone.utc)
    d_minus_1 = date(2026, 1, 14)

    # Insert forecasts
    fcsts = [
        ForecastGeneration(start_time=target_dt, publish_time=datetime(2026, 1, 14, 6, 0, tzinfo=timezone.utc), generation_mw=3000.0),
        ForecastGeneration(start_time=target_dt, publish_time=datetime(2026, 1, 14, 9, 30, tzinfo=timezone.utc), generation_mw=3400.0),
        ForecastGeneration(start_time=target_dt, publish_time=datetime(2026, 1, 14, 11, 30, tzinfo=timezone.utc), generation_mw=3800.0),
        ForecastGeneration(start_time=target_dt, publish_time=datetime(2026, 1, 14, 16, 0, tzinfo=timezone.utc), generation_mw=4000.0),
        ForecastGeneration(start_time=target_dt, publish_time=datetime(2026, 1, 15, 8, 0, tzinfo=timezone.utc), generation_mw=4500.0),
    ]
    test_db.bulk_save_objects(fcsts)

    # Insert half-hourly actuals
    acts = [
        ActualGeneration(start_time=target_dt, settlement_period=29, settlement_date="2026-01-15", generation_mw=3200.0, fuel_type="WIND", publish_time=datetime(2026, 1, 15, 14, 30, tzinfo=timezone.utc)),
        ActualGeneration(start_time=target_dt + timedelta(minutes=30), settlement_period=30, settlement_date="2026-01-15", generation_mw=3400.0, fuel_type="WIND", publish_time=datetime(2026, 1, 15, 15, 0, tzinfo=timezone.utc)),
    ]
    test_db.bulk_save_objects(acts)
    test_db.commit()

    service = ReconstructionService(test_db)
    results = service.reconstruct_day_ahead(
        start_date=date(2026, 1, 15),
        end_date=date(2026, 1, 15),
        cutoff_time_str="11:00"
    )

    interval_14 = next(r for r in results if r.hour == 14)
    assert interval_14 is not None

    # Verify latest eligible forecast before 11:00 cutoff was selected (3400 MW at 09:30)
    assert interval_14.forecast_mw == 3400.0
    assert interval_14.publish_time == datetime(2026, 1, 14, 9, 30, tzinfo=timezone.utc)

    # Verify actual is correctly averaged: (3200 + 3400) / 2 = 3300.0
    assert interval_14.actual_mw == 3300.0

    # Verify delta = forecast - actual = 3400 - 3300 = +100 MW
    assert interval_14.delta_mw == 100.0
    assert interval_14.under_procured is True  # Over-forecasted wind -> shortfall risk


def test_reconstruction_with_alternative_cutoff(test_db):
    """
    Test that changing cutoff from 11:00 to 17:00 correctly selects the 16:00 publication.
    """
    target_dt = datetime(2026, 1, 15, 14, 0, tzinfo=timezone.utc)

    fcsts = [
        ForecastGeneration(start_time=target_dt, publish_time=datetime(2026, 1, 14, 9, 30, tzinfo=timezone.utc), generation_mw=3400.0),
        ForecastGeneration(start_time=target_dt, publish_time=datetime(2026, 1, 14, 16, 0, tzinfo=timezone.utc), generation_mw=4000.0),
        ForecastGeneration(start_time=target_dt, publish_time=datetime(2026, 1, 15, 8, 0, tzinfo=timezone.utc), generation_mw=4500.0),
    ]
    test_db.bulk_save_objects(fcsts)

    acts = [
        ActualGeneration(start_time=target_dt, settlement_period=29, settlement_date="2026-01-15", generation_mw=3200.0, fuel_type="WIND", publish_time=datetime(2026, 1, 15, 14, 30, tzinfo=timezone.utc)),
    ]
    test_db.bulk_save_objects(acts)
    test_db.commit()

    service = ReconstructionService(test_db)
    
    # 17:00 cutoff should select the 16:00 publication (4000 MW)
    res_17 = service.reconstruct_day_ahead(
        start_date=date(2026, 1, 15),
        end_date=date(2026, 1, 15),
        cutoff_time_str="17:00"
    )
    item_17 = next(r for r in res_17 if r.hour == 14)
    assert item_17.forecast_mw == 4000.0
    assert item_17.publish_time == datetime(2026, 1, 14, 16, 0, tzinfo=timezone.utc)


def test_forecast_history_tracking(test_db):
    """
    Verify get_forecast_history returns all revisions and marks cutoff eligibility correctly.
    """
    target_dt = datetime(2026, 1, 15, 10, 0, tzinfo=timezone.utc)

    fcsts = [
        ForecastGeneration(start_time=target_dt, publish_time=datetime(2026, 1, 13, 10, 0, tzinfo=timezone.utc), generation_mw=2000.0),
        ForecastGeneration(start_time=target_dt, publish_time=datetime(2026, 1, 14, 8, 0, tzinfo=timezone.utc), generation_mw=2500.0),
        ForecastGeneration(start_time=target_dt, publish_time=datetime(2026, 1, 14, 14, 0, tzinfo=timezone.utc), generation_mw=2800.0),
    ]
    test_db.bulk_save_objects(fcsts)
    test_db.commit()

    service = ReconstructionService(test_db)
    hist = service.get_forecast_history(target_dt, cutoff_time_str="11:00")

    assert len(hist.revisions) == 3
    assert hist.selected_day_ahead_mw == 2500.0
    assert hist.selected_publish_time == datetime(2026, 1, 14, 8, 0, tzinfo=timezone.utc)

    rev_dict = {r.publish_time: r.is_eligible_day_ahead for r in hist.revisions}
    assert rev_dict[datetime(2026, 1, 13, 10, 0, tzinfo=timezone.utc)] is True
    assert rev_dict[datetime(2026, 1, 14, 8, 0, tzinfo=timezone.utc)] is True
    assert rev_dict[datetime(2026, 1, 14, 14, 0, tzinfo=timezone.utc)] is False
