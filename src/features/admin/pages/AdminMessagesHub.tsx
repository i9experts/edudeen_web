import { Suspense, lazy, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, MessageCircle, Inbox } from 'lucide-react';
import { TabBar } from '@/components/comman/ui';
import type { Tab } from '@/components/comman/ui';
import { usePageTitle } from '@/hooks/usePageTitle';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import { apiAdminChatStats } from '@/api/services/adminChat';

// Three message inboxes in one place: buyer-seller conversations, the Contact form, and the Help chat.
const AdminMessaging = lazy(() => import('./AdminMessaging').then(m => ({ default: m.AdminMessaging })));
const AdminContactMessages = lazy(() => import('./AdminContactMessages').then(m => ({ default: m.AdminContactMessages })));
const AdminChatInbox = lazy(() => import('./AdminChatInbox').then(m => ({ default: m.AdminChatInbox })));

type HubTab = 'chat' | 'contact' | 'conversations';

export function AdminMessagesHub() {
  usePageTitle('Messages');
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: HubTab = raw === 'contact' || raw === 'conversations' ? raw : 'chat';
  const [unreadChats, setUnreadChats] = useState(0);

  useEffect(() => {
    let alive = true;
    apiAdminChatStats().then(r => { if (alive) setUnreadChats(r.data?.unread ?? 0); }).catch(() => { /* older API: no badge */ });
    return () => { alive = false; };
  }, [tab]);

  const tabs: Tab[] = [
    { id: 'chat', label: unreadChats > 0 ? `Chat inbox (${unreadChats})` : 'Chat inbox', icon: <Inbox size={14} /> },
    { id: 'contact', label: 'Contact form', icon: <MessageCircle size={14} /> },
    { id: 'conversations', label: 'Buyer–seller messages', icon: <MessageSquare size={14} /> },
  ];

  const go = (id: string) => {
    // Switching tabs drops the other tab's own filters (?filter=, ?id=, ...).
    setParams({ tab: id }, { replace: true });
  };

  return (
    <div>
      <AdminStudioHeader eyebrow="Edudeen team workspace · People" title="Messages" subtitle="Chat questions, Contact form messages and buyer–seller conversations in one place." />
      <div className="px-4 sm:px-7 pt-4"><TabBar tabs={tabs} active={tab} onChange={go} /></div>
      <Suspense fallback={<div className="px-4 sm:px-7 py-6 text-[13px] text-slate">Loading…</div>}>
        {tab === 'chat' ? <AdminChatInbox embedded /> : tab === 'contact' ? <AdminContactMessages embedded /> : <AdminMessaging embedded />}
      </Suspense>
    </div>
  );
}
