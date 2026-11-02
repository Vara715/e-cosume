import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/Header';
import { TabsNav } from './components/TabsNav';
import type { TabType } from './components/TabsNav';
import { OverviewView } from './pages/OverviewView';
import { ComparisonView } from './pages/ComparisonView';
import { AccuracyView } from './pages/AccuracyView';
import { ForecastEvolutionView } from './pages/ForecastEvolutionView';
import { ScenarioSimulatorView } from './pages/ScenarioSimulatorView';
import { api } from './services/api';
import type {
  OverviewResponse,
  IntervalComparison,
  AccuracySummary,
  MetadataResponse,
} from './types';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedDate, setSelectedDate] = useState<string>('2026-01-15');
  const [selectedCutoff, setSelectedCutoff] = useState<string>('11:00');
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-01-31');

  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  const [overviewData, setOverviewData] = useState<OverviewResponse | null>(null);
  const [comparisonData, setComparisonData] = useState<IntervalComparison[]>([]);
  const [accuracyData, setAccuracyData] = useState<AccuracySummary | null>(null);

  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);
  const [loadingComparison, setLoadingComparison] = useState<boolean>(true);
  const [loadingAccuracy, setLoadingAccuracy] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Fetch Metadata & Initial Health
  useEffect(() => {
    api.getMetadata()
      .then(setMetadata)
      .catch((err) => console.error('Metadata error:', err));
  }, []);

  // Fetch Overview Data on date or cutoff change
  const fetchOverview = useCallback(() => {
    setLoadingOverview(true);
    api.getOverview(selectedDate, selectedCutoff)
      .then(setOverviewData)
      .catch((err) => console.error('Overview error:', err))
      .finally(() => setLoadingOverview(false));
  }, [selectedDate, selectedCutoff]);

  // Fetch Comparison Data
  const fetchComparison = useCallback(() => {
    setLoadingComparison(true);
    api.getComparison(startDate, endDate, selectedCutoff)
      .then(setComparisonData)
      .catch((err) => console.error('Comparison error:', err))
      .finally(() => setLoadingComparison(false));
  }, [startDate, endDate, selectedCutoff]);

  // Fetch Accuracy Summary
  const fetchAccuracy = useCallback(() => {
    setLoadingAccuracy(true);
    api.getAccuracy(startDate, endDate, selectedCutoff)
      .then(setAccuracyData)
      .catch((err) => console.error('Accuracy error:', err))
      .finally(() => setLoadingAccuracy(false));
  }, [startDate, endDate, selectedCutoff]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (activeTab === 'comparison') {
      fetchComparison();
    } else if (activeTab === 'accuracy') {
      fetchAccuracy();
    }
  }, [activeTab, fetchComparison, fetchAccuracy]);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        api.getMetadata().then(setMetadata),
        fetchOverview(),
        activeTab === 'comparison' ? fetchComparison() : Promise.resolve(),
        activeTab === 'accuracy' ? fetchAccuracy() : Promise.resolve(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const totalRecords = metadata
    ? {
        actuals: metadata.actuals_range.total_count,
        forecasts: metadata.forecasts_range.total_count,
      }
    : undefined;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-trading-bg text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Header
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        selectedCutoff={selectedCutoff}
        onCutoffChange={setSelectedCutoff}
        onRefresh={handleRefreshAll}
        isRefreshing={isRefreshing}
        totalRecords={totalRecords}
      />

      <TabsNav activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'overview' && (
          <OverviewView data={overviewData} loading={loadingOverview} />
        )}

        {activeTab === 'comparison' && (
          <ComparisonView
            data={comparisonData}
            loading={loadingComparison}
            startDate={startDate}
            endDate={endDate}
            onRangeChange={(s, e) => {
              setStartDate(s);
              setEndDate(e);
            }}
            cutoffTime={selectedCutoff}
          />
        )}

        {activeTab === 'accuracy' && (
          <AccuracyView
            data={accuracyData}
            loading={loadingAccuracy}
            cutoffTime={selectedCutoff}
          />
        )}

        {activeTab === 'history' && (
          <ForecastEvolutionView
            selectedDate={selectedDate}
            cutoffTime={selectedCutoff}
          />
        )}

        {activeTab === 'scenario' && (
          <ScenarioSimulatorView
            selectedDate={selectedDate}
            cutoffTime={selectedCutoff}
          />
        )}
      </main>

      {/* Enterprise Platform Footer */}
      <footer className="border-t border-slate-200 dark:border-trading-border bg-white dark:bg-trading-card px-6 py-4 text-xs text-slate-500 dark:text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-200">UK Wind Analytics & Procurement Platform</span> | January 2026 Elexon BMRS FUELHH & WINDFOR Datasets
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span>Day-Ahead Decision Cutoff: {selectedCutoff} GMT on D-1</span>
            <span>•</span>
            <span>Developed with Google Antigravity</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
