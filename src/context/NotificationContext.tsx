import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { NotificationItem, NotificationType } from '../types';
import { notificationService } from '../services/api';

interface NotificationToast extends NotificationItem {
  toastId: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isConnected: boolean;
  toasts: NotificationToast[];
  loading: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  triggerReminderCheck: () => Promise<void>;
  sendTestAlert: (type?: NotificationType) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  dismissToast: (toastId: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Friendly two-tone chime
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Browsers block un-interacted audio gracefully
  }
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<NotificationToast[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const token = localStorage.getItem('token');

  // Dismiss a toast alert
  const dismissToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  }, []);

  // Fetch initial notifications via REST API
  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await notificationService.getMyNotifications();
      if (res.success) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.error('[Notification Context] Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Connect & maintain WebSocket connection
  useEffect(() => {
    if (!user || !token) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    refreshNotifications();

    let retryCount = 0;
    let isDisposed = false;

    function connectWs() {
      if (isDisposed) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token || '')}`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isDisposed) return ws.close();
          setIsConnected(true);
          retryCount = 0;
          console.log('[WebSocket Client] Connected to real-time notification stream.');

          // Heartbeat ping
          if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'notifications:init') {
              if (Array.isArray(data.notifications)) {
                setNotifications(data.notifications);
              }
              if (typeof data.unreadCount === 'number') {
                setUnreadCount(data.unreadCount);
              }
            } else if (data.type === 'notification:new') {
              const newNotif: NotificationItem = data.notification;
              
              setNotifications((prev) => {
                // Deduplicate by ID
                if (prev.some((n) => n.id === newNotif.id)) return prev;
                return [newNotif, ...prev];
              });

              if (typeof data.unreadCount === 'number') {
                setUnreadCount(data.unreadCount);
              } else {
                setUnreadCount((prev) => prev + 1);
              }

              // Play chime
              playNotificationChime();

              // Add real-time pop-up toast
              const toastItem: NotificationToast = {
                ...newNotif,
                toastId: `${newNotif.id}-${Date.now()}`,
              };
              setToasts((prev) => [toastItem, ...prev.slice(0, 3)]);

              // Auto-dismiss toast after 6 seconds
              setTimeout(() => {
                dismissToast(toastItem.toastId);
              }, 6000);
            } else if (data.type === 'notification:unread_count') {
              if (typeof data.unreadCount === 'number') {
                setUnreadCount(data.unreadCount);
              }
            }
          } catch (e) {
            console.error('[WebSocket Client Message Parsing Error]:', e);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

          if (!isDisposed) {
            // Reconnect with backoff
            const delay = Math.min(1000 * Math.pow(1.5, retryCount), 10000);
            retryCount++;
            reconnectTimeoutRef.current = setTimeout(connectWs, delay);
          }
        };

        ws.onerror = (err) => {
          console.warn('[WebSocket Client Error]:', err);
          ws.close();
        };
      } catch (err) {
        console.error('[WebSocket Client Connection Init Error]:', err);
      }
    }

    connectWs();

    return () => {
      isDisposed = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [user, token, refreshNotifications, dismissToast]);

  const markAsRead = async (id: number) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await notificationService.markAsRead(id);
    } catch (err) {
      console.error('[Notification Context] Failed to mark as read:', err);
      refreshNotifications();
    }
  };

  const markAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);

      await notificationService.markAllAsRead();
    } catch (err) {
      console.error('[Notification Context] Failed to mark all as read:', err);
      refreshNotifications();
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      await notificationService.delete(id);
    } catch (err) {
      console.error('[Notification Context] Failed to delete notification:', err);
      refreshNotifications();
    }
  };

  const triggerReminderCheck = async () => {
    try {
      await notificationService.triggerCheckReminders();
      await refreshNotifications();
    } catch (err) {
      console.error('[Notification Context] Failed to check reminders:', err);
    }
  };

  const sendTestAlert = async (type: NotificationType = 'reminder') => {
    try {
      await notificationService.sendTestAlert({ type });
    } catch (err) {
      console.error('[Notification Context] Failed to send test alert:', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        toasts,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        triggerReminderCheck,
        sendTestAlert,
        refreshNotifications,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
