import math
import logging
from datetime import date, datetime
from typing import List, Dict, Optional
import numpy as np

from backend.app.schemas.analytics import (
    IntervalComparison,
    DailyAccuracyItem,
    HourlyAccuracyItem,
    ErrorDistributionBin,
    AccuracySummary,
    OverviewResponse,
)
from backend.app.services.reconstruction import ReconstructionService

logger = logging.getLogger(__name__)


class AnalyticsService:
    def __init__(self, recon_service: ReconstructionService):
        self.recon_service = recon_service

    def compute_accuracy_summary(
        self,
        start_date: date,
        end_date: date,
        cutoff_time_str: str = "11:00"
    ) -> AccuracySummary:
        """
        Compute full accuracy metrics (MAE, RMSE, WAPE, Bias, Distribution, Diurnal)
        for reconstructed forecasts over [start_date, end_date].
        """
        intervals = self.recon_service.reconstruct_day_ahead(start_date, end_date, cutoff_time_str)

        total_days = (end_date - start_date).days + 1
        expected_intervals = total_days * 24
        sample_size = len(intervals)

        completeness_pct = (
            round((sample_size / expected_intervals) * 100, 2)
            if expected_intervals > 0 else 0.0
        )

        if not intervals:
            return AccuracySummary(
                mae=0.0,
                rmse=0.0,
                wape=None,
                bias=0.0,
                max_absolute_error=0.0,
                median_absolute_error=0.0,
                sample_size=0,
                expected_intervals=expected_intervals,
                completeness_pct=0.0,
                start_date=start_date.strftime("%Y-%m-%d"),
                end_date=end_date.strftime("%Y-%m-%d"),
                cutoff_time=cutoff_time_str,
                daily_metrics=[],
                hourly_metrics=[],
                error_distribution=[]
            )

        errors = np.array([item.delta_mw for item in intervals])
        abs_errors = np.abs(errors)
        actuals = np.array([item.actual_mw for item in intervals])

        mae = float(np.mean(abs_errors))
        rmse = float(np.sqrt(np.mean(errors ** 2)))
        bias = float(np.mean(errors))
        max_ae = float(np.max(abs_errors))
        med_ae = float(np.median(abs_errors))

        sum_actuals = float(np.sum(actuals))
        wape = float((np.sum(abs_errors) / sum_actuals) * 100) if sum_actuals > 0 else None

        # Daily breakdown
        daily_groups: Dict[str, List[IntervalComparison]] = {}
        for item in intervals:
            daily_groups.setdefault(item.settlement_date, []).append(item)

        daily_metrics: List[DailyAccuracyItem] = []
        for d_str in sorted(daily_groups.keys()):
            grp = daily_groups[d_str]
            d_err = np.array([x.delta_mw for x in grp])
            d_abs = np.abs(d_err)
            d_act = np.array([x.actual_mw for x in grp])
            d_fcst = np.array([x.forecast_mw for x in grp])

            d_mae = float(np.mean(d_abs))
            d_rmse = float(np.sqrt(np.mean(d_err ** 2)))
            d_bias = float(np.mean(d_err))
            d_sum_act = float(np.sum(d_act))
            d_wape = float((np.sum(d_abs) / d_sum_act) * 100) if d_sum_act > 0 else None

            daily_metrics.append(
                DailyAccuracyItem(
                    date=d_str,
                    mae=round(d_mae, 2),
                    rmse=round(d_rmse, 2),
                    wape=round(d_wape, 2) if d_wape is not None else None,
                    bias=round(d_bias, 2),
                    sample_count=len(grp),
                    actual_avg_mw=round(float(np.mean(d_act)), 2),
                    forecast_avg_mw=round(float(np.mean(d_fcst)), 2)
                )
            )

        # Hourly breakdown (Diurnal performance across 24 hours)
        hourly_groups: Dict[int, List[IntervalComparison]] = {}
        for item in intervals:
            hourly_groups.setdefault(item.hour, []).append(item)

        hourly_metrics: List[HourlyAccuracyItem] = []
        for hr in range(24):
            grp = hourly_groups.get(hr, [])
            if grp:
                h_err = np.array([x.delta_mw for x in grp])
                h_abs = np.abs(h_err)
                h_act = np.array([x.actual_mw for x in grp])

                h_mae = float(np.mean(h_abs))
                h_rmse = float(np.sqrt(np.mean(h_err ** 2)))
                h_bias = float(np.mean(h_err))
                h_sum_act = float(np.sum(h_act))
                h_wape = float((np.sum(h_abs) / h_sum_act) * 100) if h_sum_act > 0 else None

                hourly_metrics.append(
                    HourlyAccuracyItem(
                        hour=hr,
                        mae=round(h_mae, 2),
                        rmse=round(h_rmse, 2),
                        wape=round(h_wape, 2) if h_wape is not None else None,
                        bias=round(h_bias, 2),
                        sample_count=len(grp)
                    )
                )

        # Error distribution histogram (8 bins)
        # Bins: <-3000, -3000 to -1500, -1500 to -500, -500 to 0, 0 to 500, 500 to 1500, 1500 to 3000, >3000
        bin_edges = [-math.inf, -3000, -1500, -500, 0, 500, 1500, 3000, math.inf]
        bin_labels = [
            "< -3000 MW",
            "-3000 to -1500 MW",
            "-1500 to -500 MW",
            "-500 to 0 MW",
            "0 to +500 MW",
            "+500 to +1500 MW",
            "+1500 to +3000 MW",
            "> +3000 MW"
        ]
        
        hist_counts, _ = np.histogram(errors, bins=bin_edges)
        error_distribution: List[ErrorDistributionBin] = []
        for i in range(len(bin_labels)):
            c = int(hist_counts[i])
            pct = round((c / sample_size) * 100, 2) if sample_size > 0 else 0.0
            error_distribution.append(
                ErrorDistributionBin(
                    bin_label=bin_labels[i],
                    bin_start=-99999.0 if math.isinf(bin_edges[i]) else float(bin_edges[i]),
                    bin_end=99999.0 if math.isinf(bin_edges[i+1]) else float(bin_edges[i+1]),
                    count=c,
                    percentage=pct
                )
            )

        return AccuracySummary(
            mae=round(mae, 2),
            rmse=round(rmse, 2),
            wape=round(wape, 2) if wape is not None else None,
            bias=round(bias, 2),
            max_absolute_error=round(max_ae, 2),
            median_absolute_error=round(med_ae, 2),
            sample_size=sample_size,
            expected_intervals=expected_intervals,
            completeness_pct=completeness_pct,
            start_date=start_date.strftime("%Y-%m-%d"),
            end_date=end_date.strftime("%Y-%m-%d"),
            cutoff_time=cutoff_time_str,
            daily_metrics=daily_metrics,
            hourly_metrics=hourly_metrics,
            error_distribution=error_distribution
        )

    def get_overview_data(
        self,
        delivery_date: date,
        cutoff_time_str: str = "11:00"
    ) -> OverviewResponse:
        """
        Generate executive overview data for a single delivery day.
        """
        intervals = self.recon_service.reconstruct_day_ahead(delivery_date, delivery_date, cutoff_time_str)

        if not intervals:
            return OverviewResponse(
                delivery_date=delivery_date.strftime("%Y-%m-%d"),
                cutoff_time=cutoff_time_str,
                latest_eligible_publish=None,
                avg_forecast_mw=0.0,
                peak_forecast_mw=0.0,
                actual_avg_mw=None,
                actual_peak_mw=None,
                daily_mae=None,
                daily_bias=None,
                completeness_pct=0.0,
                intervals=[]
            )

        fcst_vals = [x.forecast_mw for x in intervals]
        act_vals = [x.actual_mw for x in intervals if x.actual_mw is not None]
        errors = [x.delta_mw for x in intervals]
        pub_times = [x.publish_time for x in intervals if x.publish_time is not None]

        latest_pub = max(pub_times) if pub_times else None

        avg_fcst = round(float(np.mean(fcst_vals)), 2)
        peak_fcst = round(float(np.max(fcst_vals)), 2)
        avg_act = round(float(np.mean(act_vals)), 2) if act_vals else None
        peak_act = round(float(np.max(act_vals)), 2) if act_vals else None
        daily_mae = round(float(np.mean(np.abs(errors))), 2) if errors else None
        daily_bias = round(float(np.mean(errors)), 2) if errors else None
        completeness = round((len(intervals) / 24) * 100, 2)

        return OverviewResponse(
            delivery_date=delivery_date.strftime("%Y-%m-%d"),
            cutoff_time=cutoff_time_str,
            latest_eligible_publish=latest_pub,
            avg_forecast_mw=avg_fcst,
            peak_forecast_mw=peak_fcst,
            actual_avg_mw=avg_act,
            actual_peak_mw=peak_act,
            daily_mae=daily_mae,
            daily_bias=daily_bias,
            completeness_pct=completeness,
            intervals=intervals
        )
