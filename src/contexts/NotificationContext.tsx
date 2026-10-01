import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { io } from 'socket.io-client';
import { TokenStorage } from '@/api/services/auth';
import { API_BASE_URL } from '@/api/apiBase';
import {
  apiListNotifications,
  apiGetUnreadCount,
  apiGetPreferences,
  apiUpdatePreferences,
  apiMarkAllNotificationsRead,
  apiMarkNotificationRead,
  apiDeleteNotification,
  type NotificationItem,
  type NotificationPreferenceData,
  type NotificationPreferenceFlags,
} from '@/api/services/notifications';

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount:   number;
  /** @deprecated use notificationsLoading */
  loading:       boolean;
  notificationsLoading: boolean;
  preferences:   NotificationPreferenceData | null;
  fetchNotifications: (unreadOnly?: boolean) => Promise<void>;
  markAsRead:    (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (dto: Partial<NotificationPreferenceFlags> & { pushEnabled?: boolean; emailEnabled?: boolean }) => Promise<void>;
  toast:         NotificationItem | null;
  clearToast:    () => void;
}

const NotificationCtx = createContext<NotificationContextValue | null>(null);

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationCtx);
  if (!ctx) throw new Error('useNotification must be used within a NotificationProvider');
  return ctx;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [preferences,   setPreferences]   = useState<NotificationPreferenceData | null>(null);
  const [toast,         setToast]         = useState<NotificationItem | null>(null);

  const clearToast = useCallback(() => setToast(null), []);

  const fetchUnreadCount = useCallback(async () => {
    if (!TokenStorage.isLoggedIn()) return;
    try {
      const res = await apiGetUnreadCount();
      setUnreadCount(res.data.unreadCount);
    } catch {
      // Ignore count fetch errors
    }
  }, []);

  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    if (!TokenStorage.isLoggedIn()) return;
    setNotificationsLoading(true);
    try {
      const res = await apiListNotifications({ unreadOnly, limit: 50 });
      setNotifications(res.data?.items ?? []);
      setUnreadCount(res.data?.unreadCount ?? 0);
    } catch {
      // Ignore list fetch errors
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    if (!TokenStorage.isLoggedIn()) return;
    try {
      const res = await apiGetPreferences();
      setPreferences(res.data);
    } catch {
      // Ignore preferences fetch errors
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiMarkNotificationRead(id);
      setNotifications(prev =>
        prev.map(item => item._id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // Ignore errors
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiMarkAllNotificationsRead();
      setNotifications(prev =>
        prev.map(item => ({ ...item, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch {
      // Ignore errors
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await apiDeleteNotification(id);
      setNotifications(prev => {
        const item = prev.find(i => i._id === id);
        if (item && !item.isRead) {
          setUnreadCount(c => Math.max(0, c - 1));
        }
        return prev.filter(i => i._id !== id);
      });
    } catch {
      // Ignore errors
    }
  }, []);

  const updatePrefs = useCallback(async (dto: Partial<NotificationPreferenceFlags> & { pushEnabled?: boolean; emailEnabled?: boolean }) => {
    let snapshot: NotificationPreferenceData | null = null;

    setPreferences(prev => {
      snapshot = prev;
      if (!prev) return prev;

      const next: NotificationPreferenceData = {
        ...prev,
        prefs: { ...prev.prefs },
      };

      if (dto.pushEnabled !== undefined) next.pushEnabled = dto.pushEnabled;
      if (dto.emailEnabled !== undefined) next.emailEnabled = dto.emailEnabled;

      (['orders', 'messages', 'promotions', 'loyalty', 'subscriptions'] as const).forEach(key => {
        if (dto[key] !== undefined) next.prefs[key] = dto[key]!;
      });

      return next;
    });

    try {
      const res = await apiUpdatePreferences(dto);
      setPreferences(res.data);
    } catch (err) {
      if (snapshot) setPreferences(snapshot);
      throw err;
    }
  }, []);

  // Fetch initial stats when logged in. Preferences are only needed by the
  // notification settings screen (NotificationsPanel), which loads them itself
  // — no need to request them on every page load.
  useEffect(() => {
    if (TokenStorage.isLoggedIn()) {
      fetchUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setPreferences(null);
    }
  }, [fetchUnreadCount]);

  // Real-time Sockets
  useEffect(() => {
    if (!TokenStorage.isLoggedIn()) return;

    const token = TokenStorage.getToken();
    const base = API_BASE_URL;
    const socket = io(`${base}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Connected to notifications socket');
    });

    socket.on('notification:unread-count', (data: { unreadCount: number }) => {
      setUnreadCount(data.unreadCount);
    });

    socket.on('notification:new', (notification: NotificationItem) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      setToast(notification);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <NotificationCtx.Provider
      value={{
        notifications,
        unreadCount,
        loading: notificationsLoading,
        notificationsLoading,
        preferences,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        fetchPreferences,
        updatePreferences: updatePrefs,
        toast,
        clearToast,
      }}
    >
      {children}
    </NotificationCtx.Provider>
  );
}
