import React from 'react';
import { LayoutDashboard, GitCompare, BarChart3, History, Sliders } from 'lucide-react';

export type TabType = 'overview' | 'comparison' | 'accuracy' | 'history' | 'scenario';

interface TabsNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const TabsNav: React.FC<TabsNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: LayoutDashboard },
    { id: 'comparison' as TabType, label: 'Actual vs Forecast', icon: GitCompare },
    { id: 'accuracy' as TabType, label: 'Accuracy Analytics', icon: BarChart3 },
    { id: 'history' as TabType, label: 'Forecast Evolution', icon: History },
    { id: 'scenario' as TabType, label: 'Procurement Simulator', icon: Sliders },
  ];

  return (
    <nav className="border-b border-slate-200 dark:border-trading-border bg-slate-50 dark:bg-trading-surface/50 px-6">
      <div className="flex space-x-2 overflow-x-auto py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-cyan-500 text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-trading-surface'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
