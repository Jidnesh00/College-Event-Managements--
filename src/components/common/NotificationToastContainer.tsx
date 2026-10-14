import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Link } from 'react-router-dom';
import {
  Bell,
  Clock,
  CheckCircle2,
  X,
  ExternalLink,
  QrCode,
} from 'lucide-react';

export const NotificationToastContainer: React.FC = () => {
  const { toasts, dismissToast, markAsRead } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isReminder = toast.type === 'reminder';
        const isStatus = toast.type === 'registration_status';

        return (
          <div
            key={toast.toastId}
            className="pointer-events-auto bg-[#16223B] rounded-[14px] shadow-[0_16px_36px_rgba(0,0,0,0.4)] border border-[#1F2D4A] p-4 transition-all duration-200 animate-toast-in flex flex-col gap-2"
          >
            {/* Header / Type badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] shrink-0" />

                {isReminder ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F59E0B] bg-[#F59E0B]/15 px-2 py-0.5 rounded-full border border-[#F59E0B]/30">
                    <Clock className="w-3 h-3" />
                    <span>Reminder</span>
                  </span>
                ) : isStatus ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3B82F6] bg-[#3B82F6]/15 px-2 py-0.5 rounded-full border border-[#3B82F6]/30">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Registration Update</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#CBD5E1] bg-[#111A2E] px-2 py-0.5 rounded-full border border-[#1F2D4A]">
                    <Bell className="w-3 h-3" />
                    <span>Notification</span>
                  </span>
                )}
                <span className="text-[10px] text-[#7C8BA8]">Just now</span>
              </div>

              <button
                onClick={() => dismissToast(toast.toastId)}
                className="text-[#7C8BA8] hover:text-[#F1F5F9] p-1 rounded transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Content */}
            <div>
              <h4 className="text-xs font-bold text-[#F1F5F9] leading-snug">
                {toast.title}
              </h4>
              <p className="text-xs text-[#7C8BA8] mt-0.5 leading-relaxed">
                {toast.message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1.5 border-t border-[#1F2D4A] text-xs">
              <button
                onClick={() => {
                  markAsRead(toast.id);
                  dismissToast(toast.toastId);
                }}
                className="text-[11px] font-medium text-[#7C8BA8] hover:text-[#F1F5F9] transition-colors"
              >
                Mark as read
              </button>

              <div className="flex items-center gap-2">
                {toast.event_id && (
                  <Link
                    to={`/events/${toast.event_id}`}
                    onClick={() => dismissToast(toast.toastId)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3B82F6] hover:underline"
                  >
                    <span>View Event</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
                {isStatus && (
                  <Link
                    to="/student/registrations"
                    onClick={() => dismissToast(toast.toastId)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3B82F6] hover:underline"
                  >
                    <QrCode className="w-3 h-3" />
                    <span>My Passes</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
