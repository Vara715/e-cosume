import logging
from datetime import date, datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.generation import ActualGeneration, ForecastGeneration
from backend.app.models.ingestion import IngestionRun
from backend.app.schemas.analytics import (
    IntervalComparison,
    AccuracySummary,
    OverviewResponse,
)
from backend.app.schemas.generation import ForecastHistoryResponse
from backend.app.schemas.scenario import ScenarioRequest, ScenarioSummary
from backend.app.services.reconstruction import ReconstructionService
from backend.app.services.analytics import AnalyticsService
from backend.app.services.scenario import ScenarioService
from backend.app.ingestion.pipeline import IngestionPipeline, run_january_2026_ingestion

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        act_count = db.query(ActualGeneration).count()
        fcst_count = db.query(ForecastGeneration).count()
        return {
            "status": "healthy",
            "db_connected": True,
            "total_actual_records": act_count,
            "total_forecast_records": fcst_count,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "degraded",
            "db_connected": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }


@router.get("/metadata")
def get_metadata(db: Session = Depends(get_db)):
    """System metadata, available date bounds, and configured cutoffs."""
    act_min = db.query(func.min(ActualGeneration.start_time)).scalar()
    act_max = db.query(func.max(ActualGeneration.start_time)).scalar()
    fcst_min = db.query(func.min(ForecastGeneration.start_time)).scalar()
    fcst_max = db.query(func.max(ForecastGeneration.start_time)).scalar()
    latest_run = db.query(IngestionRun).order_by(IngestionRun.started_at.desc()).first()

    return {
        "dataset_target": "e-consumption (January 2026 UK Wind Generation)",
        "default_cutoff_time": settings.DEFAULT_CUTOFF_TIME,
        "supported_cutoffs": ["09:00", "10:00", "11:00", "12:00", "16:00", "17:00"],
        "actuals_range": {
            "start": act_min.isoformat() if act_min else None,
            "end": act_max.isoformat() if act_max else None,
            "total_count": db.query(ActualGeneration).count()
        },
        "forecasts_range": {
            "start": fcst_min.isoformat() if fcst_min else None,
            "end": fcst_max.isoformat() if fcst_max else None,
            "total_count": db.query(ForecastGeneration).count()
        },
        "last_ingestion": {
            "dataset": latest_run.dataset if latest_run else None,
            "status": latest_run.status if latest_run else None,
            "started_at": latest_run.started_at.isoformat() if latest_run and latest_run.started_at else None
        }
    }


@router.get("/overview", response_model=OverviewResponse)
def get_overview(
    delivery_date: str = Query("2026-01-15", description="Delivery date YYYY-MM-DD"),
    cutoff_time: str = Query("11:00", description="Cutoff time HH:MM"),
    db: Session = Depends(get_db)
):
    try:
        d = date.fromisoformat(delivery_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    recon = ReconstructionService(db)
    analytics = AnalyticsService(recon)
    return analytics.get_overview_data(d, cutoff_time)


@router.get("/comparison", response_model=List[IntervalComparison])
def get_comparison(
    start_date: str = Query("2026-01-01", description="Start date YYYY-MM-DD"),
    end_date: str = Query("2026-01-31", description="End date YYYY-MM-DD"),
    cutoff_time: str = Query("11:00", description="Cutoff time HH:MM"),
    db: Session = Depends(get_db)
):
    try:
        s = date.fromisoformat(start_date)
        e = date.fromisoformat(end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    if s > e:
        raise HTTPException(status_code=400, detail="start_date must be before or equal to end_date.")

    recon = ReconstructionService(db)
    return recon.reconstruct_day_ahead(s, e, cutoff_time)


@router.get("/accuracy", response_model=AccuracySummary)
def get_accuracy(
    start_date: str = Query("2026-01-01", description="Start date YYYY-MM-DD"),
    end_date: str = Query("2026-01-31", description="End date YYYY-MM-DD"),
    cutoff_time: str = Query("11:00", description="Cutoff time HH:MM"),
    db: Session = Depends(get_db)
):
    try:
        s = date.fromisoformat(start_date)
        e = date.fromisoformat(end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    recon = ReconstructionService(db)
    analytics = AnalyticsService(recon)
    return analytics.compute_accuracy_summary(s, e, cutoff_time)


@router.get("/forecasts/history", response_model=ForecastHistoryResponse)
def get_forecast_history(
    target_time: str = Query(..., description="Target delivery timestamp (ISO 8601, e.g. 2026-01-15T12:00:00Z)"),
    cutoff_time: str = Query("11:00", description="Cutoff time HH:MM"),
    db: Session = Depends(get_db)
):
    from dateutil.parser import isoparse
    try:
        t = isoparse(target_time)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid target_time ISO timestamp.")

    recon = ReconstructionService(db)
    return recon.get_forecast_history(t, cutoff_time)


@router.post("/scenario/simulate", response_model=ScenarioSummary)
def simulate_scenario(
    req: ScenarioRequest,
    db: Session = Depends(get_db)
):
    recon = ReconstructionService(db)
    scenario_svc = ScenarioService(recon)
    return scenario_svc.simulate(req)


@router.get("/ingestion/runs")
def list_ingestion_runs(db: Session = Depends(get_db), limit: int = 20):
    runs = db.query(IngestionRun).order_by(IngestionRun.started_at.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "dataset": r.dataset,
            "status": r.status,
            "records_received": r.records_received,
            "records_inserted": r.records_inserted,
            "error_message": r.error_message,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        }
        for r in runs
    ]


@router.post("/ingestion/trigger")
def trigger_ingestion(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_january_2026_ingestion)
    return {"message": "January 2026 data ingestion scheduled in background."}
