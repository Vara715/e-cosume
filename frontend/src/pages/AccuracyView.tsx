import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import type { AccuracySummary } from '../types';
import { MetricCard } from '../components/MetricCard';

interface AccuracyViewProps {
  data: AccuracySummary | null;
  loading: boolean;
  cutoffTime: string;
}

export const AccuracyView: React.FC<AccuracyViewProps> = ({ data, loading, cutoffTime }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Computing historical accuracy & bias metrics...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const diurnalData = data.hourly_metrics.map((h) => ({
    hour: `${String(h.hour).padStart(2, '0')}:00`,
    mae: h.mae,
    bias: h.bias,
    rmse: h.rmse,
  }));

  const dailyData = data.daily_metrics.map((d) => ({
    date: d.date.slice(5),
    mae: d.mae,
    bias: d.bias,
  }));

  const distData = data.error_distribution.map((bin) => ({
    bin: bin.bin_label,
    count: bin.count,
    percentage: bin.percentage,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          title="MAE"
          value={data.mae.toFixed(1)}
          unit="MW"
          subtitle="Mean Absolute Error"
          sampleSize={data.sample_size}
        />
        <MetricCard
          title="RMSE"
          value={data.rmse.toFixed(1)}
          unit="MW"
          subtitle="Root Mean Squared Error"
        />
        <MetricCard
          title="WAPE"
          value={data.wape !== null ? `${data.wape.toFixed(1)}%` : 'N/A'}
          subtitle="Weighted Absolute Pct Error"
        />
        <MetricCard
          title="Systematic Bias"
          value={`${data.bias > 0 ? '+' : ''}${data.bias.toFixed(1)}`}
          unit="MW"
          subtitle={data.bias > 0 ? 'Over-forecasting tend.' : 'Under-forecasting tend.'}
          badge={{
            text: data.bias > 0 ? 'Over-forecast' : 'Under-forecast',
            variant: data.bias > 0 ? 'warning' : 'positive',
          }}
        />
        <MetricCard
          title="Max Abs Error"
          value={data.max_absolute_error.toFixed(0)}
          unit="MW"
          subtitle="Peak Tail Discrepancy"
        />
        <MetricCard
          title="Median Abs Error"
          value={data.median_absolute_error.toFixed(1)}
          unit="MW"
          subtitle="50th Percentile Error"
        />
      </div>

      {/* Daily Performance Breakdown */}
      <div className="bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Daily Accuracy Evolution Across January 2026
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Daily MAE (bars) and Directional Bias (line) for D-1 {cutoffTime} GMT day-ahead decisions
            </p>
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
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
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar dataKey="mae" name="Daily MAE (MW)" fill="#06b6d4" radius={[2, 2, 0, 0]} />
              <Bar dataKey="bias" name="Daily Bias (MW)" fill="#f59e0b" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Diurnal Error Curve & Error Distribution Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diurnal Hour-of-Day Curve */}
        <div className="bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Diurnal Accuracy Profile (Hour of Day)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Identifies time-of-day accuracy patterns across the 24 hourly dispatch windows
            </p>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={diurnalData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} tickLine={false} />
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
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="mae" name="Hourly MAE (MW)" stroke="#06b6d4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rmse" name="Hourly RMSE (MW)" stroke="#a855f7" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                <Line type="monotone" dataKey="bias" name="Hourly Bias (MW)" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Error Distribution Histogram */}
        <div className="bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Forecast Error Distribution (MW)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Frequency of forecast error magnitude (Delta = Forecast - Actual)
            </p>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis
                  dataKey="bin"
                  stroke="#94a3b8"
                  fontSize={9}
                  tickLine={false}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#13222f',
                    borderColor: '#1e3549',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, _name: any, item: any) => [
                    `${value} intervals (${item.payload.percentage}%)`,
                    'Count',
                  ]}
                />
                <Bar dataKey="count" name="Intervals Count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
