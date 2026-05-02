import React from 'react';
import { render, screen } from '@testing-library/react';
import { UrgencyBadge } from '@/components/dashboard/UrgencyBadge';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('UrgencyBadge', () => {
  it('renders CRITICAL urgency', () => {
    render(<UrgencyBadge urgency="CRITICAL" />);
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText(/immediate life threat/i)).toBeInTheDocument();
  });

  it('renders URGENT urgency', () => {
    render(<UrgencyBadge urgency="URGENT" />);
    expect(screen.getByText('URGENT')).toBeInTheDocument();
    expect(screen.getByText(/serious condition/i)).toBeInTheDocument();
  });

  it('renders MEDIUM urgency', () => {
    render(<UrgencyBadge urgency="MEDIUM" />);
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText(/moderate concern/i)).toBeInTheDocument();
  });

  it('renders LOW urgency', () => {
    render(<UrgencyBadge urgency="LOW" />);
    expect(screen.getByText('LOW')).toBeInTheDocument();
    expect(screen.getByText(/stable/i)).toBeInTheDocument();
  });

  it('has the urgency-display id', () => {
    const { container } = render(<UrgencyBadge urgency="LOW" />);
    expect(container.querySelector('#urgency-display')).toBeInTheDocument();
  });
});
