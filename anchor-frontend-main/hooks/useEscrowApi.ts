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

  // Helper function to map DB fields to UI fields
  const mapDbToUi = (item: any): EscrowSummary => {
    let uiStatus = item.status === 'released' ? 'completed' : item.status;
    if (uiStatus === 'disputed') uiStatus = 'active'; // keep disputed active in UI

    return {
      requestId: item.escrowId || item.escrow_id,
      status: uiStatus,
      submitter: item.initializer,
      counterparty: item.beneficiary,
      amount: { value: Number(item.amount), currency: 'USD', token: 'USDC' },
      txHash: item.txSig || item.tx_sig,
      createdAt: item.createdAt || item.created_at,
      updatedAt: item.updatedAt || item.updated_at,
      confirmations: 1, 
      attempts: 1,
      events: [{ id: `e-${item.escrowId}`, type: 'created', message: 'Escrow deployed', ts: item.createdAt || item.created_at }]
    };
  };

  const fetchList = useCallback(async (params?: { status?: string; search?: string; page?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry('/api/v1/escrow');
      let fetchedData = await res.json();
      if (fetchedData && !Array.isArray(fetchedData) && Array.isArray(fetchedData.data)) {
        fetchedData = fetchedData.data;
      }
      if (!Array.isArray(fetchedData)) throw new Error('API returned invalid data format.');

      let mappedData = fetchedData.map(mapDbToUi);

      if (params?.status && params.status !== 'All') {
        mappedData = mappedData.filter((item: EscrowSummary) => item.status === params.status?.toLowerCase());
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        mappedData = mappedData.filter((item: EscrowSummary) => item.requestId.toLowerCase().includes(q));
      }

      setData(mappedData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch escrow list');
    } finally {
      setLoading(false);
    }
  }, []);

  const getEscrowDetails = useCallback(async (requestId: string) => {
    try {
      const res = await fetchWithRetry(`/api/v1/escrow/${requestId}`);
      if (!res.ok) return null;
      const item = await res.json();
      if (!item) return null;
      return mapDbToUi(item);
    } catch {
      return null;
    }
  }, []);

  const resolveEscrow = useCallback(async (requestId: string) => {
    const token = localStorage.getItem("access_token");
    const res = await fetchWithRetry(`/api/v1/escrow/${requestId}/resolve`, {
      method: 'POST',
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    });
    if (!res.ok) throw new Error('Failed to resolve escrow');
    
    setData(prev => prev.map(item => item.requestId === requestId ? { ...item, status: 'completed' } : item));
  }, []);

  const raiseDispute = useCallback(async (requestId: string) => {
    const token = localStorage.getItem("access_token");
    const res = await fetchWithRetry(`/api/v1/escrow/${requestId}/dispute`, {
      method: 'POST',
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    });
    if (!res.ok) throw new Error('Failed to raise dispute');
  }, []);

  const notifyParties = useCallback(async (requestId: string) => {
    const token = localStorage.getItem("access_token");
    await fetchWithRetry(`/api/v1/escrow/${requestId}/notify`, {
      method: 'POST',
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    });
  }, []);

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

    if (!res.ok) throw new Error(`Failed to create escrow: ${await res.text()}`);

    const backendResult = await res.json();
    
    const newEscrow = mapDbToUi({
      escrowId: backendResult.escrow_id || backendResult.escrowPda,
      initializer: 'Current User',
      beneficiary: payload.beneficiary,
      amount: payload.amount,
      txSig: backendResult.tx_sig || backendResult.tx,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    setData(prev => [newEscrow, ...prev]);
    return newEscrow;
  }, []);

  return { data, loading, error, fetchList, resolveEscrow, raiseDispute, notifyParties, getEscrowDetails, createEscrow };
}