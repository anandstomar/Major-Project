import React from 'react';
import { Status } from '../../types';

interface BadgeProps {
  status: Status | string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  // Default (Unknown) -> Gray
  let bg = 'bg-gray-50 text-gray-600 border border-gray-200';
  
  switch (status) {
    case Status.OK:
    case Status.SUBMITTED:
    case 'success':
    case 'Complete':
      bg = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      break;
    case Status.PROCESSING:
    case 'info':
    case 'Processing':
      bg = 'bg-blue-50 text-blue-700 border border-blue-200';
      break;
    case Status.PENDING:
    case 'Pending':
      // Distinct neutral/waiting state
      bg = 'bg-slate-50 text-slate-600 border border-slate-200';
      break;
    case Status.DEGRADED:
    case 'warning':
      bg = 'bg-amber-50 text-amber-700 border border-amber-200';
      break;
    case Status.FAILED:
    case 'error':
    case 'Failed':
      bg = 'bg-red-50 text-red-700 border border-red-200';
      break;
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center rounded-full font-medium border ${bg} ${padding}`}>
      {status}
    </span>
  );
};