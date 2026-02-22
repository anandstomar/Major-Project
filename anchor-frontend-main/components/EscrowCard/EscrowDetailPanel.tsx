import React from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Check, AlertTriangle, FileJson, Activity } from 'lucide-react';
import { EscrowSummary } from './types';
import { format } from 'date-fns';
import { clsx } from 'clsx';

interface EscrowDetailPanelProps {
  escrow: EscrowSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (requestId: string) => void;
  onRaiseDispute: (requestId: string) => void;
  userRoles?: string[];
}

export const EscrowDetailPanel: React.FC<EscrowDetailPanelProps> = ({
  escrow,
  isOpen,
  onClose,
  onResolve,
  onRaiseDispute,
  userRoles = []
}) => {
  if (!escrow) return null;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: isOpen ? 0 : '100%', opacity: isOpen ? 1 : 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-full max-w-xl bg-white border-l border-[#e0e0dc] shadow-2xl z-50 overflow-y-auto"
    >
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#1f1e1d]">
              Escrow Details
            </h2>
            <p className="text-sm text-[#5d5c58] font-mono mt-1">{escrow.requestId}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#8c8b88] hover:text-[#1f1e1d] rounded-full hover:bg-[#f4f2f0] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banner */}
        <div className={clsx(
          "p-4 rounded-md border flex items-start gap-3",
          escrow.status === 'active' ? "bg-blue-50 border-blue-100 text-blue-900" :
          escrow.status === 'completed' ? "bg-emerald-50 border-emerald-100 text-emerald-900" :
          "bg-[#fbfbfa] border-[#e0e0dc] text-[#1f1e1d]"
        )}>
          <Activity className="w-5 h-5 mt-0.5" />
          <div>
            <div className="font-medium capitalize">{escrow.status}</div>
            <div className="text-sm opacity-80 mt-1">
              This transaction is currently {escrow.status}. Last updated {format(new Date(escrow.updatedAt || escrow.createdAt), 'PP p')}
            </div>
          </div>
        </div>

        {/* Financials */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-[#fbfbfa] rounded-md border border-[#e0e0dc]">
            <div className="text-xs text-[#8c8b88] uppercase tracking-wider mb-1">Amount</div>
            <div className="text-xl font-semibold text-[#1f1e1d]">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: escrow.amount.currency }).format(escrow.amount.value)}
            </div>
            {escrow.amount.token && (
              <div className="text-xs text-[#5d5c58] mt-1">{escrow.amount.token}</div>
            )}
          </div>
          <div className="p-4 bg-[#fbfbfa] rounded-md border border-[#e0e0dc]">
            <div className="text-xs text-[#8c8b88] uppercase tracking-wider mb-1">Block Number</div>
            <div className="text-xl font-mono font-medium text-[#1f1e1d]">
              {escrow.blockNumber ? `#${escrow.blockNumber}` : 'Pending'}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h3 className="text-sm font-medium text-[#1f1e1d] mb-4">Transaction Timeline</h3>
          <div className="relative pl-4 border-l-2 border-[#e0e0dc] space-y-6">
            {escrow.events?.map((event, idx) => (
              <div key={event.id} className="relative">
                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-[#e0e0dc] ring-4 ring-white" />
                <div className="flex flex-col">
                  <span className="text-xs text-[#8c8b88] mb-0.5">
                    {format(new Date(event.ts), 'MMM d, yyyy HH:mm:ss')}
                  </span>
                  <span className="text-sm font-medium text-[#1f1e1d] capitalize">
                    {event.type}
                  </span>
                  {event.message && (
                    <span className="text-sm text-[#5d5c58] mt-1">
                      {event.message}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Details */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[#1f1e1d]">Technical Metadata</h3>
          
          <div className="space-y-2">
            <div className="group p-3 rounded-md bg-[#fbfbfa] border border-[#e0e0dc] flex items-center justify-between">
              <div className="overflow-hidden">
                <div className="text-xs text-[#8c8b88] mb-0.5">Merkle Root</div>
                <div className="font-mono text-xs text-[#1f1e1d] truncate">
                  {escrow.merkleRoot || 'N/A'}
                </div>
              </div>
              <button 
                className="p-1.5 text-[#8c8b88] hover:text-[#1f1e1d]"
                onClick={() => navigator.clipboard.writeText(escrow.merkleRoot || '')}
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="group p-3 rounded-md bg-[#fbfbfa] border border-[#e0e0dc] flex items-center justify-between">
              <div className="overflow-hidden">
                <div className="text-xs text-[#8c8b88] mb-0.5">Transaction Hash</div>
                <div className="font-mono text-xs text-[#1f1e1d] truncate">
                  {escrow.txHash || 'N/A'}
                </div>
              </div>
              <button 
                className="p-1.5 text-[#8c8b88] hover:text-[#1f1e1d]"
                onClick={() => navigator.clipboard.writeText(escrow.txHash || '')}
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-6 border-t border-[#e0e0dc] flex flex-col gap-3">
          <button
            className="w-full flex items-center justify-center gap-2 p-3 rounded-md border border-[#e0e0dc] text-[#5d5c58] hover:bg-[#fbfbfa] transition-colors text-sm font-medium"
          >
            <FileJson className="w-4 h-4" />
            View Raw Payload
          </button>
          
          <div className="grid grid-cols-2 gap-3">
             <button
              onClick={() => onRaiseDispute(escrow.requestId)}
              className="flex items-center justify-center gap-2 p-3 rounded-md border border-red-200 text-red-700 hover:bg-red-50 transition-colors text-sm font-medium"
            >
              <AlertTriangle className="w-4 h-4" />
              Raise Dispute
            </button>
            
            <button
              onClick={() => onResolve(escrow.requestId)}
              disabled={escrow.status !== 'active' && escrow.status !== 'pending'}
              className="flex items-center justify-center gap-2 p-3 rounded-md bg-[#1f1e1d] text-white hover:bg-black transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              Resolve Escrow
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
