import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ReferenceLine,
  Brush,
} from 'recharts';
import type { IntervalComparison } from '../types';
import { Download, Calendar, Filter } from 'lucide-react';

interface ComparisonViewProps {
  data: IntervalComparison[];
  loading: boolean;
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
  cutoffTime: string;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  data,
  loading,
  startDate,
  endDate,
  onRangeChange,
  cutoffTime,
}) => {
  const [activePreset, setActivePreset] = useState<string>('all');

  const handlePreset = (preset: string) => {
    setActivePreset(preset);
    if (preset === 'all') {
      onRangeChange('2026-01-01', '2026-01-31');
    } else if (preset === 'w1') {
      onRangeChange('2026-01-01', '2026-01-07');
    } else if (preset === 'w2') {
      onRangeChange('2026-01-08', '2026-01-14');
    } else if (preset === 'w3') {
      onRangeChange('2026-01-15', '2026-01-21');
    } else if (preset === 'w4') {
      onRangeChange('2026-01-22', '2026-01-31');
    }
  };

  const exportCSV = () => {
    if (!data.length) return;
    const headers = ['Start Time (UTC)', 'Date', 'Hour', 'Actual (MW)', 'Forecast (MW)', 'Delta (MW)', 'Abs Error (MW)', 'Publish Time (UTC)'];
    const rows = data.map((item) => [
      item.start_time,
      item.settlement_date,
      item.hour,
      item.actual_mw,
      item.forecast_mw,
      item.delta_mw,
      item.abs_error_mw,
      item.publish_time,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `wind_forecast_vs_actual_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Reconstructing time-series comparison across {startDate} to {endDate}...</span>
        </div>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    time: `${item.settlement_date.slice(5)} ${String(item.hour).padStart(2, '0')}:00`,
    forecast: item.forecast_mw,
    actual: item.actual_mw,
    delta: item.delta_mw,
  }));

  const scatterData = data.map((item) => ({
    x: item.actual_mw,
    y: item.forecast_mw,
    time: `${item.settlement_date} ${item.hour}:00`,
  }));

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg p-3 gap-3">
        {/* Preset Range Buttons */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium mr-1 flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1" /> Presets:
          </span>
          {[
            { id: 'all', label: 'Full Jan 2026' },
            { id: 'w1', label: 'Week 1 (Jan 1-7)' },
            { id: 'w2', label: 'Week 2 (Jan 8-14)' },
            { id: 'w3', label: 'Week 3 (Jan 15-21)' },
            { id: 'w4', label: 'Week 4 (Jan 22-31)' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => handlePreset(p.id)}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap font-medium ${
                activePreset === p.id
                  ? 'bg-cyan-500 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-trading-surface text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-trading-border'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Inputs & CSV Export */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1 bg-slate-50 dark:bg-trading-surface px-2 py-1 rounded border border-slate-200 dark:border-trading-border">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              min="2026-01-01"
              max="2026-01-31"
              onChange={(e) => onRangeChange(e.target.value, endDate)}
              className="bg-transparent text-slate-900 dark:text-white font-mono focus:outline-none"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              min="2026-01-01"
              max="2026-01-31"
              onChange={(e) => onRangeChange(startDate, e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white font-mono focus:outline-none"
            />
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center space-x-1.5 px-3 py-1 bg-slate-100 dark:bg-trading-surface hover:bg-slate-200 dark:hover:bg-trading-border border border-slate-300 dark:border-trading-border text-slate-700 dark:text-slate-200 rounded font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Multi-Day Timeseries Chart with Brush */}
      <div className="bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Continuous Wind Generation Timeseries Comparison
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluated with Day-Ahead decision cutoff at D-1 {cutoffTime} GMT across {data.length} hourly intervals
            </p>
          </div>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} interval={Math.floor(data.length / 10)} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k MW`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#13222f',
                  borderColor: '#1e3549',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line
                type="stepAfter"
                dataKey="actual"
                name="Actual Delivered Generation (MW)"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="stepAfter"
                dataKey="forecast"
                name={`Day-Ahead Forecast (${cutoffTime} Cutoff) (MW)`}
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
              <Brush
                dataKey="time"
                height={28}
                stroke="#06b6d4"
                fill="#13222f"
                tickFormatter={() => ''}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Parity Scatter Plot: Forecast vs Actual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Parity Scatter Plot: Forecast vs. Actual
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Points above the diagonal line reflect over-forecasting (volume shortfall); points below reflect under-forecasting (volume surplus)
            </p>
          </div>

          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Actual"
                  unit=" MW"
                  stroke="#94a3b8"
                  fontSize={11}
                  domain={[0, 'auto']}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Forecast"
                  unit=" MW"
                  stroke="#94a3b8"
                  fontSize={11}
                  domain={[0, 'auto']}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{
                    backgroundColor: '#13222f',
                    borderColor: '#1e3549',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any) => [`${Number(value).toLocaleString()} MW`, name]}
                />
                {/* 45-degree Parity Reference Line */}
                <ReferenceLine
                  segment={[{ x: 0, y: 0 }, { x: 22000, y: 22000 }]}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  label={{ value: 'Perfect Parity (y=x)', position: 'insideTopLeft', fill: '#f43f5e', fontSize: 11 }}
                />
                <Scatter name="Delivery Intervals" data={scatterData} fill="#06b6d4" opacity={0.65} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Statistical Insight Summary Card */}
        <div className="bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg p-5 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
              Procurement Exposure Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Breakdown of total intervals by commercial imbalance exposure
            </p>

            <div className="space-y-4 font-mono text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="text-amber-500 font-bold mb-1">SHORTFALL EXPOSURE (Under-procured)</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {data.filter((x) => x.under_procured).length}{' '}
                  <span className="text-xs font-normal text-slate-400">
                    ({((data.filter((x) => x.under_procured).length / (data.length || 1)) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Wind generation was lower than forecasted; utility was exposed to system cash-out or intra-day purchase.
                </div>
              </div>

              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <div className="text-cyan-400 font-bold mb-1">SURPLUS EXPOSURE (Over-procured)</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {data.filter((x) => x.over_procured).length}{' '}
                  <span className="text-xs font-normal text-slate-400">
                    ({((data.filter((x) => x.over_procured).length / (data.length || 1)) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Wind generation exceeded forecast; utility over-bought thermal power, spilling or dumping into intraday.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-trading-border text-[11px] text-slate-400">
            Total Intervals Evaluated: <span className="font-bold text-slate-200">{data.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
