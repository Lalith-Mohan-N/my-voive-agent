import React from 'react';
import { render, screen } from '@testing-library/react';
import { LiveTranscript } from '@/components/dashboard/LiveTranscript';
import type { TranscriptEntry } from '@/types';

describe('LiveTranscript', () => {
  const mockEntries: TranscriptEntry[] = [
    {
      id: '1',
      caseId: 'case-1',
      eventType: 'transcript',
      speaker: 'user',
      content: 'Patient has chest pain',
      urgencyTag: null,
      metadata: {},
      createdAt: '2024-01-01T10:00:00Z',
    },
    {
      id: '2',
      caseId: 'case-1',
      eventType: 'transcript',
      speaker: 'agent',
      content: '[URGENT] Assessing situation. What are the vitals?',
      urgencyTag: 'URGENT',
      metadata: {},
      createdAt: '2024-01-01T10:00:01Z',
    },
    {
      id: '3',
      caseId: 'case-1',
      eventType: 'system',
      speaker: 'system',
      content: 'Call started — VitaVoice connected.',
      urgencyTag: null,
      metadata: {},
      createdAt: '2024-01-01T09:59:59Z',
    },
  ];

  it('renders transcript entries', () => {
    render(<LiveTranscript entries={mockEntries} />);
    expect(screen.getByText('Patient has chest pain')).toBeInTheDocument();
    expect(screen.getByText(/Assessing situation/)).toBeInTheDocument();
  });

  it('renders speaker labels', () => {
    render(<LiveTranscript entries={mockEntries} />);
    expect(screen.getByText('USER')).toBeInTheDocument();
    expect(screen.getByText('VITA')).toBeInTheDocument();
  });

  it('renders system messages', () => {
    render(<LiveTranscript entries={mockEntries} />);
    expect(screen.getByText(/VitaVoice connected/)).toBeInTheDocument();
  });

  it('shows empty state when no entries', () => {
    render(<LiveTranscript entries={[]} />);
    expect(screen.getByText(/Transcript will appear here/)).toBeInTheDocument();
  });

  it('shows loading skeleton', () => {
    const { container } = render(<LiveTranscript entries={[]} loading />);
    expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(0);
  });

  it('displays entry count', () => {
    render(<LiveTranscript entries={mockEntries} />);
    expect(screen.getByText('3 entries')).toBeInTheDocument();
  });

  it('displays singular entry count', () => {
    render(<LiveTranscript entries={[mockEntries[0]]} />);
    expect(screen.getByText('1 entry')).toBeInTheDocument();
  });

  it('renders urgency badges inline', () => {
    render(<LiveTranscript entries={mockEntries} />);
    expect(screen.getByText('URGENT')).toBeInTheDocument();
  });
});
