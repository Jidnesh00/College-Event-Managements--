import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import {
  Bell,
  Clock,
  CheckCircle2,
  CheckCheck,
  ExternalLink,
  Trash2,
  RefreshCw,
} from 'lucide-react';

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

export const NotificationDropdown: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    triggerReminderCheck,
    loading,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'reminder' | 'registration_status'>('all');
  const [checking, setChecking] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const handleTriggerCheck = async () => {
    setChecking(true);
    await triggerReminderCheck();
    setChecking(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#CBD5E1] hover:text-[#F1F5F9] rounded-lg hover:bg-[#16223B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
        title="Notifications"
        aria-label="Open notifications"
      >
        <Bell className="w-5 h-5" />
        
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-bold text-white tabular-nums shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        <span
          className={`absolute bottom-1 right-1 w-2 h-2 rounded-full border border-[#0B1220] ${
            isConnected ? 'bg-[#22C55E]' : 'bg-[#7C8BA8]'
          }`}
          title={isConnected ? 'Connected' : 'Offline'}
        />
      </button>

      {/* Elevated Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#16223B] rounded-[14px] shadow-[0_16px_36px_rgba(0,0,0,0.4)] border border-[#1F2D4A] z-50 overflow-hidden text-[#CBD5E1] animate-modal-in">
          
          {/* Header */}
          <div className="px-4 py-3 bg-[#111A2E] border-b border-[#1F2D4A] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F1F5F9]">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold bg-[#EF4444]/15 text-[#EF4444] px-1.5 py-0.2 rounded border border-[#EF4444]/30 tabular-nums">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#3B82F6] hover:underline"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Connection Status Sub-bar */}
          <div className="px-4 py-1.5 bg-[#0D1526] border-b border-[#1F2D4A] text-[11px] flex items-center justify-between text-[#7C8BA8]">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-[#22C55E]' : 'bg-[#F59E0B]'
                }`}
              />
              <span className="font-medium text-[10px]">
                {isConnected ? 'Real-Time Sync Active' : 'Connecting stream...'}
              </span>
            </div>

            <button
              onClick={handleTriggerCheck}
              disabled={checking}
              className="inline-flex items-center gap-1 text-[10px] text-[#7C8BA8] hover:text-[#3B82F6] transition-colors"
              title="Scan upcoming reminders"
            >
              <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin text-[#3B82F6]' : ''}`} />
              <span>Sync</span>
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center px-3 pt-2 pb-1.5 gap-1 border-b border-[#1F2D4A] bg-[#16223B] text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                filter === 'all'
                  ? 'bg-[#3B82F6] text-[#F1F5F9]'
                  : 'text-[#7C8BA8] hover:bg-[#111A2E] hover:text-[#F1F5F9]'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('reminder')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors flex items-center gap-1 ${
                filter === 'reminder'
                  ? 'bg-[#3B82F6] text-[#F1F5F9]'
                  : 'text-[#7C8BA8] hover:bg-[#111A2E] hover:text-[#F1F5F9]'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Reminders</span>
            </button>
            <button
              onClick={() => setFilter('registration_status')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors flex items-center gap-1 ${
                filter === 'registration_status'
                  ? 'bg-[#3B82F6] text-[#F1F5F9]'
                  : 'text-[#7C8BA8] hover:bg-[#111A2E] hover:text-[#F1F5F9]'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Registrations</span>
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#1F2D4A]">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#7C8BA8]">Loading notifications...</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-1.5">
                <Bell className="w-6 h-6 text-[#7C8BA8] mx-auto" />
                <p className="text-xs font-medium text-[#CBD5E1]">No alerts right now</p>
                <p className="text-[11px] text-[#7C8BA8] max-w-xs mx-auto">
                  When you register for events or receive updates, they'll appear here.
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const isReminder = n.type === 'reminder';
                const isStatus = n.type === 'registration_status';

                return (
                  <div
                    key={n.id}
                    className={`p-3.5 transition-colors text-left flex gap-3 ${
                      n.is_read
                        ? 'bg-[#16223B] hover:bg-[#1F2D4A]/50'
                        : 'bg-[#111A2E] hover:bg-[#1F2D4A]/60'
                    }`}
                  >
                    <div className="shrink-0 pt-0.5">
                      {isReminder ? (
                        <div className="w-6 h-6 rounded bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 flex items-center justify-center">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                      ) : isStatus ? (
                        <div className="w-6 h-6 rounded bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded bg-[#16223B] text-[#7C8BA8] border border-[#1F2D4A] flex items-center justify-center">
                          <Bell className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-1">
                        <h4
                          className={`text-xs truncate ${
                            n.is_read
                              ? 'font-medium text-[#CBD5E1]'
                              : 'font-bold text-[#F1F5F9]'
                          }`}
                        >
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-[#7C8BA8] shrink-0 whitespace-nowrap">
                          {formatRelativeTime(n.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-[#7C8BA8] leading-relaxed line-clamp-2">
                        {n.message}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <div>
                          {n.event_id && (
                            <Link
                              to={`/events/${n.event_id}`}
                              onClick={() => setIsOpen(false)}
                              className="font-semibold text-[#3B82F6] hover:underline flex items-center gap-0.5"
                            >
                              <span>View event</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {!n.is_read && (
                            <button
                              onClick={() => markAsRead(n.id)}
                              className="text-[#7C8BA8] hover:text-[#F1F5F9] transition-colors"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(n.id)}
                            className="text-[#7C8BA8] hover:text-[#EF4444] p-0.5 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Dropdown Footer */}
          <div className="p-2.5 bg-[#111A2E] border-t border-[#1F2D4A] text-center">
            <Link
              to="/student/dashboard"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-[#3B82F6] hover:underline"
            >
              Go to Student Dashboard
            </Link>
          </div>

        </div>
      )}
    </div>
  );
};
