import React, { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);
  
  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 bg-[#1f1e1d] text-white px-5 py-3 rounded shadow-lg text-sm animate-in fade-in slide-in-from-bottom-4 z-[70] flex items-center gap-4 border border-[#3a3938]">
      <CheckCircle size={18} className="text-emerald-400" />
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-white">
        <X size={14} />
      </button>
    </div>
  );
};