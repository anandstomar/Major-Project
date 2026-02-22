import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Calendar, RefreshCw, Plus, AlertTriangle, Bell, CheckCircle } from 'lucide-react';
import { EscrowCard } from './EscrowCard';
import { EscrowDetailPanel } from './EscrowDetailPanel';
import { useEscrowApi } from '../../hooks/useEscrowApi';
import { EscrowSummary } from './types';
import { Modal } from '../ui/Modal';

export const EscrowList: React.FC = () => {
  const { 
    data, 
    loading, 
    error, 
    fetchList, 
    resolveEscrow, 
    raiseDispute, 
    notifyParties,
    getEscrowDetails,
    createEscrow
  } = useEscrowApi();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowSummary | null>(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [activeModal, setActiveModal] = useState<'resolve' | 'dispute' | 'notify' | 'create' | null>(null);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  
  // Create Form State
  const [createForm, setCreateForm] = useState({
    amount: '',
    currency: 'USD',
    token: '',
    counterparty: ''
  });

  // Initial fetch
  useEffect(() => {
    fetchList({ status: filterStatus, search: searchQuery });
  }, [fetchList]); 

  // Handle search/filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchList({ status: filterStatus, search: searchQuery });
    }, 300);
    return () => clearTimeout(timer);
  }, [filterStatus, searchQuery, fetchList]);

  // Handle detail view
  useEffect(() => {
    if (selectedId) {
      getEscrowDetails(selectedId).then(setSelectedEscrow);
    } else {
      setSelectedEscrow(null);
    }
  }, [selectedId, getEscrowDetails]);

  const handleViewDetails = (id: string) => setSelectedId(id);
  const handleCloseDetails = () => setSelectedId(null);

  // Action Handlers
  const openActionModal = (type: 'resolve' | 'dispute' | 'notify' | 'create', id?: string) => {
    if (id) setActionTargetId(id);
    setActiveModal(type);
    setDisputeReason('');
    if (type === 'create') {
      setCreateForm({ amount: '', currency: 'USD', token: '', counterparty: '' });
    }
  };

  const closeActionModal = () => {
    setActiveModal(null);
    setActionTargetId(null);
    setIsProcessing(false);
  };

  const handleConfirmAction = async () => {
    setIsProcessing(true);
    try {
      if (activeModal === 'resolve' && actionTargetId) {
        await resolveEscrow(actionTargetId);
      } else if (activeModal === 'dispute' && actionTargetId) {
        await raiseDispute(actionTargetId); 
      } else if (activeModal === 'notify' && actionTargetId) {
        await notifyParties(actionTargetId);
      } else if (activeModal === 'create') {
        await createEscrow({
          amount: {
            value: parseFloat(createForm.amount),
            currency: createForm.currency,
            token: createForm.token || undefined
          },
          counterparty: createForm.counterparty
        });
      }
      closeActionModal();
      // Refresh details if open
      if (selectedId === actionTargetId && actionTargetId) {
        getEscrowDetails(actionTargetId).then(setSelectedEscrow);
      }
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#fbfbfa] p-6 md:p-8 font-sans text-[#1f1e1d]">
      {/* Header & Controls */}
      <div className="max-w-7xl mx-auto space-y-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1f1e1d] tracking-tight">
              Escrow Transactions
            </h1>
            <p className="text-[#5d5c58] mt-1">
              Manage and monitor secure transactions across the network.
            </p>
          </div>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-[#BE3F2F] text-white rounded-md font-medium hover:bg-[#a33629] transition-colors shadow-sm"
            onClick={() => openActionModal('create')}
          >
            <Plus className="w-4 h-4" />
            Create Escrow
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-2 rounded-md border border-[#e0e0dc] shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8c8b88]" />
            <input 
              type="text"
              placeholder="Search by ID, submitter, or hash..."
              className="w-full pl-10 pr-4 py-2 bg-transparent border-none focus:ring-0 text-sm text-[#1f1e1d] placeholder:text-[#8c8b88]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="h-6 w-px bg-[#e0e0dc] hidden md:block" />
          
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {['All', 'Pending', 'Active', 'Completed', 'Failed', 'Cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  filterStatus === status 
                    ? 'bg-[#f4f2f0] text-[#BE3F2F]' 
                    : 'text-[#5d5c58] hover:bg-[#fcfbf9] hover:text-[#1f1e1d]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-[#e0e0dc] hidden md:block" />

          <button className="p-2 text-[#8c8b88] hover:text-[#1f1e1d] transition-colors">
            <Calendar className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {loading && data.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-white border border-[#e0e0dc] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <RefreshCw className="w-6 h-6 text-[#BE3F2F]" />
            </div>
            <h3 className="text-lg font-medium text-[#1f1e1d]">Failed to load data</h3>
            <p className="text-[#5d5c58] mt-1 mb-6">{error}</p>
            <button 
              onClick={() => fetchList({ status: filterStatus, search: searchQuery })}
              className="px-4 py-2 bg-white border border-[#e0e0dc] rounded-md text-sm font-medium hover:bg-[#fcfbf9] transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-white border border-[#e0e0dc] rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-[#8c8b88]" />
            </div>
            <h3 className="text-lg font-medium text-[#1f1e1d]">No transactions found</h3>
            <p className="text-[#5d5c58] mt-1">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {data.map((item) => (
                <EscrowCard
                  key={item.requestId}
                  escrow={item}
                  onViewDetails={handleViewDetails}
                  onResolve={(id) => openActionModal('resolve', id)}
                  onRaiseDispute={(id) => openActionModal('dispute', id)}
                  onNotify={(id) => openActionModal('notify', id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Detail Panel Overlay */}
      {selectedId && (
        <div 
          className="fixed inset-0 bg-[#1f1e1d]/20 backdrop-blur-sm z-40"
          onClick={handleCloseDetails}
        />
      )}
      
      <EscrowDetailPanel 
        escrow={selectedEscrow}
        isOpen={!!selectedId}
        onClose={handleCloseDetails}
        onResolve={(id) => openActionModal('resolve', id)}
        onRaiseDispute={(id) => openActionModal('dispute', id)}
      />

      {/* Modals */}
      <Modal
        isOpen={activeModal === 'resolve'}
        onClose={closeActionModal}
        title="Resolve Escrow"
        footer={
          <>
            <button onClick={closeActionModal} className="px-4 py-2 text-sm font-medium text-[#5d5c58] hover:text-[#1f1e1d]">Cancel</button>
            <button 
              onClick={handleConfirmAction}
              disabled={isProcessing}
              className="px-4 py-2 bg-[#BE3F2F] text-white text-sm font-medium rounded-md hover:bg-[#a33629] disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing && <RefreshCw className="w-3 h-3 animate-spin" />}
              Confirm Resolution
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-md flex gap-3 text-amber-800">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm">This action is irreversible. Funds will be released to the designated recipient immediately.</p>
          </div>
          <p className="text-sm text-[#5d5c58]">
            Are you sure you want to resolve escrow <strong>{actionTargetId}</strong>?
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'dispute'}
        onClose={closeActionModal}
        title="Raise Dispute"
        footer={
          <>
            <button onClick={closeActionModal} className="px-4 py-2 text-sm font-medium text-[#5d5c58] hover:text-[#1f1e1d]">Cancel</button>
            <button 
              onClick={handleConfirmAction}
              disabled={isProcessing}
              className="px-4 py-2 bg-[#BE3F2F] text-white text-sm font-medium rounded-md hover:bg-[#a33629] disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing && <RefreshCw className="w-3 h-3 animate-spin" />}
              Submit Dispute
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[#5d5c58]">
            Please provide a reason for raising a dispute on <strong>{actionTargetId}</strong>. This will pause the transaction and notify administrators.
          </p>
          <textarea 
            className="w-full p-3 border border-[#e0e0dc] rounded-md text-sm focus:ring-1 focus:ring-[#BE3F2F] focus:border-[#BE3F2F] outline-none min-h-[100px]"
            placeholder="Describe the issue..."
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'notify'}
        onClose={closeActionModal}
        title="Notify Parties"
        footer={
          <>
            <button onClick={closeActionModal} className="px-4 py-2 text-sm font-medium text-[#5d5c58] hover:text-[#1f1e1d]">Cancel</button>
            <button 
              onClick={handleConfirmAction}
              disabled={isProcessing}
              className="px-4 py-2 bg-[#1f1e1d] text-white text-sm font-medium rounded-md hover:bg-black disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing && <RefreshCw className="w-3 h-3 animate-spin" />}
              Send Notification
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-[#fbfbfa] rounded-md border border-[#e0e0dc]">
            <Bell className="w-5 h-5 text-[#5d5c58]" />
            <p className="text-sm text-[#1f1e1d]">
              An email notification will be sent to all parties involved in <strong>{actionTargetId}</strong>.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'create'}
        onClose={closeActionModal}
        title="Create New Escrow"
        footer={
          <>
            <button onClick={closeActionModal} className="px-4 py-2 text-sm font-medium text-[#5d5c58] hover:text-[#1f1e1d]">Cancel</button>
            <button 
              onClick={handleConfirmAction}
              disabled={isProcessing || !createForm.amount || !createForm.counterparty}
              className="px-4 py-2 bg-[#BE3F2F] text-white text-sm font-medium rounded-md hover:bg-[#a33629] disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing && <RefreshCw className="w-3 h-3 animate-spin" />}
              Create Escrow
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1f1e1d] mb-1">Counterparty Email</label>
            <input 
              type="email"
              className="w-full p-2 border border-[#e0e0dc] rounded-md text-sm focus:ring-1 focus:ring-[#BE3F2F] focus:border-[#BE3F2F] outline-none"
              placeholder="recipient@example.com"
              value={createForm.counterparty}
              onChange={(e) => setCreateForm({...createForm, counterparty: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1f1e1d] mb-1">Amount</label>
              <input 
                type="number"
                className="w-full p-2 border border-[#e0e0dc] rounded-md text-sm focus:ring-1 focus:ring-[#BE3F2F] focus:border-[#BE3F2F] outline-none"
                placeholder="0.00"
                value={createForm.amount}
                onChange={(e) => setCreateForm({...createForm, amount: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1f1e1d] mb-1">Currency</label>
              <select 
                className="w-full p-2 border border-[#e0e0dc] rounded-md text-sm focus:ring-1 focus:ring-[#BE3F2F] focus:border-[#BE3F2F] outline-none bg-white"
                value={createForm.currency}
                onChange={(e) => setCreateForm({...createForm, currency: e.target.value})}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f1e1d] mb-1">Token (Optional)</label>
            <input 
              type="text"
              className="w-full p-2 border border-[#e0e0dc] rounded-md text-sm focus:ring-1 focus:ring-[#BE3F2F] focus:border-[#BE3F2F] outline-none"
              placeholder="e.g. USDC, ETH"
              value={createForm.token}
              onChange={(e) => setCreateForm({...createForm, token: e.target.value})}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
