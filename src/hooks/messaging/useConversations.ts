import { useState, useEffect, useCallback, useRef } from 'react';
import {
  apiListConversations, apiSearchConversations, apiStartConversation,
  type Conversation, type ListConversationsParams, type StartConversationPayload,
} from '@/api/services/messaging';
import { acquireMessagingSocket, releaseMessagingSocket } from '@/api/messagingSocket';
import { TokenStorage } from '@/api/services/auth';

// Several components on one page (sidebar badge, mobile menu, inbox) mount this
// hook at once - share one in-flight request instead of firing one each.
const inFlight = new Map<string, ReturnType<typeof apiListConversations>>();
function listShared(params: ListConversationsParams) {
  const key = JSON.stringify(params);
  const existing = inFlight.get(key);
  if (existing) return existing;
  const p = apiListConversations(params).finally(() => { inFlight.delete(key); });
  inFlight.set(key, p);
  return p;
}

export function useConversations(params?: ListConversationsParams) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const requestId = useRef(0);

  const storeId    = params?.storeId;
  const isArchived = params?.isArchived;
  const isPinned   = params?.isPinned;

  const refetch = useCallback(() => {
    // Guest: skip the call entirely — this fires unconditionally from
    // `useNavGroups` (AccountLayout, mounted for every `/account/*` route),
    // so without this a guest visiting e.g. `/account/dashboard` would 401
    // here and get yanked to `/login` by the global 401 interceptor before
    // ever seeing the page.
    if (!TokenStorage.isLoggedIn()) { setLoading(false); return Promise.resolve(); }
    const thisRequest = ++requestId.current;
    setLoading(true);
    return listShared({
      ...(storeId ? { storeId } : {}),
      ...(isArchived !== undefined ? { isArchived } : {}),
      ...(isPinned !== undefined ? { isPinned } : {}),
    })
      .then(res => { if (requestId.current === thisRequest) setConversations(res.conversations ?? []); })
      .catch((err: unknown) => { if (requestId.current === thisRequest) setError(err instanceof Error ? err.message : 'Failed to load conversations.'); })
      .finally(() => { if (requestId.current === thisRequest) setLoading(false); });
  }, [storeId, isArchived, isPinned]);

  useEffect(() => { refetch(); }, [refetch]);

  // Instant inbox updates: new message / read state bumps the conversation to
  // the top with fresh unread + lastMessage, no manual refresh needed.
  useEffect(() => {
    if (!TokenStorage.isLoggedIn()) return;
    const socket = acquireMessagingSocket();

    function handleUpdate(updated: Conversation) {
      if (storeId && updated.storeId !== storeId) return;
      // Respect the current archived/pinned filter — an update that no longer
      // matches (e.g. just got archived while viewing the "All" tab) drops out.
      if (isArchived !== undefined && updated.isArchived !== isArchived) {
        setConversations(prev => prev.filter(c => c._id !== updated._id));
        return;
      }
      setConversations(prev => {
        const rest = prev.filter(c => c._id !== updated._id);
        return [{ ...prev.find(c => c._id === updated._id), ...updated }, ...rest];
      });
    }

    socket.on('conversation:update', handleUpdate);
    return () => {
      socket.off('conversation:update', handleUpdate);
      releaseMessagingSocket();
    };
  }, [storeId, isArchived]);

  return { conversations, loading, error, refetch };
}

export function useSearchConversations() {
  const [results, setResults] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const requestId = useRef(0);

  async function search(q: string, storeId?: string) {
    const thisRequest = ++requestId.current;
    setError('');
    setLoading(true);
    try {
      const res = await apiSearchConversations({ q, storeId });
      if (requestId.current === thisRequest) setResults(res ?? []);
    } catch (err) {
      if (requestId.current === thisRequest) setError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      if (requestId.current === thisRequest) setLoading(false);
    }
  }

  return { results, search, loading, error };
}

export function useStartConversation() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function execute(payload: StartConversationPayload): Promise<Conversation | null> {
    setError('');
    setLoading(true);
    try {
      return await apiStartConversation(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start conversation.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { execute, loading, error };
}
