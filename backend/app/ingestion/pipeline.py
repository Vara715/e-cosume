import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from dateutil.parser import isoparse
from sqlalchemy.orm import Session
from sqlalchemy import and_

from backend.app.core.config import settings
from backend.app.core.database import SessionLocal, init_db
from backend.app.models.generation import ActualGeneration, ForecastGeneration
from backend.app.models.ingestion import IngestionRun
from backend.app.ingestion.elexon_client import ElexonClient
from backend.app.utils.datetime_utils import ensure_utc

logger = logging.getLogger(__name__)


class IngestionPipeline:
    def __init__(self, db: Session, client: ElexonClient = None):
        self.db = db
        self.client = client or ElexonClient(base_url=settings.ELEXON_BASE_URL)

    def ingest_actuals_range(self, start_dt: datetime, end_dt: datetime, chunk_days: int = 5) -> Dict[str, Any]:
        """
        Ingest actual wind generation from FUELHH dataset in sliding chunks.
        Logs to IngestionRun.
        """
        start_utc = ensure_utc(start_dt)
        end_utc = ensure_utc(end_dt)

        run = IngestionRun(
            dataset="FUELHH",
            range_start=start_utc,
            range_end=end_utc,
            status="RUNNING"
        )
        self.db.add(run)
        self.db.commit()

        total_received = 0
        total_inserted = 0

        curr_start = start_utc
        try:
            while curr_start < end_utc:
                curr_end = min(curr_start + timedelta(days=chunk_days), end_utc)
                logger.info(f"Ingesting FUELHH from {curr_start} to {curr_end}")
                
                raw_items = self.client.fetch_fuelhh(curr_start, curr_end, fuel_type="WIND")
                total_received += len(raw_items)

                if raw_items:
                    inserted = self._insert_actuals_batch(raw_items)
                    total_inserted += inserted

                curr_start = curr_end

            run.status = "SUCCESS"
            run.records_received = total_received
            run.records_inserted = total_inserted
            run.completed_at = datetime.now(timezone.utc)
            self.db.commit()

            return {
                "status": "SUCCESS",
                "received": total_received,
                "inserted": total_inserted,
                "dataset": "FUELHH"
            }

        except Exception as e:
            logger.error(f"FUELHH ingestion failed: {e}", exc_info=True)
            self.db.rollback()
            run.status = "FAILED"
            run.error_message = str(e)
            run.completed_at = datetime.now(timezone.utc)
            self.db.commit()
            raise

    def ingest_forecasts_range(self, start_dt: datetime, end_dt: datetime, chunk_days: int = 3) -> Dict[str, Any]:
        """
        Ingest forecast wind generation from WINDFOR dataset in sliding chunks.
        Logs to IngestionRun.
        """
        start_utc = ensure_utc(start_dt)
        end_utc = ensure_utc(end_dt)

        run = IngestionRun(
            dataset="WINDFOR",
            range_start=start_utc,
            range_end=end_utc,
            status="RUNNING"
        )
        self.db.add(run)
        self.db.commit()

        total_received = 0
        total_inserted = 0

        curr_start = start_utc
        try:
            while curr_start < end_utc:
                curr_end = min(curr_start + timedelta(days=chunk_days), end_utc)
                logger.info(f"Ingesting WINDFOR from {curr_start} to {curr_end}")
                
                raw_items = self.client.fetch_windfor(curr_start, curr_end)
                total_received += len(raw_items)

                if raw_items:
                    inserted = self._insert_forecasts_batch(raw_items)
                    total_inserted += inserted

                curr_start = curr_end

            run.status = "SUCCESS"
            run.records_received = total_received
            run.records_inserted = total_inserted
            run.completed_at = datetime.now(timezone.utc)
            self.db.commit()

            return {
                "status": "SUCCESS",
                "received": total_received,
                "inserted": total_inserted,
                "dataset": "WINDFOR"
            }

        except Exception as e:
            logger.error(f"WINDFOR ingestion failed: {e}", exc_info=True)
            self.db.rollback()
            run.status = "FAILED"
            run.error_message = str(e)
            run.completed_at = datetime.now(timezone.utc)
            self.db.commit()
            raise

    def _insert_actuals_batch(self, raw_items: List[Dict[str, Any]]) -> int:
        parsed_records = []
        for item in raw_items:
            try:
                st = ensure_utc(isoparse(item["startTime"]))
                pt = ensure_utc(isoparse(item["publishTime"]))
                sp = int(item.get("settlementPeriod", 0))
                sdate = str(item.get("settlementDate", st.strftime("%Y-%m-%d")))
                gen = float(item["generation"])
                fuel = str(item.get("fuelType", "WIND")).upper()

                parsed_records.append({
                    "start_time": st,
                    "publish_time": pt,
                    "settlement_period": sp,
                    "settlement_date": sdate,
                    "generation_mw": gen,
                    "fuel_type": fuel
                })
            except (KeyError, ValueError, TypeError) as parse_err:
                logger.debug(f"Skipping malformed FUELHH record: {parse_err}")
                continue

        if not parsed_records:
            return 0

        # Query existing keys in this range, normalizing them to UTC
        min_st = min(r["start_time"] for r in parsed_records)
        max_st = max(r["start_time"] for r in parsed_records)
        existing_rows = (
            self.db.query(ActualGeneration.start_time, ActualGeneration.fuel_type)
            .filter(and_(ActualGeneration.start_time >= min_st, ActualGeneration.start_time <= max_st))
            .all()
        )
        existing = {
            (ensure_utc(row[0]), str(row[1]).upper())
            for row in existing_rows
        }

        seen_in_batch = set()
        to_insert = []
        for r in parsed_records:
            key = (r["start_time"], r["fuel_type"])
            if key not in existing and key not in seen_in_batch:
                seen_in_batch.add(key)
                to_insert.append(
                    ActualGeneration(
                        start_time=r["start_time"],
                        publish_time=r["publish_time"],
                        settlement_period=r["settlement_period"],
                        settlement_date=r["settlement_date"],
                        generation_mw=r["generation_mw"],
                        fuel_type=r["fuel_type"]
                    )
                )

        if to_insert:
            self.db.bulk_save_objects(to_insert)
            self.db.commit()

        return len(to_insert)

    def _insert_forecasts_batch(self, raw_items: List[Dict[str, Any]]) -> int:
        parsed_records = []
        for item in raw_items:
            try:
                st = ensure_utc(isoparse(item["startTime"]))
                pt = ensure_utc(isoparse(item["publishTime"]))
                gen = float(item["generation"])
                dataset = str(item.get("dataset", "WINDFOR"))

                parsed_records.append({
                    "start_time": st,
                    "publish_time": pt,
                    "generation_mw": gen,
                    "dataset": dataset
                })
            except (KeyError, ValueError, TypeError) as parse_err:
                logger.debug(f"Skipping malformed WINDFOR record: {parse_err}")
                continue

        if not parsed_records:
            return 0

        # Query existing (start_time, publish_time) normalized to UTC
        min_pt = min(r["publish_time"] for r in parsed_records)
        max_pt = max(r["publish_time"] for r in parsed_records)
        existing_rows = (
            self.db.query(ForecastGeneration.start_time, ForecastGeneration.publish_time)
            .filter(and_(ForecastGeneration.publish_time >= min_pt, ForecastGeneration.publish_time <= max_pt))
            .all()
        )
        existing = {
            (ensure_utc(row[0]), ensure_utc(row[1]))
            for row in existing_rows
        }

        seen_in_batch = set()
        to_insert = []
        for r in parsed_records:
            key = (r["start_time"], r["publish_time"])
            if key not in existing and key not in seen_in_batch:
                seen_in_batch.add(key)
                to_insert.append(
                    ForecastGeneration(
                        start_time=r["start_time"],
                        publish_time=r["publish_time"],
                        generation_mw=r["generation_mw"],
                        dataset=r["dataset"]
                    )
                )

        if to_insert:
            self.db.bulk_save_objects(to_insert)
            self.db.commit()

        return len(to_insert)


def run_january_2026_ingestion():
    init_db()
    db = SessionLocal()
    pipeline = IngestionPipeline(db)

    logger.info("=== Starting Complete January 2026 Ingestion ===")
    
    # Ingest Actuals for entire month of January 2026 (SP 1 Jan 1 to SP 48 Jan 31)
    act_res = pipeline.ingest_actuals_range(
        start_dt=datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc),
        end_dt=datetime(2026, 2, 1, 0, 0, tzinfo=timezone.utc),
        chunk_days=5
    )
    logger.info(f"Actuals ingestion result: {act_res}")

    # Ingest Forecasts (starts Dec 28, 2025 to capture day-ahead publications for Jan 1)
    fcst_res = pipeline.ingest_forecasts_range(
        start_dt=datetime(2025, 12, 28, 0, 0, tzinfo=timezone.utc),
        end_dt=datetime(2026, 2, 1, 0, 0, tzinfo=timezone.utc),
        chunk_days=4
    )
    logger.info(f"Forecasts ingestion result: {fcst_res}")

    db.close()
    return {"actuals": act_res, "forecasts": fcst_res}


if __name__ == "__main__":
    run_january_2026_ingestion()
