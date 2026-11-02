import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant: 'positive' | 'negative' | 'neutral' | 'warning';
  };
  sampleSize?: number;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  badge,
  sampleSize,
}) => {
  const getBadgeStyle = () => {
    if (!badge) return '';
    switch (badge.variant) {
      case 'negative':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'positive':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="bg-white dark:bg-trading-card border border-slate-200 dark:border-trading-border p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        {badge && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${getBadgeStyle()}`}>
            {badge.text}
          </span>
        )}
      </div>

      <div className="flex items-baseline space-x-1">
        <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
          {value}
        </span>
        {unit && (
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {unit}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{subtitle || ''}</span>
        {sampleSize !== undefined && (
          <span className="text-[11px] font-mono opacity-80">N={sampleSize}</span>
        )}
      </div>
    </div>
  );
};
