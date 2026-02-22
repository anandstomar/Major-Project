import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EscrowCard } from './EscrowCard';
import { EscrowSummary } from './types';

const meta: Meta<typeof EscrowCard> = {
  title: 'Components/EscrowCard',
  component: EscrowCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EscrowCard>;

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
  events: [
    { id: 'e1', type: 'preview', message: 'Preview created', ts: '2025-12-01T09:13:00Z' },
    { id: 'e2', type: 'scheduled', message: 'Batch scheduled', ts: '2025-12-01T09:30:00Z' }
  ],
  confirmations: 6,
  attempts: 1
};

export const Default: Story = {
  args: {
    escrow: mockEscrow,
    onViewDetails: (id) => console.log('View details', id),
    onResolve: (id) => console.log('Resolve', id),
    onRaiseDispute: (id) => console.log('Dispute', id),
    onNotify: (id) => console.log('Notify', id),
  },
};

export const Pending: Story = {
  args: {
    ...Default.args,
    escrow: { ...mockEscrow, status: 'pending' },
  },
};

export const Completed: Story = {
  args: {
    ...Default.args,
    escrow: { ...mockEscrow, status: 'completed' },
  },
};

export const Failed: Story = {
  args: {
    ...Default.args,
    escrow: { ...mockEscrow, status: 'failed' },
  },
};
