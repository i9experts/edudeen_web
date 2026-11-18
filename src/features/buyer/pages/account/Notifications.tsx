import { NotificationsPanel } from '@/components/comman/ui';
import { AccountPageHeader } from './AccountPageHeader';

// Real route for what used to live behind Settings' ?tab=notifications —
// NotificationsPanel itself has no page-level heading, so this just adds one.
export function Notifications() {
  return (
    <div className="flex flex-col gap-5">
      <div className="hidden lg:block">
        <AccountPageHeader title="Notifications" description="Choose what you get notified about." />
      </div>
      <NotificationsPanel />
    </div>
  );
}
