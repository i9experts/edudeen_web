import { useEffect, useState } from 'react';
import { useNotification } from '@/contexts/NotificationContext';
import { Toggle } from './Toggle';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { SkeletonBox } from './SkeletonBox';
import {
  Bell, Mail, Smartphone, Check, Trash2,
  Clock, Package, MessageSquare, Star, Sparkles, Filter
} from 'lucide-react';
import { clsx } from 'clsx';
import { getNotificationIcon } from './notificationIcon';
import { useNavigate } from 'react-router-dom';
import { notificationLink } from './NotificationBell';

function formatFullTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}


export function NotificationsPanel() {
  const {
    notifications,
    unreadCount,
    notificationsLoading,
    preferences,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchPreferences,
    updatePreferences,
  } = useNotification();
  const navigate = useNavigate();

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [prefError, setPrefError] = useState('');
  const [prefSuccess, setPrefSuccess] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    fetchNotifications(unreadOnly);
  }, [unreadOnly, fetchNotifications]);

  useEffect(() => {
    fetchPreferences().finally(() => setPrefsLoaded(true));
  }, [fetchPreferences]);

  const handleTogglePref = async (key: string, value: boolean) => {
    setPrefError('');
    setPrefSuccess(false);
    try {
      await updatePreferences({ [key]: value });
      setPrefSuccess(true);
      setTimeout(() => setPrefSuccess(false), 3000);
    } catch (err) {
      setPrefError(err instanceof Error ? err.message : 'Failed to update preferences');
    }
  };

  const showPrefsLoading = !prefsLoaded && preferences === null;

  return (
    <div className="flex flex-col gap-6">
      {/* ── CARD 1: Preferences Settings ── */}
      <Card padding="none">
        <div className="px-5 pt-5 pb-4 border-b border-bone flex justify-between items-center">
          <div>
            <h2 className="text-[16px] font-bold text-carbon">Notification Preferences</h2>
            <p className="text-[12px] text-slate mt-0.5">Control how and when you want to receive alerts.</p>
          </div>
          {prefSuccess && (
            <span className="text-[12px] font-medium text-success bg-success-bg px-2.5 py-1 rounded-md animate-fade-in">
              Preferences updated
            </span>
          )}
          {prefError && (
            <span className="text-[12px] font-medium text-error bg-error-bg px-2.5 py-1 rounded-md">
              {prefError}
            </span>
          )}
        </div>

        <div className="p-5 flex flex-col gap-5 divide-y divide-[#f5f4ef]">
          {showPrefsLoading ? (
            <div className="flex flex-col gap-4 py-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex justify-between items-center">
                  <div>
                    <SkeletonBox width={120} height={12} className="mb-2" />
                    <SkeletonBox width={200} height={9} />
                  </div>
                  <SkeletonBox width={40} height={20} rounded="99px" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Channel Delivery Settings */}
              <div className="flex flex-col gap-4 pb-4">
                <p className="text-[12px] font-semibold text-slate uppercase tracking-[0.05em]">Delivery Channels</p>
                
                <div className="flex justify-between items-start gap-4">
                  <div className="flex gap-3">
                    <div className="size-8 rounded-lg bg-bone flex items-center justify-center shrink-0">
                      <Smartphone size={15} className="text-slate" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-charcoal leading-none">Push Notifications</p>
                      <p className="text-[12px] text-slate mt-1 leading-normal">
                        Receive instant alerts directly in your browser or application workspace.
                      </p>
                    </div>
                  </div>
                  <Toggle
                    label="Push notifications"
                    checked={preferences?.pushEnabled ?? true}
                    onChange={(v) => handleTogglePref('pushEnabled', v)}
                  />
                </div>

                <div className="flex justify-between items-start gap-4 pt-2">
                  <div className="flex gap-3">
                    <div className="size-8 rounded-lg bg-bone flex items-center justify-center shrink-0">
                      <Mail size={15} className="text-slate" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-charcoal leading-none">Email Notifications</p>
                      <p className="text-[12px] text-slate mt-1 leading-normal">
                        Receive summaries, digests, and transactional email updates in your inbox.
                      </p>
                    </div>
                  </div>
                  <Toggle
                    label="Email notifications"
                    checked={preferences?.emailEnabled ?? true}
                    onChange={(v) => handleTogglePref('emailEnabled', v)}
                  />
                </div>

                {/* Opt-in order messages on WhatsApp / SMS (only sent when the store admin has enabled the channel). */}
                <div className="flex justify-between items-start gap-4 pt-2">
                  <div className="flex gap-3">
                    <div className="size-8 rounded-lg bg-bone flex items-center justify-center shrink-0">
                      <MessageSquare size={15} className="text-slate" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-charcoal leading-none">WhatsApp order updates</p>
                      <p className="text-[12px] text-slate mt-1 leading-normal">
                        Order confirmation, shipping and delivery messages on WhatsApp. Uses the phone number on your profile.
                      </p>
                    </div>
                  </div>
                  <Toggle
                    label="WhatsApp order updates"
                    checked={preferences?.whatsappEnabled ?? false}
                    onChange={(v) => handleTogglePref('whatsappEnabled', v)}
                  />
                </div>

                <div className="flex justify-between items-start gap-4 pt-2">
                  <div className="flex gap-3">
                    <div className="size-8 rounded-lg bg-bone flex items-center justify-center shrink-0">
                      <Smartphone size={15} className="text-slate" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-charcoal leading-none">SMS order updates</p>
                      <p className="text-[12px] text-slate mt-1 leading-normal">Text messages for order updates (used when WhatsApp is off).</p>
                    </div>
                  </div>
                  <Toggle
                    label="SMS order updates"
                    checked={preferences?.smsEnabled ?? false}
                    onChange={(v) => handleTogglePref('smsEnabled', v)}
                  />
                </div>

                <div className="flex justify-between items-start gap-4 pt-2">
                  <div className="flex gap-3">
                    <div className="size-8 rounded-lg bg-bone flex items-center justify-center shrink-0">
                      <MessageSquare size={15} className="text-slate" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-charcoal leading-none">Reminders and price alerts on WhatsApp/SMS</p>
                      <p className="text-[12px] text-slate mt-1 leading-normal">Cart reminders, back-in-stock and price-drop alerts for saved items, and referral rewards. Needs WhatsApp or SMS turned on above and the Promotions topic enabled.</p>
                    </div>
                  </div>
                  <Toggle
                    label="Reminders and price alerts on WhatsApp or SMS"
                    checked={preferences?.retentionChannelsEnabled ?? false}
                    onChange={(v) => handleTogglePref('retentionChannelsEnabled', v)}
                  />
                </div>
              </div>

              {/* Notification Category Filters */}
              <div className="flex flex-col gap-4 pt-4">
                <p className="text-[12px] font-semibold text-slate uppercase tracking-[0.05em]">Notification Topics</p>

                <div className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-7 rounded bg-brand-pale-orange/50 flex items-center justify-center shrink-0">
                      <Package size={13} className="text-brand-orange" />
                    </div>
                    <div>
                      <p className="text-[12.5px] font-medium text-charcoal">Orders & Deliveries</p>
                      <p className="text-[12px] text-slate leading-normal">Updates on purchases, order progress, and deliveries.</p>
                    </div>
                  </div>
                  <Toggle
                    size="sm"
                    label="Orders and deliveries"
                    checked={preferences?.prefs?.orders ?? true}
                    onChange={(v) => handleTogglePref('orders', v)}
                  />
                </div>

                <div className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-7 rounded bg-[#eef7ff] flex items-center justify-center shrink-0">
                      <MessageSquare size={13} className="text-[#1a65a8]" />
                    </div>
                    <div>
                      <p className="text-[12.5px] font-medium text-charcoal">Direct Messages</p>
                      <p className="text-[12px] text-slate leading-normal">Alerts when a client or admin sends a new message.</p>
                    </div>
                  </div>
                  <Toggle
                    size="sm"
                    label="Direct messages"
                    checked={preferences?.prefs?.messages ?? true}
                    onChange={(v) => handleTogglePref('messages', v)}
                  />
                </div>

                <div className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-7 rounded bg-[#fff8e7] flex items-center justify-center shrink-0">
                      <Star size={13} className="text-[#d4af37]" />
                    </div>
                    <div>
                      <p className="text-[12.5px] font-medium text-charcoal">Loyalty & Reward Points</p>
                      <p className="text-[12px] text-slate leading-normal">Updates on loyalty milestones, points earned, or tier upgrades.</p>
                    </div>
                  </div>
                  <Toggle
                    size="sm"
                    label="Loyalty and reward points"
                    checked={preferences?.prefs?.loyalty ?? true}
                    onChange={(v) => handleTogglePref('loyalty', v)}
                  />
                </div>

                <div className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-7 rounded bg-[#f5f0ff] flex items-center justify-center shrink-0">
                      <Sparkles size={13} className="text-[#7c3aed]" />
                    </div>
                    <div>
                      <p className="text-[12.5px] font-medium text-charcoal">Subscriptions & Plans</p>
                      <p className="text-[12px] text-slate leading-normal">Billing notices, renewal reminders, or payment issues.</p>
                    </div>
                  </div>
                  <Toggle
                    size="sm"
                    label="Subscriptions and plans"
                    checked={preferences?.prefs?.subscriptions ?? true}
                    onChange={(v) => handleTogglePref('subscriptions', v)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* ── CARD 2: History Inbox ── */}
      <Card padding="none">
        <div className="px-5 pt-5 pb-4 border-b border-bone flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold text-carbon">Notification History</h2>
            <p className="text-[12px] text-slate mt-0.5">Browse your notification feed history.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Unread-only filter */}
            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              className={clsx(
                'px-[10px] py-[6px] rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-white transition-colors duration-150',
                unreadOnly ? 'border-brand-orange text-brand-orange bg-brand-pale-orange/10' : 'border-bone text-slate hover:bg-cream'
              )}
            >
              <Filter size={12} />
              <span>Unread Only</span>
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-[12px] py-[6px] rounded-lg bg-brand-orange text-white text-xs font-semibold cursor-pointer border-none flex items-center gap-1 hover:opacity-90 transition-opacity"
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-[#f5f4ef]">
          {notificationsLoading && notifications.length === 0 ? (
            <div className="p-5 flex flex-col gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4">
                  <SkeletonBox width={32} height={32} rounded="8px" />
                  <div className="flex-1">
                    <SkeletonBox width={150} height={12} className="mb-2" />
                    <SkeletonBox width="100%" height={24} rounded="6px" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notif) => (
              <div
                key={notif._id}
                className={clsx(
                  'p-4 flex gap-4 transition-colors duration-150 relative group',
                  !notif.isRead && 'bg-brand-pale-orange/5'
                )}
              >
                {/* Category Icon */}
                <div className="size-9 rounded-lg bg-bone flex items-center justify-center shrink-0 border border-bone">
                  {getNotificationIcon(notif.type, 16)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pe-12">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={clsx('text-[13px] text-carbon', !notif.isRead ? 'font-bold' : 'font-semibold')}>
                      {notif.title}
                    </p>
                    {!notif.isRead && (
                      <span className="px-1.5 py-[1px] rounded bg-brand-orange text-white text-[12px] font-bold uppercase tracking-[0.05em]">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-slate mt-1 leading-relaxed break-words">
                    {notif.body}
                  </p>
                  <div className="flex items-center gap-1.5 text-[12px] text-slate mt-2">
                    <Clock size={10} />
                    <span>{formatFullTime(notif.createdAt)}</span>
                    {notificationLink(notif.data) && (
                      <button
                        onClick={() => { if (!notif.isRead) markAsRead(notif._id); navigate(notificationLink(notif.data)!); }}
                        className="ms-2 text-[12px] font-semibold text-brand-orange hover:text-brand-deep-orange bg-transparent border-0 p-0 cursor-pointer"
                      >
                        Open →
                      </button>
                    )}
                  </div>
                </div>

                {/* Operations */}
                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity absolute end-4 top-1/2 -translate-y-1/2">
                  {!notif.isRead && (
                    <button
                      title="Mark as read"
                      onClick={() => markAsRead(notif._id)}
                      className="size-7 rounded-lg bg-white border border-bone flex items-center justify-center cursor-pointer text-success hover:bg-success-bg transition-colors"
                    >
                      <Check size={13} />
                    </button>
                  )}
                  <button
                    title="Delete notification"
                    onClick={() => deleteNotification(notif._id)}
                    className="size-7 rounded-lg bg-white border border-bone flex items-center justify-center cursor-pointer text-error hover:bg-error-bg transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon={<Bell size={28} className="text-slate/40" />}
              title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
              description={
                unreadOnly
                  ? 'All of your notifications are marked as read. Check back later!'
                  : 'You will receive updates here whenever order activity, chat updates, or promotion events occur.'
              }
            />
          )}
        </div>
      </Card>
    </div>
  );
}
