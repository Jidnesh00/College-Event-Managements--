import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import {
  Bell,
  Clock,
  CheckCircle2,
  CheckCheck,
  Calendar,
  ExternalLink,
  Trash2,
  RefreshCw,
  MapPin,
  Info,
} from 'lucide-react';
import { NotificationType } from '../../types';

interface RealtimeNotificationPanelProps {
  onOpenTicketModal?: (eventId: number) => void;
}

export const RealtimeNotificationPanel: React.FC<RealtimeNotificationPanelProps> = () => {
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    triggerReminderCheck,
    sendTestAlert,
    loading,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'all' | 'reminder' | 'registration_status' | 'unread'>('all');
  const [checking, setChecking] = useState(false);
  const [testSending, setTestSending] = useState(false);

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'unread') return !item.is_read;
    if (activeTab === 'reminder') return item.type === 'reminder';
    if (activeTab === 'registration_status') return item.type === 'registration_status';
    return true;
  });

  const handleSyncReminders = async () => {
    setChecking(true);
    await triggerReminderCheck();
    setChecking(false);
  };

  const handleTestAlert = async (type: NotificationType) => {
    setTestSending(true);
    await sendTestAlert(type);
    setTestSending(false);
  };

  return (
    <div className="academic-card overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[#1F2D4A] bg-[#0F1829] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#F8FAFC] tracking-tight flex items-center gap-2">
              <span className="p-1.5 rounded-[8px] bg-[#3B82F6]/15 text-[#60A5FA]">
                <Bell className="w-3.5 h-3.5" />
              </span>
              <span>Campus Alerts & Reminders</span>
            </h2>

            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[11px] font-semibold bg-[#EF4444] text-white tabular-nums shadow-sm">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-[#8B9BB4] mt-0.5">
            Real-time push notifications for event countdowns, check-ins, and registration status.
          </p>
        </div>

        {/* Live Status & Quick Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Connection status */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-xs font-medium border ${
              isConnected
                ? 'bg-[#22C55E]/15 text-[#4ADE80] border-[#22C55E]/30'
                : 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-[#4ADE80]' : 'bg-[#FBBF24]'
              }`}
            />
            <span>{isConnected ? 'Sync Active' : 'Connecting...'}</span>
          </div>

          {/* Sync Reminders */}
          <button
            onClick={handleSyncReminders}
            disabled={checking}
            className="btn-secondary text-xs h-7 px-2.5 gap-1 disabled:opacity-60"
            title="Scan database for upcoming event dates and issue reminders"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-[#3B82F6]' : 'text-[#8B9BB4]'}`} />
            <span>Sync</span>
          </button>

          {/* Mark all as read */}
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn-primary text-xs h-7 px-2.5 gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* Simulator Controls Strip */}
      <div className="px-4 py-2 bg-[#0D1526] border-b border-[#1F2D4A] text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="text-[#8B9BB4] font-medium">
          Simulate notification events:
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleTestAlert('reminder')}
            disabled={testSending}
            className="px-2.5 py-1 bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#FBBF24] border border-[#F59E0B]/30 rounded-[6px] text-[11px] font-medium transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
          >
            <Clock className="w-3 h-3" />
            <span>Test Reminder</span>
          </button>

          <button
            onClick={() => handleTestAlert('registration_status')}
            disabled={testSending}
            className="px-2.5 py-1 bg-[#3B82F6]/15 hover:bg-[#3B82F6]/25 text-[#60A5FA] border border-[#3B82F6]/30 rounded-[6px] text-[11px] font-medium transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Test Status</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pt-2.5 pb-2 border-b border-[#1F2D4A] flex items-center gap-1 overflow-x-auto text-xs bg-[#111A2E]">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1 text-xs font-medium rounded-[8px] transition-colors cursor-pointer ${
            activeTab === 'all'
              ? 'btn-primary font-semibold'
              : 'text-[#8B9BB4] hover:text-[#CBD5E1]'
          }`}
        >
          All ({notifications.length})
        </button>

        <button
          onClick={() => setActiveTab('reminder')}
          className={`px-3 py-1 text-xs font-medium rounded-[8px] transition-colors flex items-center gap-1 cursor-pointer ${
            activeTab === 'reminder'
              ? 'bg-[#F59E0B] text-[#0B1220] font-semibold'
              : 'text-[#8B9BB4] hover:text-[#CBD5E1]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Reminders</span>
        </button>

        <button
          onClick={() => setActiveTab('registration_status')}
          className={`px-3 py-1 text-xs font-medium rounded-[8px] transition-colors flex items-center gap-1 cursor-pointer ${
            activeTab === 'registration_status'
              ? 'btn-primary font-semibold'
              : 'text-[#8B9BB4] hover:text-[#CBD5E1]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Status Updates</span>
        </button>

        <button
          onClick={() => setActiveTab('unread')}
          className={`px-3 py-1 text-xs font-medium rounded-[8px] transition-colors flex items-center gap-1 cursor-pointer ${
            activeTab === 'unread'
              ? 'bg-[#EF4444] text-white font-semibold'
              : 'text-[#8B9BB4] hover:text-[#CBD5E1]'
          }`}
        >
          <span>Unread ({unreadCount})</span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="divide-y divide-[#1F2D4A] max-h-[400px] overflow-y-auto">
        {loading && notifications.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#8B9BB4] mx-auto" />
            <p className="text-xs text-[#8B9BB4]">Loading alerts...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Bell className="w-6 h-6 text-[#475569] mx-auto" />
            <h4 className="text-xs font-semibold text-[#CBD5E1]">No alerts in this view</h4>
            <p className="text-xs text-[#8B9BB4] max-w-sm mx-auto">
              Alerts will appear automatically when event dates approach or registrations update.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isReminder = notif.type === 'reminder';
            const isStatus = notif.type === 'registration_status';

            return (
              <div
                key={notif.id}
                className={`p-3.5 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  notif.is_read
                    ? 'bg-[#111A2E]/40 hover:bg-[#16223B]/60'
                    : 'bg-[#16223B] hover:bg-[#1C2B47]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {isReminder ? (
                      <div className="w-7 h-7 rounded-[8px] bg-[#F59E0B]/15 text-[#FBBF24] flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                    ) : isStatus ? (
                      <div className="w-7 h-7 rounded-[8px] bg-[#22C55E]/15 text-[#4ADE80] flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-[8px] bg-[#3B82F6]/15 text-[#60A5FA] flex items-center justify-center">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isReminder
                            ? 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30'
                            : isStatus
                            ? 'bg-[#22C55E]/15 text-[#4ADE80] border-[#22C55E]/30'
                            : 'bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30'
                        }`}
                      >
                        {isReminder ? 'Reminder' : isStatus ? 'Status' : 'Update'}
                      </span>

                      {!notif.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" title="Unread" />
                      )}

                      <span className="text-[10px] text-[#8B9BB4] tabular-nums font-mono">
                        {new Date(notif.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <h4
                      className={`text-xs ${
                        notif.is_read ? 'text-[#CBD5E1] font-semibold' : 'text-[#F8FAFC] font-bold'
                      }`}
                    >
                      {notif.title}
                    </h4>

                    <p className="text-xs text-[#8B9BB4] leading-relaxed max-w-xl">
                      {notif.message}
                    </p>

                    {notif.event_venue && (
                      <div className="flex items-center gap-3 pt-0.5 text-[11px] text-[#8B9BB4]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#8B9BB4]" />
                          <span>{notif.event_venue}</span>
                        </span>
                        {notif.event_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#8B9BB4]" />
                            <span className="tabular-nums font-mono">{new Date(notif.event_date).toLocaleDateString()}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {notif.event_id && (
                    <Link
                      to={`/events/${notif.event_id}`}
                      className="px-2.5 py-1 text-xs font-semibold text-[#CBD5E1] hover:text-[#F8FAFC] bg-[#16223B] hover:bg-[#1E2E4E] border border-[#1F2D4A] rounded-[8px] transition-colors flex items-center gap-1"
                    >
                      <span>Event</span>
                      <ExternalLink className="w-3 h-3 text-[#8B9BB4]" />
                    </Link>
                  )}

                  {!notif.is_read ? (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#60A5FA] bg-[#3B82F6]/15 hover:bg-[#3B82F6]/25 border border-[#3B82F6]/30 rounded-[8px] transition-colors cursor-pointer"
                      title="Mark as read"
                    >
                      Mark read
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#8B9BB4] px-1.5 py-0.5">Read</span>
                  )}

                  <button
                    onClick={() => deleteNotification(notif.id)}
                    className="p-1.5 text-[#8B9BB4] hover:text-[#EF4444] rounded-[8px] hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
                    title="Dismiss notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-[#0F1829] border-t border-[#1F2D4A] text-xs text-[#8B9BB4] flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span>Real-time WebSocket connection synchronized with college event database.</span>
        </div>
        <Link
          to="/student/registrations"
          className="text-xs font-semibold text-[#3B82F6] hover:text-[#60A5FA] hover:underline"
        >
          View Registered Passes
        </Link>
      </div>
    </div>
  );
};
