import { NotificationsPanel } from '@/components/comman/ui';
import { StorePageHeader } from '@/components/layouts/StoreLayout';

/** Seller inbox + delivery/topic preferences (the panel switches to the seller topics by the signed-in role). */
export function StoreNotifications() {
  return (
    <>
      <StorePageHeader
        title="Notifications"
        subtitle="Orders, reviews, stock, payouts and platform updates for your store"
      />
      <div className="px-4 md:px-8 pt-6 pb-10 max-w-[860px]">
        <NotificationsPanel />
      </div>
    </>
  );
}
