import client from '../client';
import { ENDPOINTS } from '../endpoints';

interface ApiResponse<T> { success: boolean; message?: string; data: T }

/** Public — no auth required. `source` records where the sign-up came from (footer / home newsletter / app-launch notify-me). */
export function apiSubscribeNewsletter(email: string, source: 'footer' | 'home' | 'app-notify' = 'footer') {
  return client.post<never, ApiResponse<null>>(ENDPOINTS.NEWSLETTER.SUBSCRIBE, { email, source });
}
