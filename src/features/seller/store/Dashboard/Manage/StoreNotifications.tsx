import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useNotification } from '@/contexts/NotificationContext';
import { getNotificationIcon } from '@/components/comman/ui/notificationIcon';
import { notificationBody, notificationLink } from '@/components/comman/ui/NotificationBell';
import { localeDate } from '@/utils/localeTime';
import { Button } from '@/components/comman/ui/Button';
import { StorePageHeader } from '@/components/layouts/StoreLayout';

export function StoreNotifications() {
  const nav = useNavigate();
  const {
    notifications, unreadCount, notificationsLoading, fetchNotifications,
    hasMoreNotifications, loadingMoreNotifications, loadMoreNotifications, markAsRead, markAllAsRead,
  } = useNotification();

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const open = (n: (typeof notifications)[number]) => {
    if (!n.isRead) void markAsRead(n._id);
    const link = notificationLink(n.data);
    if (link) nav(link);
  };

  return (
    <>
    <StorePageHeader
      title="Notifications"
      subtitle="Orders, reviews, payouts and platform updates for your store"
      actions={unreadCount > 0 ? <Button size="sm" variant="outline" onClick={() => void markAllAsRead()}>Mark all as read</Button> : undefined}
    />
    <div className="px-4 md:px-8 pt-6 pb-10 max-w-[760px]">
      {notificationsLoading && notifications.length === 0 ? (
        <p className="text-[14px] text-slate">Loading…</p>
      ) : notifications.length === 0 ? (
        <p className="text-[14px] text-slate">You're all caught up — no notifications yet.</p>
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col gap-2">
          {notifications.map(n => (
            <li key={n._id}>
              <button
                type="button"
                onClick={() => open(n)}
                className={clsx(
                  'w-full text-start flex gap-3 p-3 rounded-xl border cursor-pointer',
                  n.isRead ? 'bg-white border-[#EDEBE5]' : 'bg-cream border-brand-orange/30',
                )}
              >
                <span className="size-9 rounded-lg bg-bone flex items-center justify-center shrink-0">{getNotificationIcon(n.type)}</span>
                <span className="flex-1 min-w-0">
                  <span className={clsx('block text-[14px] text-charcoal', n.isRead ? 'font-medium' : 'font-bold')}>{n.title}</span>
                  <span className="block text-[13px] text-slate mt-0.5">{notificationBody(n)}</span>
                  <span className="block text-[12px] text-slate mt-1">{localeDate(new Date(n.createdAt))}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {hasMoreNotifications && (
        <div className="mt-4 text-center">
          <Button size="sm" variant="outline" loading={loadingMoreNotifications} onClick={() => void loadMoreNotifications()}>Load more</Button>
        </div>
      )}
    </div>
    </>
  );
}
