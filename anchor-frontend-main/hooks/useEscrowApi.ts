import { useState, useEffect, useCallback } from 'react';
import { EscrowSummary } from '../components/EscrowCard/types';

// Mock data for demonstration
const MOCK_DATA: EscrowSummary[] = Array.from({ length: 20 }).map((_, i) => ({
  requestId: `escrow-req-${String(i + 1).padStart(4, '0')}`,
  status: ['pending', 'active', 'completed', 'cancelled', 'failed'][Math.floor(Math.random() * 5)] as any,
  submitter: `user${i + 1}@example.com`,
  counterparty: `counterparty${i + 1}@example.com`,
  amount: { 
    value: parseFloat((Math.random() * 10000).toFixed(2)), 
    currency: 'USD', 
    token: Math.random() > 0.5 ? 'USDC' : undefined 
  },
  merkleRoot: `0x${Math.random().toString(16).slice(2).repeat(4)}`,
  txHash: `0x${Math.random().toString(16).slice(2).repeat(4)}`,
  blockNumber: 123456 + i,
  createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
  updatedAt: new Date().toISOString(),
  events: [
    { id: `e${i}-1`, type: 'created', message: 'Escrow created', ts: new Date(Date.now() - 10000000).toISOString() },
    { id: `e${i}-2`, type: 'funded', message: 'Funds deposited', ts: new Date(Date.now() - 5000000).toISOString() },
  ],
  confirmations: Math.floor(Math.random() * 12),
  attempts: 1,
}));

interface UseEscrowApiResult {
  data: EscrowSummary[];
  loading: boolean;
  error: string | null;
  fetchList: (params?: { status?: string; search?: string; page?: number }) => Promise<void>;
  resolveEscrow: (requestId: string) => Promise<void>;
  raiseDispute: (requestId: string) => Promise<void>;
  notifyParties: (requestId: string) => Promise<void>;
  getEscrowDetails: (requestId: string) => Promise<EscrowSummary | null>;
}

export function useEscrowApi(): UseEscrowApiResult {
  const [data, setData] = useState<EscrowSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async (params?: { status?: string; search?: string; page?: number }) => {
    setLoading(true);
    setError(null);
    try {
      // SIMULATED NETWORK CALL
      // Replace with: await axios.get('/api/v1/escrow', { params });
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate latency

      let filtered = [...MOCK_DATA];
      
      if (params?.status && params.status !== 'All') {
        filtered = filtered.filter(item => item.status === params.status.toLowerCase());
      }
      
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(item => 
          item.requestId.toLowerCase().includes(q) || 
          item.submitter.toLowerCase().includes(q) ||
          item.txHash?.toLowerCase().includes(q)
        );
      }

      setData(filtered);
    } catch (err) {
      setError('Failed to fetch escrow list');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const resolveEscrow = useCallback(async (requestId: string) => {
    // Replace with: await axios.post(`/api/v1/escrow/${requestId}/resolve`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Resolved ${requestId}`);
    
    // Optimistic update
    setData(prev => prev.map(item => 
      item.requestId === requestId ? { ...item, status: 'completed' } : item
    ));
  }, []);

  const raiseDispute = useCallback(async (requestId: string) => {
    // Replace with: await axios.post(`/api/v1/escrow/${requestId}/dispute`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Dispute raised for ${requestId}`);
    
    // Optimistic update
    setData(prev => prev.map(item => 
      item.requestId === requestId ? { ...item, status: 'active' } : item // Assuming dispute keeps it active or specific status
    ));
  }, []);

  const notifyParties = useCallback(async (requestId: string) => {
    // Replace with: await axios.post(`/api/v1/escrow/${requestId}/notify`);
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Notified parties for ${requestId}`);
  }, []);

  const getEscrowDetails = useCallback(async (requestId: string) => {
    // Replace with: const res = await axios.get(`/api/v1/escrow/${requestId}`); return res.data;
    await new Promise(resolve => setTimeout(resolve, 400));
    return MOCK_DATA.find(item => item.requestId === requestId) || null;
  }, []);

  const createEscrow = useCallback(async (data: Partial<EscrowSummary>) => {
    // Replace with: await axios.post('/api/v1/escrow', data);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newEscrow: EscrowSummary = {
      requestId: `escrow-req-${Math.floor(Math.random() * 10000)}`,
      status: 'pending',
      submitter: 'current-user@example.com',
      counterparty: data.counterparty,
      amount: data.amount!,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      events: [{ id: `e-${Date.now()}`, type: 'created', message: 'Escrow created', ts: new Date().toISOString() }],
      confirmations: 0,
      attempts: 0,
      ...data
    } as EscrowSummary;

    setData(prev => [newEscrow, ...prev]);
    return newEscrow;
  }, []);

  return {
    data,
    loading,
    error,
    fetchList,
    resolveEscrow,
    raiseDispute,
    notifyParties,
    getEscrowDetails,
    createEscrow
  };
}
