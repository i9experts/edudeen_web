import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '@/contexts/NotificationContext';
import { TokenStorage } from '@/api/services/auth';
import {
  Bell, Check, Trash2, Clock, X
} from 'lucide-react';
import { clsx } from 'clsx';
import { getNotificationIcon } from './notificationIcon';
import { useDropdownPosition } from '@/hooks/useDropdownPosition';

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/** Where "View all" goes for the signed-in role. */
export function notificationsPath(): string {
  const role = TokenStorage.getUser<{ role?: 'user' | 'seller' | 'admin' }>()?.role;
  if (role === 'seller') return '/seller/settings?tab=notifications';
  if (role === 'admin') return '/admin/settings?tab=notifications';
  return '/account/notifications';
}

/** In-app page a notification points to (e.g. a sale campaign → Marketing), if any.
 *  Only same-app paths — never an outside URL. */
export function notificationLink(data: Record<string, unknown> | null | undefined): string | null {
  const link = data?.link;
  return typeof link === 'string' && link.startsWith('/') && !link.startsWith('//') ? link : null;
}

/** Real-time push toast — rendered by whichever component owns notifications on the page. */
export function NotificationToast() {
  const { toast, clearToast } = useNotification();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clearToast, 5000);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;
  return (
    <div className="fixed bottom-6 end-6 z-[9999] bg-carbon text-white rounded-xl border border-charcoal p-3.5 flex gap-3.5 max-w-[340px] animate-slide-in duration-300">
      <div className="size-9 rounded-lg bg-dark-active flex items-center justify-center shrink-0 border border-charcoal">
        {getNotificationIcon(toast.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-bold leading-tight">{toast.title}</p>
        <p className="text-[11.5px] text-slate mt-1 leading-normal">{toast.body}</p>
      </div>
      <button
        onClick={clearToast}
        className="text-slate hover:text-white bg-transparent border-0 cursor-pointer p-0 shrink-0 self-start mt-0.5"
        aria-label="Dismiss toast"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/** Compact notifications block for the profile popup — latest few + mark-all / view-all. */
export function NotificationsMenuSection({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const recent = notifications.slice(0, 3);

  return (
    <div className="px-[6px] pt-2 pb-1">
      <div className="flex items-center justify-between px-3 pb-1.5">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-slate">
          <Bell size={12} /> Notifications
          {unreadCount > 0 && (
            <span className="px-1.5 py-[1px] rounded-full text-[9px] font-bold bg-[#c0392b] text-white normal-case tracking-normal">
              {unreadCount > 99 ? '99+' : unreadCount} new
            </span>
          )}
        </span>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-[11px] font-semibold text-brand-orange hover:text-brand-deep-orange border-none bg-transparent cursor-pointer flex items-center gap-1 p-0"
          >
            <Check size={11} /> Mark all read
          </button>
        )}
      </div>

      {recent.length > 0 ? (
        <div className="flex flex-col">
          {recent.map(n => (
            <button
              key={n._id}
              onClick={() => {
                if (!n.isRead) markAsRead(n._id);
                const link = notificationLink(n.data);
                if (link) onNavigate(link);
              }}
              className={clsx(
                'w-full flex gap-2.5 px-3 py-2 rounded-[9px] border-0 text-start cursor-pointer hover:bg-cream transition-colors',
                n.isRead ? 'bg-transparent' : 'bg-brand-pale-orange/25',
              )}
            >
              <span className="size-7 rounded-lg bg-bone flex items-center justify-center shrink-0">{getNotificationIcon(n.type)}</span>
              <span className="flex-1 min-w-0">
                <span className={clsx('block text-[12px] text-charcoal leading-tight truncate', n.isRead ? 'font-medium' : 'font-bold')}>{n.title}</span>
                <span className="block text-[11px] text-slate leading-snug line-clamp-1 mt-[2px]">{n.body}</span>
                <span className="flex items-center gap-1 text-[10px] text-slate mt-[3px]"><Clock size={9} /> {formatRelativeTime(n.createdAt)}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="px-3 py-2 text-[12px] text-slate m-0">All caught up — no new notifications.</p>
      )}

      <button
        onClick={() => onNavigate(notificationsPath())}
        className="w-full mt-1 px-3 py-2 rounded-[9px] text-start text-[12px] font-semibold text-brand-orange hover:bg-cream bg-transparent border-none cursor-pointer"
      >
        View all notifications →
      </button>
    </div>
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
  } = useNotification();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pos = useDropdownPosition(containerRef, isOpen);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (containerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Load initial notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate(notificationsPath());
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div ref={containerRef} className="relative z-[900]">
      {/* Dynamic Bell Icon Button */}
      <button
        onClick={handleBellClick}
        aria-label="Notifications"
        className={clsx(
          'relative w-9 h-9 rounded-full bg-brand-pale-orange/50 flex items-center justify-center cursor-pointer shrink-0 border-none transition-all duration-200 hover:bg-brand-pale-orange hover:scale-105 outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 focus-visible:ring-offset-1',
          isOpen && 'bg-brand-pale-orange ring-2 ring-brand-orange/30'
        )}
      >
        <Bell size={16} className="text-brand-orange" />
        {unreadCount > 0 && (
          <span className="absolute -top-[3px] -end-[3px] min-w-[15px] h-[15px] bg-[#c0392b] text-white text-[8px] font-bold rounded-full flex items-center justify-center px-[3px] border border-white leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Bell Dropdown Popup */}
      {isOpen && createPortal(
        <div
          ref={panelRef}
          style={pos}
          className="dropdown-enter fixed z-[9999] bg-white border border-bone rounded-[16px] w-[320px] md:w-[350px] max-w-[calc(100vw-2rem)] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-bone flex items-center justify-between bg-cream/30">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold text-carbon">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-[2px] rounded-full text-[9px] font-bold bg-brand-pale-orange text-brand-orange">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-brand-orange hover:text-brand-deep-orange border-none bg-transparent cursor-pointer flex items-center gap-1"
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* List content */}
          <div className="max-h-[300px] overflow-y-auto divide-y divide-[#f5f4ef]">
            {recentNotifications.length > 0 ? (
              recentNotifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => {
                    if (!notif.isRead) markAsRead(notif._id);
                    const link = notificationLink(notif.data);
                    if (link) { setIsOpen(false); navigate(link); }
                  }}
                  className={clsx(
                    'p-3 flex gap-3 text-start transition-colors duration-150 relative group cursor-pointer hover:bg-cream/40',
                    !notif.isRead && 'bg-brand-pale-orange/20'
                  )}
                >
                  {/* Category icon */}
                  <div className="size-8 rounded-lg bg-bone flex items-center justify-center shrink-0">
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Body text */}
                  <div className="flex-1 min-w-0 pe-6">
                    <p className={clsx('text-[12px] text-charcoal leading-tight', !notif.isRead ? 'font-bold' : 'font-medium')}>
                      {notif.title}
                    </p>
                    <p className="text-[11px] text-slate mt-1 leading-normal break-words">
                      {notif.body}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate mt-1.5">
                      <Clock size={9} />
                      <span>{formatRelativeTime(notif.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions on hover */}
                  <div className="absolute end-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.isRead && (
                      <button
                        title="Mark as read"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notif._id);
                        }}
                        className="size-5 rounded bg-white border border-bone flex items-center justify-center cursor-pointer text-success hover:bg-success-bg transition-colors"
                      >
                        <Check size={11} />
                      </button>
                    )}
                    <button
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif._id);
                      }}
                      className="size-5 rounded bg-white border border-bone flex items-center justify-center cursor-pointer text-error hover:bg-error-bg transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  {/* Unread blue dot indicator */}
                  {!notif.isRead && (
                    <span className="absolute end-3 bottom-3 w-[6px] h-[6px] rounded-full bg-brand-orange shrink-0" />
                  )}
                </div>
              ))
            ) : (
              <div className="py-8 px-4 text-center">
                <Bell size={24} className="text-slate/40 mx-auto mb-2" />
                <p className="text-[12px] font-medium text-slate">All caught up!</p>
                <p className="text-[10px] text-slate/75 mt-0.5">No new notifications.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <button
            onClick={handleViewAll}
            className="w-full py-2.5 border-t border-bone bg-cream/10 text-center text-[12px] font-semibold text-brand-orange hover:text-brand-deep-orange hover:bg-cream/30 cursor-pointer border-none"
          >
            View all notification settings
          </button>
        </div>,
        document.body,
      )}

      {/* Slide-in real-time push toast overlay */}
      <NotificationToast />
    </div>
  );
}
