import React from 'react';
import { render, screen } from '@testing-library/react';
import { CallStatusPanel } from '@/components/dashboard/CallStatusPanel';

describe('CallStatusPanel', () => {
  it('renders idle state', () => {
    render(<CallStatusPanel status="idle" />);
    expect(screen.getByText('Standby')).toBeInTheDocument();
    expect(screen.getByText(/Waiting for incoming call/)).toBeInTheDocument();
    expect(screen.getByText(/No active call/)).toBeInTheDocument();
  });

  it('renders active state with timer', () => {
    render(
      <CallStatusPanel
        status="active"
        startTime={new Date().toISOString()}
      />
    );
    expect(screen.getByText('Active Call')).toBeInTheDocument();
    expect(screen.getByText(/Duration/)).toBeInTheDocument();
  });

  it('renders ended state', () => {
    render(<CallStatusPanel status="ended" />);
    expect(screen.getByText('Call Ended')).toBeInTheDocument();
    expect(screen.getByText(/Call completed successfully/)).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(<CallStatusPanel status="error" />);
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText(/Connection issue detected/)).toBeInTheDocument();
  });

  it('renders ringing state', () => {
    render(<CallStatusPanel status="ringing" />);
    expect(screen.getByText('Incoming')).toBeInTheDocument();
    expect(screen.getByText(/Call connecting/)).toBeInTheDocument();
  });

  it('has the correct id', () => {
    const { container } = render(<CallStatusPanel status="idle" />);
    expect(container.querySelector('#call-status-panel')).toBeInTheDocument();
  });
});
