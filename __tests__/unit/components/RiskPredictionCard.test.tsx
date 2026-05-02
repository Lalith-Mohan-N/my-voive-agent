/**
 * Unit test: RiskPredictionCard component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RiskPredictionCard } from '@/components/dashboard/RiskPredictionCard';
import type { RiskPrediction } from '@/types';

const mockPrediction: RiskPrediction = {
  id: 'risk-1',
  caseId: 'case-1',
  riskType: 'Cardiac Arrest',
  confidence: 0.85,
  details: 'Patient unresponsive, no pulse detected. Immediate CPR required.',
  recommendedAction: 'Start chest compressions, prepare AED',
  metadata: {},
  createdAt: '2024-01-01T10:00:00Z',
};

describe('RiskPredictionCard', () => {
  it('renders loading state', () => {
    render(<RiskPredictionCard prediction={null} loading={true} />);
    expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
  });

  it('renders empty state when no prediction', () => {
    render(<RiskPredictionCard prediction={null} loading={false} />);
    expect(screen.getByText('No risk predictions yet')).toBeInTheDocument();
  });

  it('renders prediction details', () => {
    render(<RiskPredictionCard prediction={mockPrediction} loading={false} />);
    expect(screen.getByText('Cardiac Arrest')).toBeInTheDocument();
    expect(screen.getByText('Patient unresponsive, no pulse detected. Immediate CPR required.')).toBeInTheDocument();
    expect(screen.getByText('Start chest compressions, prepare AED')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });
});
