/**
 * Unit test: NoiseLevelIndicator component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NoiseLevelIndicator } from '@/components/dashboard/NoiseLevelIndicator';

describe('NoiseLevelIndicator', () => {
  it('renders normal level correctly', () => {
    render(<NoiseLevelIndicator level="normal" />);
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.getByText('Standard noise levels')).toBeInTheDocument();
  });

  it('renders high level with warning styling', () => {
    render(<NoiseLevelIndicator level="high" />);
    expect(screen.getByText('Noisy')).toBeInTheDocument();
    expect(screen.getByText('High background noise — clarity mode active')).toBeInTheDocument();
  });

  it('renders extreme level', () => {
    render(<NoiseLevelIndicator level="extreme" />);
    expect(screen.getByText('Extreme')).toBeInTheDocument();
  });

  it('renders low level', () => {
    render(<NoiseLevelIndicator level="low" />);
    expect(screen.getByText('Quiet')).toBeInTheDocument();
  });
});
