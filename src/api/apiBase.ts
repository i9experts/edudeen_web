/**
 * Base URL for API calls and sockets.
 *
 * Production builds call VITE_API_URL directly. In local dev pointed at a
 * remote API (e.g. https://api.edudeen.com), requests go to this dev server
 * instead and Vite forwards them (see `server.proxy` in vite.config.ts): the
 * live API refuses browser requests from a localhost origin (CORS), which made
 * every call — the marketplace products included — fail locally with a 500.
 */
const configured = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
const isLocalApi = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(configured);

export const API_BASE_URL: string = import.meta.env.DEV && configured && !isLocalApi ? '' : configured;

/** True when VITE_API_URL is missing entirely (a misconfigured build). */
export const API_URL_MISSING = !configured;
