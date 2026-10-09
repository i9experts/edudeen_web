import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { TokenStorage } from '@/api/services/auth';
import { apiApplyReferralCode } from '@/api/services/retention';

const KEY = 'edudeen_ref';
const SHAPE = /^[A-HJ-NP-Z2-9]{8}$/;

const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (v: string | null) => { try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch { /* storage blocked: nothing to do */ } };

/**
 * Referral link support: `?ref=CODE` is remembered, and once the visitor is signed in as a buyer the code is applied
 * (the API enforces "new buyer, no orders yet, first 14 days"). The stored code is dropped after one attempt, so a
 * refused code is never retried on every page view.
 */
export function useReferralCapture() {
  const { search, pathname } = useLocation();

  useEffect(() => {
    const ref = new URLSearchParams(search).get('ref')?.trim().toUpperCase();
    if (ref && SHAPE.test(ref)) write(ref);
  }, [search]);

  useEffect(() => {
    const code = read();
    if (!code || !SHAPE.test(code)) { if (code) write(null); return; }
    if (!TokenStorage.isLoggedIn() || TokenStorage.getRole() !== 'user') return;
    write(null);
    apiApplyReferralCode(code).catch(() => { /* refused (too old, has orders, own code, programme off): fine */ });
  }, [pathname]);
}
