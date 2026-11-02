export interface IntervalComparison {
  start_time: string;
  settlement_date: string;
  hour: number;
  actual_mw: number;
  forecast_mw: number;
  publish_time: string;
  delta_mw: number;
  abs_error_mw: number;
  pct_error: number | null;
  under_procured: boolean;
  over_procured: boolean;
}

export interface DailyAccuracyItem {
  date: string;
  mae: number;
  rmse: number;
  wape: number | null;
  bias: number;
  sample_count: number;
  actual_avg_mw: number;
  forecast_avg_mw: number;
}

export interface HourlyAccuracyItem {
  hour: number;
  mae: number;
  rmse: number;
  wape: number | null;
  bias: number;
  sample_count: number;
}

export interface ErrorDistributionBin {
  bin_label: string;
  bin_start: number;
  bin_end: number;
  count: number;
  percentage: number;
}

export interface AccuracySummary {
  mae: number;
  rmse: number;
  wape: number | null;
  bias: number;
  max_absolute_error: number;
  median_absolute_error: number;
  sample_size: number;
  expected_intervals: number;
  completeness_pct: number;
  start_date: string;
  end_date: string;
  cutoff_time: string;
  daily_metrics: DailyAccuracyItem[];
  hourly_metrics: HourlyAccuracyItem[];
  error_distribution: ErrorDistributionBin[];
}

export interface OverviewResponse {
  delivery_date: string;
  cutoff_time: string;
  latest_eligible_publish: string | null;
  avg_forecast_mw: number;
  peak_forecast_mw: number;
  actual_avg_mw: number | null;
  actual_peak_mw: number | null;
  daily_mae: number | null;
  daily_bias: number | null;
  completeness_pct: number;
  intervals: IntervalComparison[];
}

export interface ForecastHistoryItem {
  publish_time: string;
  target_time: string;
  generation_mw: number;
  lead_time_hours: number;
  is_eligible_day_ahead: boolean;
  cutoff_used: string;
}

export interface ForecastHistoryResponse {
  target_time: string;
  selected_day_ahead_mw: number | null;
  selected_publish_time: string | null;
  actual_mw: number | null;
  revisions: ForecastHistoryItem[];
}

export interface ScenarioRequest {
  base_demand_mw: number;
  start_date: string;
  end_date: string;
  cutoff_time: string;
}

export interface ScenarioInterval {
  start_time: string;
  base_demand_mw: number;
  forecast_wind_mw: number;
  actual_wind_mw: number;
  planned_residual_mw: number;
  actual_residual_mw: number;
  imbalance_mw: number;
  exposure_type: 'SHORTFALL_RISK' | 'SURPLUS_RISK' | 'BALANCED';
}

export interface ScenarioSummary {
  base_demand_mw: number;
  total_shortfall_mwh: number;
  total_surplus_mwh: number;
  max_shortfall_mw: number;
  max_surplus_mw: number;
  shortfall_intervals: number;
  surplus_intervals: number;
  disclaimer: string;
  intervals: ScenarioInterval[];
}

export interface MetadataResponse {
  dataset_target: string;
  default_cutoff_time: string;
  supported_cutoffs: string[];
  actuals_range: {
    start: string | null;
    end: string | null;
    total_count: number;
  };
  forecasts_range: {
    start: string | null;
    end: string | null;
    total_count: number;
  };
  last_ingestion: {
    dataset: string | null;
    status: string | null;
    started_at: string | null;
  };
}
