import React from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';

interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type = 'info', message, onClose }) => {
  if (!message) return null;

  const styles = {
    success: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30',
    error: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
    warning: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
    info: 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30',
  }[type];

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />,
    error: <XCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />,
    warning: <AlertCircle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />,
    info: <Info className="w-4 h-4 text-[#3B82F6] shrink-0 mt-0.5" />,
  }[type];

  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-[10px] border text-xs leading-relaxed ${styles}`}>
      {icons}
      <div className="flex-1 font-medium">{message}</div>
      {onClose && (
        <button onClick={onClose} className="opacity-70 hover:opacity-100 ml-2 font-bold leading-none">
          &times;
        </button>
      )}
    </div>
  );
};
