import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EscrowCard } from './EscrowCard';
import { EscrowSummary } from './types';

const mockEscrow: EscrowSummary = {
  requestId: 'escrow-req-0001',
  status: 'active',
  submitter: 'alice@example.com',
  counterparty: 'bob@example.com',
  amount: { value: 1234.56, currency: 'USD', token: 'USDC' },
  merkleRoot: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  txHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
  blockNumber: 123456,
  createdAt: '2025-12-01T09:12:34Z',
  updatedAt: '2025-12-01T10:00:00Z',
  events: [],
  confirmations: 6,
  attempts: 1
};

describe('EscrowCard', () => {
  const mockHandlers = {
    onViewDetails: jest.fn(),
    onResolve: jest.fn(),
    onRaiseDispute: jest.fn(),
    onNotify: jest.fn(),
  };

  it('renders escrow details correctly', () => {
    render(<EscrowCard escrow={mockEscrow} {...mockHandlers} />);
    
    expect(screen.getByText('escrow-req-0001')).toBeInTheDocument();
    expect(screen.getByText('$1,234.56')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('calls onViewDetails when clicked', () => {
    render(<EscrowCard escrow={mockEscrow} {...mockHandlers} />);
    
    fireEvent.click(screen.getByText('View Details'));
    expect(mockHandlers.onViewDetails).toHaveBeenCalledWith('escrow-req-0001');
  });

  it('calls onResolve when resolve button is clicked and confirmed', () => {
    window.confirm = jest.fn(() => true);
    render(<EscrowCard escrow={mockEscrow} {...mockHandlers} />);
    
    fireEvent.click(screen.getByText('Resolve'));
    expect(window.confirm).toHaveBeenCalled();
    expect(mockHandlers.onResolve).toHaveBeenCalledWith('escrow-req-0001');
  });

  it('does not show resolve button for completed transactions', () => {
    render(<EscrowCard escrow={{ ...mockEscrow, status: 'completed' }} {...mockHandlers} />);
    
    expect(screen.queryByText('Resolve')).not.toBeInTheDocument();
  });
});
