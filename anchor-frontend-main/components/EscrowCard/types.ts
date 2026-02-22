
export interface EscrowAmount {
  value: number;
  currency: string;
  token?: string;
}

export interface EscrowEvent {
  id: string;
  type: string;
  message?: string;
  ts: string;
}

export interface EscrowSummary {
  requestId: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'failed';
  submitter: string;
  counterparty?: string;
  amount: EscrowAmount;
  merkleRoot?: string;
  txHash?: string;
  blockNumber?: number;
  createdAt: string;
  updatedAt?: string;
  events?: EscrowEvent[];
  confirmations?: number;
  attempts?: number;
}

export interface EscrowCardProps {
  escrow: EscrowSummary;
  onViewDetails: (requestId: string) => void;
  onResolve: (requestId: string) => void;
  onRaiseDispute: (requestId: string) => void;
  onNotify: (requestId: string) => void;
  userRoles?: string[];
}
