import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
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
  /** Older notifications exist beyond what is loaded (page-based "Load more"). */
  hasMoreNotifications: boolean;
  loadingMoreNotifications: boolean;
  loadMoreNotifications: () => Promise<void>;
  markAsRead:    (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (dto: Partial<NotificationPreferenceFlags> & { pushEnabled?: boolean; emailEnabled?: boolean; whatsappEnabled?: boolean; smsEnabled?: boolean; retentionChannelsEnabled?: boolean; language?: 'en' | 'ur' }) => Promise<void>;
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
  const [notificationsTotal, setNotificationsTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  // Page of the last list request + which filter it used, so Load more continues the same list.
  const listState = useRef({ page: 1, unreadOnly: false });
  const listLoadedRef = useRef(false);
  const fetchNotificationsRef = useRef<(unreadOnly?: boolean) => Promise<void>>(async () => {});

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
      listState.current = { page: 1, unreadOnly };
      listLoadedRef.current = true;
      setNotifications(res.data?.items ?? []);
      setNotificationsTotal(res.data?.total ?? 0);
      setUnreadCount(res.data?.unreadCount ?? 0);
    } catch {
      // Ignore list fetch errors
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  fetchNotificationsRef.current = fetchNotifications;

  const loadMoreNotifications = useCallback(async () => {
    if (!TokenStorage.isLoggedIn()) return;
    const { page, unreadOnly } = listState.current;
    setLoadingMore(true);
    try {
      const res = await apiListNotifications({ unreadOnly, limit: 50, page: page + 1 });
      listState.current = { page: page + 1, unreadOnly };
      setNotifications(prev => {
        const seen = new Set(prev.map(n => n._id));
        return [...prev, ...(res.data?.items ?? []).filter(n => !seen.has(n._id))];
      });
      setNotificationsTotal(res.data?.total ?? 0);
    } catch {
      // Ignore: the button stays so the user can retry
    } finally {
      setLoadingMore(false);
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

  const updatePrefs = useCallback(async (dto: Partial<NotificationPreferenceFlags> & { pushEnabled?: boolean; emailEnabled?: boolean; whatsappEnabled?: boolean; smsEnabled?: boolean; retentionChannelsEnabled?: boolean; language?: 'en' | 'ur' }) => {
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
      const nx = next as unknown as Record<string, unknown>;
      for (const k of ['whatsappEnabled', 'smsEnabled', 'retentionChannelsEnabled'] as const) {
        const v = (dto as Record<string, unknown>)[k];
        if (v !== undefined) nx[k] = v;
      }

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

  // Login/logout also reset the inbox + badge (the old effect only ran on first mount).
  useEffect(() => {
    const onLogin = () => { fetchUnreadCount(); };
    const onLogout = () => { setNotifications([]); setUnreadCount(0); setPreferences(null); setToast(null); listLoadedRef.current = false; };
    window.addEventListener('edudeen:auth-login', onLogin);
    window.addEventListener('edudeen:auth-logout', onLogout);
    return () => {
      window.removeEventListener('edudeen:auth-login', onLogin);
      window.removeEventListener('edudeen:auth-logout', onLogout);
    };
  }, [fetchUnreadCount]);

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

  // Real-time socket. Follows login/logout (no page refresh needed), always handshakes with the
  // CURRENT token, reconnects itself when the server drops it (expired token / restart), and a
  // light poll covers the gaps while the socket is down.
  useEffect(() => {
    let socket: ReturnType<typeof io> | null = null;
    let retryTimer: number | undefined;
    let pollTimer: number | undefined;
    let disposed = false;

    const stopPoll = () => { if (pollTimer) { window.clearInterval(pollTimer); pollTimer = undefined; } };
    const startPoll = () => {
      if (pollTimer) return;
      pollTimer = window.setInterval(() => {
        if (document.visibilityState === 'visible') fetchUnreadCount();
      }, 30_000);
    };

    const disconnect = () => {
      if (retryTimer) { window.clearTimeout(retryTimer); retryTimer = undefined; }
      stopPoll();
      if (socket) { socket.removeAllListeners(); socket.disconnect(); socket = null; }
    };

    const connect = () => {
      disconnect();
      if (disposed || !TokenStorage.isLoggedIn()) return;

      const s = io(`${API_BASE_URL}/notifications`, {
        // function form: re-read the token on every (re)connect attempt
        auth: (cb) => cb({ token: TokenStorage.getToken() }),
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10_000,
      });
      socket = s;

      s.on('connect', () => {
        stopPoll();
        // anything that arrived while we were offline
        fetchUnreadCount();
        if (listLoadedRef.current) fetchNotificationsRef.current(listState.current.unreadOnly);
      });

      s.on('disconnect', (reason) => {
        startPoll();
        // The server closed it (e.g. expired token): socket.io will not retry by itself.
        if (reason === 'io server disconnect' && !disposed) {
          retryTimer = window.setTimeout(connect, 3000);
        }
      });
      s.on('connect_error', () => startPoll());

      s.on('notification:unread-count', (data: { unreadCount: number }) => {
        setUnreadCount(data.unreadCount);
      });

      s.on('notification:new', (notification: NotificationItem) => {
        setNotifications(prev => (prev.some(n => n._id === notification._id) ? prev : [notification, ...prev]));
        setToast(notification);
      });
    };

    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !TokenStorage.isLoggedIn()) return;
      fetchUnreadCount();
      if (!socket || !socket.connected) connect();
    };

    connect();
    window.addEventListener('edudeen:auth-login', connect);
    window.addEventListener('edudeen:auth-logout', disconnect);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      disconnect();
      window.removeEventListener('edudeen:auth-login', connect);
      window.removeEventListener('edudeen:auth-logout', disconnect);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchUnreadCount]);

  return (
    <NotificationCtx.Provider
      value={{
        notifications,
        unreadCount,
        loading: notificationsLoading,
        notificationsLoading,
        preferences,
        fetchNotifications,
        hasMoreNotifications: notifications.length < notificationsTotal,
        loadingMoreNotifications: loadingMore,
        loadMoreNotifications,
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
