import React from 'react';
import { render, screen } from '@testing-library/react';
import { VitalsGrid } from '@/components/dashboard/VitalsGrid';
import type { VitalReading } from '@/types';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Heart: (props: any) => <svg data-testid="icon-heart" {...props} />,
  Activity: (props: any) => <svg data-testid="icon-activity" {...props} />,
  Wind: (props: any) => <svg data-testid="icon-wind" {...props} />,
  Thermometer: (props: any) => <svg data-testid="icon-thermo" {...props} />,
  Waves: (props: any) => <svg data-testid="icon-waves" {...props} />,
  Brain: (props: any) => <svg data-testid="icon-brain" {...props} />,
}));

describe('VitalsGrid', () => {
  const normalVitals: VitalReading = {
    id: 'v1',
    caseId: 'case-1',
    heartRate: 75,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    spo2: 98,
    temperature: 37.0,
    respiratoryRate: 16,
    gcsScore: 15,
    recordedAt: '2024-01-01T10:00:00Z',
  };

  it('renders all vital sign labels', () => {
    render(<VitalsGrid vitals={normalVitals} />);
    expect(screen.getByText('Heart Rate')).toBeInTheDocument();
    expect(screen.getByText('SpO₂')).toBeInTheDocument();
    expect(screen.getByText('BP Systolic')).toBeInTheDocument();
    expect(screen.getByText('Temp')).toBeInTheDocument();
    expect(screen.getByText('Resp Rate')).toBeInTheDocument();
    expect(screen.getByText('GCS')).toBeInTheDocument();
  });

  it('renders vital values', () => {
    render(<VitalsGrid vitals={normalVitals} />);
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('98')).toBeInTheDocument();
  });

  it('renders dashes for null vitals', () => {
    render(<VitalsGrid vitals={null} />);
    const dashes = screen.getAllByText('--');
    expect(dashes.length).toBe(6);
  });

  it('shows loading skeleton', () => {
    const { container } = render(<VitalsGrid vitals={null} loading />);
    expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(0);
  });

  it('has the correct id', () => {
    const { container } = render(<VitalsGrid vitals={null} />);
    expect(container.querySelector('#vitals-grid')).toBeInTheDocument();
  });
});
