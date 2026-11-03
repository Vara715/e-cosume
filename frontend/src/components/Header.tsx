import React from 'react';
import { Sun, Moon, Wind, Clock, Calendar, RefreshCw, Activity } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  selectedCutoff: string;
  onCutoffChange: (cutoff: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  totalRecords?: { actuals: number; forecasts: number };
}

export const Header: React.FC<HeaderProps> = ({
  selectedDate,
  onDateChange,
  selectedCutoff,
  onCutoffChange,
  onRefresh,
  isRefreshing = false,
  totalRecords,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-trading-card border-b border-slate-200 dark:border-trading-border px-6 py-3 sticky top-0 z-30 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Market Context */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-lg text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
            <Wind className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                e-consumption <span className="text-cyan-500 font-semibold">Analytics</span>
              </h1>
              <span className="text-[10px] font-semibold bg-slate-100 dark:bg-trading-surface text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-300 dark:border-trading-border uppercase">
                UK Day-Ahead
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              January 2026 Elexon BMRS Forecast Reconstruction & Procurement Engine
            </p>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Pill */}
          {totalRecords && (
            <div className="hidden lg:flex items-center space-x-2 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-md border border-emerald-500/20">
              <Activity className="w-3.5 h-3.5" />
              <span className="font-mono">
                {totalRecords.actuals.toLocaleString()} Act / {totalRecords.forecasts.toLocaleString()} Fcst
              </span>
            </div>
          )}

          {/* Delivery Date Picker */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-trading-surface border border-slate-300 dark:border-trading-border rounded-md px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Delivery:</span>
            <input
              type="date"
              min="2026-01-01"
              max="2026-01-31"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white font-mono focus:outline-none cursor-pointer"
            />
          </div>

          {/* Decision Cutoff Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-trading-surface border border-slate-300 dark:border-trading-border rounded-md px-2.5 py-1 text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">D-1 Cutoff:</span>
            <select
              value={selectedCutoff}
              onChange={(e) => onCutoffChange(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white font-mono font-medium focus:outline-none cursor-pointer"
            >
              <option value="11:00" className="dark:bg-trading-card">11:00 GMT (EPEX Spot DA)</option>
              <option value="12:00" className="dark:bg-trading-card">12:00 GMT (Nord Pool DA)</option>
              <option value="16:00" className="dark:bg-trading-card">16:00 GMT (Desk Close)</option>
              <option value="17:00" className="dark:bg-trading-card">17:00 GMT (Evening Final)</option>
            </select>
          </div>

          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-cyan-500 dark:hover:text-cyan-400 bg-slate-100 dark:bg-trading-surface border border-slate-300 dark:border-trading-border rounded-md transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-amber-500 bg-slate-100 dark:bg-trading-surface border border-slate-300 dark:border-trading-border rounded-md transition-colors"
            title={theme === 'dark' ? 'Switch to ML6 Light Monitor' : 'Switch to Previse Dark Trading'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>
    </header>
  );
};
