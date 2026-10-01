import { io, type Socket } from 'socket.io-client';
import { getAuthCookie } from '@/utils/authCookie';
import { API_BASE_URL } from '@/api/apiBase';

/** One socket per call — caller owns its lifecycle (connect on mount, disconnect on cleanup). */
export function connectActivityLogSocket(): Socket {
  const token = getAuthCookie('accessToken');
  const base = API_BASE_URL;
  return io(`${base}/activity-log`, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
}
