import logging
from datetime import date
from typing import List

from backend.app.schemas.scenario import ScenarioRequest, ScenarioInterval, ScenarioSummary
from backend.app.services.reconstruction import ReconstructionService

logger = logging.getLogger(__name__)

DISCLAIMER_TEXT = (
    "ILLUSTRATIVE SCENARIO ONLY: Consumer demand data is not provided in the Elexon dataset. "
    "This simulation applies user-specified hypothetical demand purely to demonstrate the operational "
    "and volumetric implications of wind forecast variance on residual thermal procurement. "
    "It does not represent official National Grid ESO demand or commercial procurement advice."
)


class ScenarioService:
    def __init__(self, recon_service: ReconstructionService):
        self.recon_service = recon_service

    def simulate(self, req: ScenarioRequest) -> ScenarioSummary:
        start_d = date.fromisoformat(req.start_date)
        end_d = date.fromisoformat(req.end_date)

        intervals = self.recon_service.reconstruct_day_ahead(start_d, end_d, req.cutoff_time)

        scenario_intervals: List[ScenarioInterval] = []
        total_shortfall_mwh = 0.0
        total_surplus_mwh = 0.0
        max_shortfall_mw = 0.0
        max_surplus_mw = 0.0
        shortfall_count = 0
        surplus_count = 0

        for item in intervals:
            # 1 hour per interval -> MW == MWh for that hour
            d = req.base_demand_mw
            f = item.forecast_mw
            a = item.actual_mw
            planned_res = round(d - f, 2)
            actual_res = round(d - a, 2)
            imbalance = round(f - a, 2)

            if imbalance > 0.01:
                exposure = "SHORTFALL_RISK"
                total_shortfall_mwh += imbalance
                if imbalance > max_shortfall_mw:
                    max_shortfall_mw = imbalance
                shortfall_count += 1
            elif imbalance < -0.01:
                exposure = "SURPLUS_RISK"
                surplus_vol = abs(imbalance)
                total_surplus_mwh += surplus_vol
                if surplus_vol > max_surplus_mw:
                    max_surplus_mw = surplus_vol
                surplus_count += 1
            else:
                exposure = "BALANCED"

            scenario_intervals.append(
                ScenarioInterval(
                    start_time=item.start_time,
                    base_demand_mw=d,
                    forecast_wind_mw=f,
                    actual_wind_mw=a,
                    planned_residual_mw=planned_res,
                    actual_residual_mw=actual_res,
                    imbalance_mw=imbalance,
                    exposure_type=exposure
                )
            )

        return ScenarioSummary(
            base_demand_mw=req.base_demand_mw,
            total_shortfall_mwh=round(total_shortfall_mwh, 2),
            total_surplus_mwh=round(total_surplus_mwh, 2),
            max_shortfall_mw=round(max_shortfall_mw, 2),
            max_surplus_mw=round(max_surplus_mw, 2),
            shortfall_intervals=shortfall_count,
            surplus_intervals=surplus_count,
            disclaimer=DISCLAIMER_TEXT,
            intervals=scenario_intervals
        )
