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

const cache = new Map<string, any>();

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

async function fetchCachedJson<T>(endpoint: string, bypassCache: boolean = false): Promise<T> {
  if (!bypassCache && cache.has(endpoint)) {
    return cache.get(endpoint) as T;
  }
  const data = await fetchJson<T>(endpoint);
  cache.set(endpoint, data);
  return data;
}

export const api = {
  clearCache: () => {
    cache.clear();
  },

  hasCache: (endpoint: string): boolean => {
    return cache.has(endpoint);
  },

  getHealth: () => fetchJson<{ status: string; total_actual_records: number; total_forecast_records: number }>('/health'),

  getMetadata: (bypassCache: boolean = false) =>
    fetchCachedJson<MetadataResponse>('/metadata', bypassCache),

  getOverview: (deliveryDate: string, cutoffTime: string = '11:00', bypassCache: boolean = false) =>
    fetchCachedJson<OverviewResponse>(`/overview?delivery_date=${deliveryDate}&cutoff_time=${cutoffTime}`, bypassCache),

  getComparison: (startDate: string, endDate: string, cutoffTime: string = '11:00', bypassCache: boolean = false) =>
    fetchCachedJson<IntervalComparison[]>(`/comparison?start_date=${startDate}&end_date=${endDate}&cutoff_time=${cutoffTime}`, bypassCache),

  getAccuracy: (startDate: string, endDate: string, cutoffTime: string = '11:00', bypassCache: boolean = false) =>
    fetchCachedJson<AccuracySummary>(`/accuracy?start_date=${startDate}&end_date=${endDate}&cutoff_time=${cutoffTime}`, bypassCache),

  getForecastHistory: (targetTime: string, cutoffTime: string = '11:00', bypassCache: boolean = false) =>
    fetchCachedJson<ForecastHistoryResponse>(`/forecasts/history?target_time=${encodeURIComponent(targetTime)}&cutoff_time=${cutoffTime}`, bypassCache),

  simulateScenario: (req: ScenarioRequest) =>
    fetchJson<ScenarioSummary>('/scenario/simulate', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
};
