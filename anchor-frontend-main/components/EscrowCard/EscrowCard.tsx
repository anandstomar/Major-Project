import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Ban, 
  Copy, 
  ExternalLink, 
  ChevronRight, 
  Bell, 
  ShieldAlert, 
  Check
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { EscrowCardProps } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const statusConfig = {
  pending: { color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock, label: 'Pending' },
  active: { color: 'text-blue-700 bg-blue-50 border-blue-200', icon: CheckCircle, label: 'Active' },
  completed: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: Check, label: 'Completed' },
  failed: { color: 'text-red-700 bg-red-50 border-red-200', icon: XCircle, label: 'Failed' },
  cancelled: { color: 'text-gray-600 bg-gray-50 border-gray-200', icon: Ban, label: 'Cancelled' },
};

export const EscrowCard: React.FC<EscrowCardProps> = ({
  escrow,
  onViewDetails,
  onResolve,
  onRaiseDispute,
  onNotify,
  userRoles = [],
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const status = statusConfig[escrow.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <motion.div
      layoutId={`card-${escrow.requestId}`}
      className="group relative bg-white border border-[#e0e0dc] rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
      whileHover={{ y: -2 }}
    >
      {/* Header */}
      <div className="p-5 border-b border-[#f1f0ee] flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-medium text-[#1f1e1d]">
              {escrow.requestId}
            </span>
            <div className={cn("flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border", status.color)}>
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{status.label}</span>
            </div>
          </div>
          <p className="text-xs text-[#5d5c58]">
            Created {formatDistanceToNow(new Date(escrow.createdAt))} ago
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-lg font-semibold text-[#1f1e1d]">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: escrow.amount.currency }).format(escrow.amount.value)}
          </div>
          {escrow.amount.token && (
            <div className="text-xs font-medium text-[#5d5c58]">
              {escrow.amount.token}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-[#8c8b88] mb-1">Submitter</div>
            <div className="font-medium truncate text-[#1f1e1d]" title={escrow.submitter}>{escrow.submitter}</div>
          </div>
          <div>
            <div className="text-xs text-[#8c8b88] mb-1">Counterparty</div>
            <div className="font-medium truncate text-[#1f1e1d]" title={escrow.counterparty || 'N/A'}>
              {escrow.counterparty || '—'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs">
          {escrow.merkleRoot && (
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(escrow.merkleRoot!, 'merkle'); }}
              className="flex items-center gap-1.5 px-2 py-1 bg-[#fbfbfa] rounded border border-[#e0e0dc] hover:bg-[#f4f2f0] transition-colors text-[#5d5c58]"
            >
              <span className="font-mono">Merkle: {escrow.merkleRoot.slice(0, 6)}...{escrow.merkleRoot.slice(-4)}</span>
              {copiedField === 'merkle' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
          
          {escrow.txHash && (
            <a
              href={`https://etherscan.io/tx/${escrow.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-2 py-1 bg-[#fbfbfa] rounded border border-[#e0e0dc] hover:bg-[#f4f2f0] transition-colors text-[#5d5c58]"
            >
              <span className="font-mono">Tx: {escrow.txHash.slice(0, 6)}...</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Compact Metrics */}
        <div className="flex items-center gap-4 pt-2 border-t border-[#f1f0ee]">
          <div className="text-xs text-[#5d5c58]">
            <span className="font-medium text-[#1f1e1d]">{escrow.confirmations || 0}</span> confirmations
          </div>
          <div className="text-xs text-[#5d5c58]">
            <span className="font-medium text-[#1f1e1d]">{escrow.attempts || 0}</span> attempts
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-5 py-3 bg-[#fbfbfa] border-t border-[#f1f0ee] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewDetails(escrow.requestId)}
            className="text-sm font-medium text-[#5d5c58] hover:text-[#1f1e1d] transition-colors flex items-center gap-1"
          >
            View Details
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onNotify(escrow.requestId); }}
            className="p-2 text-[#8c8b88] hover:text-[#1f1e1d] transition-colors rounded-full hover:bg-[#e0e0dc]"
            aria-label="Notify parties"
          >
            <Bell className="w-4 h-4" />
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); onRaiseDispute(escrow.requestId); }}
            className="p-2 text-[#8c8b88] hover:text-[#BE3F2F] transition-colors rounded-full hover:bg-red-50"
            aria-label="Raise dispute"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>

          {(escrow.status === 'active' || escrow.status === 'pending') && (
            <button
              onClick={(e) => { e.stopPropagation(); onResolve(escrow.requestId); }}
              className="px-3 py-1.5 bg-[#1f1e1d] text-white text-xs font-medium rounded hover:bg-black transition-colors flex items-center gap-2"
            >
              Resolve
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
