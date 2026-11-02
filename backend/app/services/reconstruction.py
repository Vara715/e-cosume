import logging
from datetime import datetime, date, time, timedelta, timezone
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from backend.app.models.generation import ActualGeneration, ForecastGeneration
from backend.app.schemas.analytics import IntervalComparison
from backend.app.schemas.generation import ForecastHistoryItem, ForecastHistoryResponse
from backend.app.utils.datetime_utils import ensure_utc, to_iso_utc

logger = logging.getLogger(__name__)


class ReconstructionService:
    def __init__(self, db: Session):
        self.db = db

    def get_cutoff_datetime(self, delivery_date: date, cutoff_time_str: str = "11:00") -> datetime:
        """
        Compute the cutoff datetime on D-1 in UTC.
        Default is 11:00 GMT on D-1.
        """
        try:
            parts = cutoff_time_str.strip().split(":")
            ch, cm = int(parts[0]), int(parts[1])
        except (ValueError, IndexError):
            ch, cm = 11, 0

        d_minus_1 = delivery_date - timedelta(days=1)
        return datetime(d_minus_1.year, d_minus_1.month, d_minus_1.day, ch, cm, tzinfo=timezone.utc)

    def reconstruct_day_ahead(
        self,
        start_date: date,
        end_date: date,
        cutoff_time_str: str = "11:00"
    ) -> List[IntervalComparison]:
        """
        Reconstruct the day-ahead forecast for each hour in [start_date, end_date],
        pair it with actual hourly-averaged generation, and calculate forecast errors.
        """
        # Fetch all actuals in range
        range_start_utc = datetime(start_date.year, start_date.month, start_date.day, 0, 0, tzinfo=timezone.utc)
        range_end_utc = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, tzinfo=timezone.utc)

        actual_rows = (
            self.db.query(ActualGeneration)
            .filter(and_(ActualGeneration.start_time >= range_start_utc, ActualGeneration.start_time <= range_end_utc))
            .filter(ActualGeneration.fuel_type == "WIND")
            .all()
        )

        # Aggregate half-hourly actuals into hourly average
        # Key: (date, hour)
        actuals_by_hour: Dict[Tuple[date, int], List[float]] = {}
        for row in actual_rows:
            st = ensure_utc(row.start_time)
            dt_key = (st.date(), st.hour)
            actuals_by_hour.setdefault(dt_key, []).append(row.generation_mw)

        # Iterate through each delivery date and reconstruct eligible forecasts
        curr_date = start_date
        comparison_results: List[IntervalComparison] = []

        while curr_date <= end_date:
            cutoff_dt = self.get_cutoff_datetime(curr_date, cutoff_time_str)
            day_start = datetime(curr_date.year, curr_date.month, curr_date.day, 0, 0, tzinfo=timezone.utc)
            day_end = datetime(curr_date.year, curr_date.month, curr_date.day, 23, 59, 59, tzinfo=timezone.utc)

            # Query all forecasts for this delivery date published on or before D-1 cutoff
            eligible_fcsts = (
                self.db.query(ForecastGeneration)
                .filter(and_(ForecastGeneration.start_time >= day_start, ForecastGeneration.start_time <= day_end))
                .filter(ForecastGeneration.publish_time <= cutoff_dt)
                .order_by(ForecastGeneration.start_time.asc(), ForecastGeneration.publish_time.asc())
                .all()
            )

            # Group by hour and take the latest published version before cutoff
            selected_by_hour: Dict[int, ForecastGeneration] = {}
            for fcst in eligible_fcsts:
                st = ensure_utc(fcst.start_time)
                hr = st.hour
                selected_by_hour[hr] = fcst  # Since query was ordered by publish_time ASC, the last one seen is the latest eligible

            # Produce 24 hourly intervals for curr_date
            for hr in range(24):
                interval_start = datetime(curr_date.year, curr_date.month, curr_date.day, hr, 0, tzinfo=timezone.utc)
                dt_key = (curr_date, hr)
                
                # Actual generation: average of settlement periods in this hour
                act_list = actuals_by_hour.get(dt_key, [])
                if act_list:
                    act_mw = round(sum(act_list) / len(act_list), 2)
                else:
                    # If actual generation is missing
                    act_mw = None

                fcst_obj = selected_by_hour.get(hr)
                if fcst_obj is not None:
                    fcst_mw = round(fcst_obj.generation_mw, 2)
                    pub_time = ensure_utc(fcst_obj.publish_time)
                else:
                    fcst_mw = None
                    pub_time = None

                # Compute metrics if both exist
                if act_mw is not None and fcst_mw is not None:
                    delta = round(fcst_mw - act_mw, 2)
                    abs_err = round(abs(delta), 2)
                    pct_err = round((abs_err / act_mw) * 100, 2) if act_mw > 0 else None
                    under_procured = delta > 0   # Over-forecasted wind -> thermal volume shortfall
                    over_procured = delta < 0    # Under-forecasted wind -> thermal volume surplus

                    comparison_results.append(
                        IntervalComparison(
                            start_time=interval_start,
                            settlement_date=curr_date.strftime("%Y-%m-%d"),
                            hour=hr,
                            actual_mw=act_mw,
                            forecast_mw=fcst_mw,
                            publish_time=pub_time,
                            delta_mw=delta,
                            abs_error_mw=abs_err,
                            pct_error=pct_err,
                            under_procured=under_procured,
                            over_procured=over_procured
                        )
                    )

            curr_date += timedelta(days=1)

        return comparison_results

    def get_forecast_history(self, target_time: datetime, cutoff_time_str: str = "11:00") -> ForecastHistoryResponse:
        """
        Inspect all historical publications for a specific delivery hour.
        Clearly tags which publication was the eligible day-ahead forecast.
        """
        target_utc = ensure_utc(target_time)
        delivery_date = target_utc.date()
        cutoff_dt = self.get_cutoff_datetime(delivery_date, cutoff_time_str)

        all_fcsts = (
            self.db.query(ForecastGeneration)
            .filter(ForecastGeneration.start_time == target_utc)
            .order_by(ForecastGeneration.publish_time.asc())
            .all()
        )

        revisions: List[ForecastHistoryItem] = []
        eligible_candidates: List[ForecastGeneration] = []

        for f in all_fcsts:
            pt = ensure_utc(f.publish_time)
            is_eligible = pt <= cutoff_dt
            if is_eligible:
                eligible_candidates.append(f)
            
            lead_hours = round((target_utc - pt).total_seconds() / 3600.0, 1)
            revisions.append(
                ForecastHistoryItem(
                    publish_time=pt,
                    target_time=target_utc,
                    generation_mw=round(f.generation_mw, 2),
                    lead_time_hours=lead_hours,
                    is_eligible_day_ahead=is_eligible,
                    cutoff_used=cutoff_time_str
                )
            )

        # Selected day-ahead publication is the latest among eligible
        selected_fcst = eligible_candidates[-1] if eligible_candidates else None

        # Fetch actual if present
        actual_rows = (
            self.db.query(ActualGeneration)
            .filter(
                and_(
                    ActualGeneration.start_time >= target_utc,
                    ActualGeneration.start_time < target_utc + timedelta(hours=1)
                )
            )
            .filter(ActualGeneration.fuel_type == "WIND")
            .all()
        )
        actual_mw = (
            round(sum(r.generation_mw for r in actual_rows) / len(actual_rows), 2)
            if actual_rows else None
        )

        return ForecastHistoryResponse(
            target_time=target_utc,
            selected_day_ahead_mw=round(selected_fcst.generation_mw, 2) if selected_fcst else None,
            selected_publish_time=ensure_utc(selected_fcst.publish_time) if selected_fcst else None,
            actual_mw=actual_mw,
            revisions=revisions
        )
