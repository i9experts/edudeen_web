import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TokenStorage, type AppRole } from '@/api/services/auth';
import { Button } from '@/components/comman/ui/Button';

/** Shown for any URL that matches no route (instead of silently bouncing to the homepage). */
export function NotFoundPage() {
  usePageTitle('Page not found');
  const navigate = useNavigate();
  const role = TokenStorage.isLoggedIn() ? TokenStorage.getUser<{ role?: AppRole }>()?.role : undefined;
  const dashboard = role === 'admin' ? { label: 'Admin dashboard', path: '/admin' }
    : role === 'seller' ? { label: 'Seller dashboard', path: '/seller' }
    : role === 'user' ? { label: 'My account', path: '/account/dashboard' }
    : null;

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="max-w-[440px] text-center">
        <div className="mx-auto mb-5 size-16 rounded-full bg-brand-pale-orange flex items-center justify-center">
          <Compass size={28} className="text-brand-orange" />
        </div>
        <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-2">Error 404</p>
        <h1 className="font-serif text-[30px] text-carbon leading-tight mb-3">We couldn't find that page</h1>
        <p className="text-[14px] text-slate leading-[1.7] mb-7">
          The link may be old or mistyped. Let's get you back to something useful.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" size="md" onClick={() => navigate('/')}>Go to homepage</Button>
          {dashboard && <Button variant="outline" size="md" onClick={() => navigate(dashboard.path)}>{dashboard.label}</Button>}
        </div>
      </div>
    </div>
  );
}
