import React, { useState, useEffect } from 'react';
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
import type { ScenarioSummary, ScenarioRequest } from '../types';
import { api } from '../services/api';
import { MetricCard } from '../components/MetricCard';
import { Sliders, ShieldAlert } from 'lucide-react';

interface ScenarioSimulatorViewProps {
  selectedDate: string;
  cutoffTime: string;
}

export const ScenarioSimulatorView: React.FC<ScenarioSimulatorViewProps> = ({
  selectedDate,
  cutoffTime,
}) => {
  const [demandMw, setDemandMw] = useState<number>(32000);
  const [simRange, setSimRange] = useState<'day' | 'month'>('day');
  const [summary, setSummary] = useState<ScenarioSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const req: ScenarioRequest = {
      base_demand_mw: demandMw,
      start_date: simRange === 'day' ? selectedDate : '2026-01-01',
      end_date: simRange === 'day' ? selectedDate : '2026-01-31',
      cutoff_time: cutoffTime,
    };

    api.simulateScenario(req)
      .then((res) => {
        if (isMounted) {
          setSummary(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Scenario error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [demandMw, simRange, selectedDate, cutoffTime]);

  const chartData = summary?.intervals.map((item) => ({
    time: `${item.start_time.slice(11, 16)}`,
    fullTime: item.start_time,
    demand: item.base_demand_mw,
    forecastWind: item.forecast_wind_mw,
    actualWind: item.actual_wind_mw,
    plannedResidual: item.planned_residual_mw,
    actualResidual: item.actual_residual_mw,
    imbalance: item.imbalance_mw,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Prominent Analytical Disclaimer Banner */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 dark:text-slate-300">
          <span className="font-bold text-amber-500 uppercase tracking-wide mr-1">
            Domain Methodology Notice:
          </span>
          The Elexon dataset does not contain consumer demand. This simulator uses user-defined baseline demand
          solely to model how wind forecast error translates into residual thermal power procurement swings and volume exposure.
          It does not constitute real-time National Grid ESO dispatch or commercial market advice.
        </div>
      </div>

      {/* Simulator Control Panel */}
      <div className="bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center">
              <Sliders className="w-4 h-4 mr-2 text-cyan-500" />
              Hypothetical Demand & Procurement Settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Adjust assumed baseline utility demand to inspect residual imbalance swings
            </p>
          </div>

          {/* Time Scope Toggle */}
          <div className="flex items-center space-x-1 text-xs bg-slate-100 dark:bg-trading-surface p-1 rounded-md border border-slate-200 dark:border-trading-border">
            <button
              onClick={() => setSimRange('day')}
              className={`px-3 py-1 rounded transition-colors font-medium ${
                simRange === 'day' ? 'bg-cyan-500 text-white font-semibold' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Single Day ({selectedDate})
            </button>
            <button
              onClick={() => setSimRange('month')}
              className={`px-3 py-1 rounded transition-colors font-medium ${
                simRange === 'month' ? 'bg-cyan-500 text-white font-semibold' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Full Month (January 2026)
            </button>
          </div>
        </div>

        {/* Demand Slider Control */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600 dark:text-slate-400">
              Assumed Baseline Demand (National Utility Profile):
            </span>
            <span className="font-mono font-bold text-cyan-500 text-base">
              {demandMw.toLocaleString()} MW
            </span>
          </div>

          <input
            type="range"
            min={15000}
            max={50000}
            step={1000}
            value={demandMw}
            onChange={(e) => setDemandMw(Number(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-200 dark:bg-trading-surface rounded-lg"
          />

          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>15,000 MW (Off-Peak Night)</span>
            <span>32,000 MW (Winter Average)</span>
            <span>50,000 MW (Peak Cold Snap)</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400">
            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Simulating procurement curves at {demandMw.toLocaleString()} MW...</span>
          </div>
        </div>
      ) : !summary ? null : (
        <>
          {/* Exposure Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Shortfall Exposure"
              value={summary.total_shortfall_mwh.toLocaleString()}
              unit="MWh"
              subtitle={`${summary.shortfall_intervals} intervals under-bought`}
              badge={{ text: 'Deficit Risk', variant: 'warning' }}
            />
            <MetricCard
              title="Surplus Exposure"
              value={summary.total_surplus_mwh.toLocaleString()}
              unit="MWh"
              subtitle={`${summary.surplus_intervals} intervals over-bought`}
              badge={{ text: 'Spill Risk', variant: 'positive' }}
            />
            <MetricCard
              title="Peak Hourly Deficit"
              value={summary.max_shortfall_mw.toLocaleString()}
              unit="MW"
              subtitle="Max Single-Hour Shortfall"
            />
            <MetricCard
              title="Peak Hourly Surplus"
              value={summary.max_surplus_mw.toLocaleString()}
              unit="MW"
              subtitle="Max Single-Hour Spill"
            />
          </div>

          {/* Residual Procurement Profile Chart */}
          <div className="bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border rounded-lg p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Residual Thermal Procurement Profile
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Planned Residual = Demand − DA Forecast Wind; Actual Residual = Demand − Actual Delivered Wind
              </p>
            </div>

            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
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

                  {/* Planned thermal procurement (based on day-ahead wind forecast) */}
                  <Line
                    type="stepAfter"
                    dataKey="plannedResidual"
                    name="Day-Ahead Planned Thermal Procured (MW)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    dot={false}
                  />

                  {/* Actual thermal procurement physically needed */}
                  <Line
                    type="stepAfter"
                    dataKey="actualResidual"
                    name="Actual Thermal Required in Real-Time (MW)"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />

                  {/* Volume imbalance delta */}
                  <Bar
                    dataKey="imbalance"
                    name="Volume Imbalance Swing (MW)"
                    fill="#06b6d4"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
