import { useState, useCallback } from 'react';
import { EscrowSummary } from '../components/EscrowCard/types';
import { fetchWithRetry } from '../utils/api';

interface UseEscrowApiResult {
  data: EscrowSummary[];
  loading: boolean;
  error: string | null;
  fetchList: (params?: { status?: string; search?: string; page?: number }) => Promise<void>;
  resolveEscrow: (requestId: string) => Promise<void>;
  raiseDispute: (requestId: string) => Promise<void>;
  notifyParties: (requestId: string) => Promise<void>;
  getEscrowDetails: (requestId: string) => Promise<EscrowSummary | null>;
  createEscrow: (data: { beneficiary: string; arbiter: string; amount: number }) => Promise<EscrowSummary>;
}

export function useEscrowApi(): UseEscrowApiResult {
  const [data, setData] = useState<EscrowSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async (params?: { status?: string; search?: string; page?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry('/api/v1/escrow');
      const fetchedData = await res.json();
      
      // Map Prisma schema to UI schema
      let mappedData: EscrowSummary[] = fetchedData.map((item: any) => ({
        requestId: item.escrowId, // Note the camelCase here!
        status: item.status,
        submitter: item.initializer,
        counterparty: item.beneficiary,
        amount: { value: Number(item.amount), currency: 'USD', token: 'USDC' },
        txHash: item.txSig,       // Note the camelCase here!
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        confirmations: 1, 
        attempts: 1,
      }));
      setData(mappedData);
    } catch (err) {
      setError('Failed to fetch escrow list');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const resolveEscrow = useCallback(async (requestId: string) => {
    // TODO: Connect to backend: await fetchWithRetry(`/api/v1/escrow/${requestId}/resolve`, { method: 'POST' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Resolved ${requestId}`);
    
    // Optimistic UI update
    setData(prev => prev.map(item => 
      item.requestId === requestId ? { ...item, status: 'completed' } : item
    ));
  }, []);

  const raiseDispute = useCallback(async (requestId: string) => {
    // TODO: Connect to backend: await fetchWithRetry(`/api/v1/escrow/${requestId}/dispute`, { method: 'POST' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Dispute raised for ${requestId}`);
    
    // Optimistic UI update
    setData(prev => prev.map(item => 
      item.requestId === requestId ? { ...item, status: 'active' } : item
    ));
  }, []);

  const notifyParties = useCallback(async (requestId: string) => {
    // TODO: Connect to backend: await fetchWithRetry(`/api/v1/escrow/${requestId}/notify`, { method: 'POST' });
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Notified parties for ${requestId}`);
  }, []);

  const getEscrowDetails = useCallback(async (requestId: string) => {
    // Since we don't have a GET endpoint yet, just find it in the current session data
    return data.find(item => item.requestId === requestId) || null;
  }, [data]);

  const createEscrow = useCallback(async (payload: { beneficiary: string; arbiter: string; amount: number }) => {
    const token = localStorage.getItem("access_token");
    
    const res = await fetchWithRetry('/api/v1/escrow/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Failed to create escrow: ${await res.text()}`);
    }

    const backendResult = await res.json();
    
    // Map the backend response to the UI's EscrowSummary shape
    const newEscrow: EscrowSummary = {
      requestId: backendResult.escrow_id || backendResult.escrowPda,
      status: 'active',
      submitter: 'Current User', 
      counterparty: payload.beneficiary, 
      amount: {
        value: payload.amount,
        currency: 'USD',
        token: 'USDC' 
      },
      txHash: backendResult.tx_sig || backendResult.tx,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      events: [{ 
        id: `e-${Date.now()}`, 
        type: 'created', 
        message: 'Escrow deployed to Solana Mainnet', 
        ts: new Date().toISOString() 
      }],
      confirmations: 0,
      attempts: 1,
    };

    // Optimistically add to the top of the UI list
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