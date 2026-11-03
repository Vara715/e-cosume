import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard } from '../components/MetricCard';

describe('MetricCard Component', () => {
  it('renders title, value, unit, and subtitle correctly', () => {
    render(
      <MetricCard
        title="Day-Ahead MAE"
        value="125.4"
        unit="MW"
        subtitle="Mean Absolute Error"
        sampleSize={24}
      />
    );

    expect(screen.getByText('Day-Ahead MAE')).toBeDefined();
    expect(screen.getByText('125.4')).toBeDefined();
    expect(screen.getByText('MW')).toBeDefined();
    expect(screen.getByText('Mean Absolute Error')).toBeDefined();
    expect(screen.getByText('N=24')).toBeDefined();
  });

  it('renders badge with correct text', () => {
    render(
      <MetricCard
        title="Bias"
        value="+150"
        unit="MW"
        badge={{ text: 'Over-forecast', variant: 'warning' }}
      />
    );

    expect(screen.getByText('Over-forecast')).toBeDefined();
  });
});
