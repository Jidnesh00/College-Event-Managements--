import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md',
}) => {
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  }[maxWidth];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center flex items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-0 bg-[#0B1220]/75 backdrop-blur-sm"
              onClick={onClose}
              aria-hidden="true"
            />

            {/* Elevated Modal Dialog Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`inline-block w-full ${maxWidthClass} p-6 my-8 overflow-hidden text-left align-middle bg-[#16223B] rounded-[14px] border border-[#1F2D4A] shadow-[0_20px_48px_rgba(0,0,0,0.5)] relative z-10 text-[#CBD5E1]`}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-[#1F2D4A]">
                <h3 className="text-base font-bold text-[#F1F5F9]">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="p-1 rounded-[8px] text-[#7C8BA8] hover:text-[#F1F5F9] hover:bg-[#111A2E] transition-colors focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4">{children}</div>

              {footer && (
                <div className="mt-6 pt-4 border-t border-[#1F2D4A] flex items-center justify-end gap-2.5">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
