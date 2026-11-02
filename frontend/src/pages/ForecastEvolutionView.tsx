import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { ForecastHistoryResponse } from '../types';
import { api } from '../services/api';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ForecastEvolutionViewProps {
  selectedDate: string;
  cutoffTime: string;
}

export const ForecastEvolutionView: React.FC<ForecastEvolutionViewProps> = ({
  selectedDate,
  cutoffTime,
}) => {
  const [selectedHour, setSelectedHour] = useState<number>(17); // 17:00 evening peak default
  const [historyData, setHistoryData] = useState<ForecastHistoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const targetIso = `${selectedDate}T${String(selectedHour).padStart(2, '0')}:00:00Z`;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    api.getForecastHistory(targetIso, cutoffTime)
      .then((res) => {
        if (isMounted) {
          setHistoryData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [targetIso, cutoffTime]);

  const chartData = historyData?.revisions.map((rev) => ({
    pubTime: `${rev.publish_time.slice(5, 10)} ${rev.publish_time.slice(11, 16)}`,
    fullTime: rev.publish_time,
    forecast: rev.generation_mw,
    leadHours: rev.lead_time_hours,
    eligible: rev.is_eligible_day_ahead,
    actual: historyData.actual_mw,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Target Hour Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg p-4 gap-4 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Forecast Evolution & Publication History
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Inspect how wind forecasts for a specific delivery hour evolved across multiple Elexon publications
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500 font-medium">Target Delivery Hour:</span>
          <select
            value={selectedHour}
            onChange={(e) => setSelectedHour(Number(e.target.value))}
            className="bg-slate-100 dark:bg-trading-surface border border-slate-300 dark:border-trading-border rounded px-3 py-1 font-mono text-slate-900 dark:text-white focus:outline-none cursor-pointer"
          >
            {Array.from({ length: 24 }).map((_, h) => (
              <option key={h} value={h} className="dark:bg-trading-card">
                {String(h).padStart(2, '0')}:00 UTC {h === 17 ? '(Evening Peak)' : h === 8 ? '(Morning Peak)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400">
            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Retrieving publication timeline for {targetIso}...</span>
          </div>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-xs">
          Error loading forecast history: {error}
        </div>
      ) : !historyData || historyData.revisions.length === 0 ? (
        <div className="p-8 bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg text-center text-slate-500 text-xs">
          No historical revisions found for delivery window {targetIso}.
        </div>
      ) : (
        <>
          {/* Key Indicators for this Delivery Hour */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg">
              <span className="text-xs uppercase font-semibold text-slate-400">Target Interval</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {selectedDate} {String(selectedHour).padStart(2, '0')}:00
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Settlement Interval (UTC)</div>
            </div>

            <div className="p-4 bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg">
              <span className="text-xs uppercase font-semibold text-amber-500">Selected Day-Ahead (D-1 {cutoffTime})</span>
              <div className="text-xl font-bold font-mono text-amber-500 mt-1">
                {historyData.selected_day_ahead_mw ? `${historyData.selected_day_ahead_mw.toLocaleString()} MW` : 'N/A'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Pub: {historyData.selected_publish_time ? new Date(historyData.selected_publish_time).toUTCString().slice(17, 22) + ' UTC' : 'None'}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg">
              <span className="text-xs uppercase font-semibold text-emerald-500">Actual Delivered</span>
              <div className="text-xl font-bold font-mono text-emerald-500 mt-1">
                {historyData.actual_mw ? `${historyData.actual_mw.toLocaleString()} MW` : 'N/A'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Hourly Delivered Mean</div>
            </div>

            <div className="p-4 bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg">
              <span className="text-xs uppercase font-semibold text-slate-400">Total Publications</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {historyData.revisions.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {historyData.revisions.filter((r) => r.is_eligible_day_ahead).length} eligible at {cutoffTime} cutoff
              </div>
            </div>
          </div>

          {/* Evolution Trajectory Chart */}
          <div className="bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Forecast Trajectory Towards Delivery
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Left = early publications (high lead time); Right = later intraday updates. Vertical line denotes D-1 {cutoffTime} Cutoff.
              </p>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis
                    dataKey="pubTime"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    angle={-25}
                    textAnchor="end"
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
                    formatter={(val: any, name: any) => [`${Number(val).toLocaleString()} MW`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                  {/* Horizontal Actual Generation Line */}
                  {historyData.actual_mw && (
                    <ReferenceLine
                      y={historyData.actual_mw}
                      stroke="#10b981"
                      strokeWidth={2}
                      label={{
                        value: `Delivered Actual: ${historyData.actual_mw} MW`,
                        position: 'insideTopRight',
                        fill: '#10b981',
                        fontSize: 11,
                      }}
                    />
                  )}

                  <Line
                    type="monotone"
                    dataKey="forecast"
                    name="Published Forecast (MW)"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#06b6d4' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Historical Publications Table */}
          <div className="bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-trading-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Detailed Publication History Audit Log
              </h3>
            </div>

            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-trading-surface text-slate-500 dark:text-slate-400 sticky top-0 border-b border-slate-200 dark:border-trading-border">
                  <tr>
                    <th className="px-4 py-2.5">Publication Time (UTC)</th>
                    <th className="px-4 py-2.5">Forecast (MW)</th>
                    <th className="px-4 py-2.5">Lead Time (Hours)</th>
                    <th className="px-4 py-2.5">Status at D-1 {cutoffTime} Cutoff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-trading-border">
                  {historyData.revisions.map((rev, idx) => (
                    <tr
                      key={idx}
                      className={
                        rev.is_eligible_day_ahead
                          ? 'bg-amber-500/5 hover:bg-amber-500/10'
                          : 'hover:bg-slate-50 dark:hover:bg-trading-surface/60'
                      }
                    >
                      <td className="px-4 py-2 text-slate-900 dark:text-white font-medium">
                        {new Date(rev.publish_time).toUTCString().slice(5, 22)}
                      </td>
                      <td className="px-4 py-2 font-semibold text-cyan-500">
                        {rev.generation_mw.toLocaleString()} MW
                      </td>
                      <td className="px-4 py-2 text-slate-400">
                        {rev.lead_time_hours} hrs prior
                      </td>
                      <td className="px-4 py-2">
                        {rev.is_eligible_day_ahead ? (
                          <span className="inline-flex items-center text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Eligible Day-Ahead
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-semibold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded border border-slate-500/20">
                            <XCircle className="w-3 h-3 mr-1" /> Post-Cutoff Revision
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
