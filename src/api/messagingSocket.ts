import { io, type Socket } from 'socket.io-client';
import { getAuthCookie } from '@/utils/authCookie';
import { API_BASE_URL } from '@/api/apiBase';

// Ref-counted singleton: several messaging hooks (conversation list, thread,
// message list) can be mounted at once while the messaging page is open —
// they all share one socket instead of opening one connection each.
let socket: Socket | null = null;
let refCount = 0;

export function acquireMessagingSocket(): Socket {
  if (!socket) {
    const token = getAuthCookie('accessToken');
    const base = API_BASE_URL;
    socket = io(`${base}/messaging`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
  }
  refCount++;
  return socket;
}

export function releaseMessagingSocket() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
}

/** Peek at the already-acquired socket for a one-off emit (e.g. typing) — does not affect refcount. */
export function getMessagingSocket(): Socket | null {
  return socket;
}
