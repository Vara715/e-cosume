import type {
  OverviewResponse,
  IntervalComparison,
  AccuracySummary,
  ForecastHistoryResponse,
  ScenarioRequest,
  ScenarioSummary,
  MetadataResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error (${res.status}): ${errorText || res.statusText}`);
  }

  return res.json();
}

export const api = {
  getHealth: () => fetchJson<{ status: string; total_actual_records: number; total_forecast_records: number }>('/health'),

  getMetadata: () => fetchJson<MetadataResponse>('/metadata'),

  getOverview: (deliveryDate: string, cutoffTime: string = '11:00') =>
    fetchJson<OverviewResponse>(`/overview?delivery_date=${deliveryDate}&cutoff_time=${cutoffTime}`),

  getComparison: (startDate: string, endDate: string, cutoffTime: string = '11:00') =>
    fetchJson<IntervalComparison[]>(`/comparison?start_date=${startDate}&end_date=${endDate}&cutoff_time=${cutoffTime}`),

  getAccuracy: (startDate: string, endDate: string, cutoffTime: string = '11:00') =>
    fetchJson<AccuracySummary>(`/accuracy?start_date=${startDate}&end_date=${endDate}&cutoff_time=${cutoffTime}`),

  getForecastHistory: (targetTime: string, cutoffTime: string = '11:00') =>
    fetchJson<ForecastHistoryResponse>(`/forecasts/history?target_time=${encodeURIComponent(targetTime)}&cutoff_time=${cutoffTime}`),

  simulateScenario: (req: ScenarioRequest) =>
    fetchJson<ScenarioSummary>('/scenario/simulate', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
};
