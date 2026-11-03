import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabsNav } from '../components/TabsNav';

describe('TabsNav Component', () => {
  it('renders all 5 analytical tabs', () => {
    const onTabChange = vi.fn();
    render(<TabsNav activeTab="overview" onTabChange={onTabChange} />);

    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('Actual vs Forecast')).toBeDefined();
    expect(screen.getByText('Accuracy Analytics')).toBeDefined();
    expect(screen.getByText('Forecast Evolution')).toBeDefined();
    expect(screen.getByText('Procurement Simulator')).toBeDefined();
  });

  it('triggers onTabChange when a tab is clicked', () => {
    const onTabChange = vi.fn();
    render(<TabsNav activeTab="overview" onTabChange={onTabChange} />);

    const accuracyTab = screen.getByText('Accuracy Analytics');
    fireEvent.click(accuracyTab);

    expect(onTabChange).toHaveBeenCalledWith('accuracy');
  });
});
