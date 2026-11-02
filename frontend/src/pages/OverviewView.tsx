import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import type { OverviewResponse } from '../types';
import { MetricCard } from '../components/MetricCard';
import { AlertCircle } from 'lucide-react';

interface OverviewViewProps {
  data: OverviewResponse | null;
  loading: boolean;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading reconstructed day-ahead profile...</span>
        </div>
      </div>
    );
  }

  if (!data || data.intervals.length === 0) {
    return (
      <div className="bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg p-8 text-center">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h3 className="font-semibold text-slate-900 dark:text-white">No Reconstructed Data Available</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          No eligible forecasts were found prior to the cutoff for {data?.delivery_date}.
        </p>
      </div>
    );
  }

  const chartData = data.intervals.map((item) => ({
    time: `${String(item.hour).padStart(2, '0')}:00`,
    forecast: item.forecast_mw,
    actual: item.actual_mw,
    delta: item.delta_mw,
  }));

  const biasBadgeVariant =
    (data.daily_bias ?? 0) > 200
      ? 'warning'
      : (data.daily_bias ?? 0) < -200
      ? 'positive'
      : 'neutral';

  const biasText =
    (data.daily_bias ?? 0) > 0
      ? `+${data.daily_bias?.toFixed(0)} MW (Over-forecast)`
      : `${data.daily_bias?.toFixed(0)} MW (Under-forecast)`;

  return (
    <div className="space-y-6">
      {/* Executive Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          title="DA Avg Forecast"
          value={data.avg_forecast_mw.toLocaleString()}
          unit="MW"
          subtitle="Mean Day-Ahead Power"
          sampleSize={data.intervals.length}
        />
        <MetricCard
          title="DA Peak Forecast"
          value={data.peak_forecast_mw.toLocaleString()}
          unit="MW"
          subtitle="Max Hour Forecast"
        />
        <MetricCard
          title="Actual Generation"
          value={data.actual_avg_mw ? data.actual_avg_mw.toLocaleString() : 'N/A'}
          unit="MW"
          subtitle="Delivered Hourly Mean"
        />
        <MetricCard
          title="Daily MAE"
          value={data.daily_mae !== null ? data.daily_mae.toFixed(1) : 'N/A'}
          unit="MW"
          subtitle="Mean Absolute Error"
        />
        <MetricCard
          title="Directional Bias"
          value={data.daily_bias !== null ? Math.abs(data.daily_bias).toFixed(1) : 'N/A'}
          unit="MW"
          subtitle={data.daily_bias && data.daily_bias > 0 ? 'Shortfall exposure' : 'Surplus exposure'}
          badge={{ text: biasText, variant: biasBadgeVariant }}
        />
        <MetricCard
          title="Completeness"
          value={`${data.completeness_pct.toFixed(0)}%`}
          subtitle={`24 Expected Hours`}
          badge={{
            text: data.completeness_pct >= 100 ? 'Complete' : 'Partial',
            variant: data.completeness_pct >= 100 ? 'positive' : 'warning',
          }}
        />
      </div>

      {/* Main Generation Profile Chart (Inspired by Previse Coral & ML6) */}
      <div className="bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Day-Ahead Forecast vs. Actual Generation Profile
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Stepped curve comparison locked at D-1 {data.cutoff_time} GMT gate closure cutoff
            </p>
          </div>
          {data.latest_eligible_publish && (
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-trading-surface px-2.5 py-1 rounded border border-slate-200 dark:border-trading-border">
              Latest Eligible Pub: {new Date(data.latest_eligible_publish).toUTCString().slice(17, 22)} UTC (D-1)
            </div>
          )}
        </div>

        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis
                dataKey="time"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k MW`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#13222f',
                  borderColor: '#1e3549',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              />
              {/* Actual generation: stepped solid emerald/green line */}
              <Line
                type="stepAfter"
                dataKey="actual"
                name="Actual Wind Generation (MW)"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
              />
              {/* Day-Ahead forecast: stepped solid amber/yellow line */}
              <Line
                type="stepAfter"
                dataKey="forecast"
                name={`Day-Ahead Forecast @ ${data.cutoff_time} (MW)`}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={{ r: 3, fill: '#f59e0b' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Delta (Error) Profile Chart */}
      <div className="bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Forecast Delta (Forecast − Actual)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Positive delta (amber) indicates volume shortfall risk; Negative delta (cyan) indicates volume surplus
            </p>
          </div>
        </div>

        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${v} MW`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#13222f',
                  borderColor: '#1e3549',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Bar
                dataKey="delta"
                name="Forecast Error Delta (MW)"
                fill="#06b6d4"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly Intervals Table */}
      <div className="bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-trading-border flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Half-Hourly / Hourly Interval Breakdown
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {data.intervals.length} intervals evaluated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 dark:bg-trading-surface text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-trading-border">
              <tr>
                <th className="px-4 py-2.5">Interval (UTC)</th>
                <th className="px-4 py-2.5">DA Forecast (MW)</th>
                <th className="px-4 py-2.5">Actual (MW)</th>
                <th className="px-4 py-2.5">Delta (MW)</th>
                <th className="px-4 py-2.5">Abs Error (MW)</th>
                <th className="px-4 py-2.5">Error %</th>
                <th className="px-4 py-2.5">Procurement Risk</th>
                <th className="px-4 py-2.5">Pub Time (UTC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-trading-border">
              {data.intervals.map((item, idx) => {
                const isShortfall = item.delta_mw > 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-trading-surface/60 transition-colors">
                    <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">
                      {String(item.hour).padStart(2, '0')}:00 - {String(item.hour + 1).padStart(2, '0')}:00
                    </td>
                    <td className="px-4 py-2 text-amber-600 dark:text-amber-400 font-semibold">
                      {item.forecast_mw.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                      {item.actual_mw.toLocaleString()}
                    </td>
                    <td className={`px-4 py-2 font-semibold ${isShortfall ? 'text-amber-500' : 'text-cyan-500'}`}>
                      {item.delta_mw > 0 ? `+${item.delta_mw}` : item.delta_mw}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                      {item.abs_error_mw}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                      {item.pct_error !== null ? `${item.pct_error.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          isShortfall
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        }`}
                      >
                        {isShortfall ? 'SHORTFALL' : 'SURPLUS'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-400">
                      {item.publish_time ? new Date(item.publish_time).toUTCString().slice(17, 22) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
