import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Heart, Bell, MapPin, Package, ChevronRight,
  ShieldCheck, Mail, UserCog, Sparkles, ArrowRight, Store,
} from 'lucide-react';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { useGetProfile } from '@/hooks/auth/useGetProfile';
import { TokenStorage } from '@/api/services/auth';
import { useWishlistContext } from '@/contexts/WishlistContext';
import { useNotification } from '@/contexts/NotificationContext';
import { apiGetMyOrders, type OrderSummary, type OrderStatus } from '@/api/services/orders';
import { apiGetMyAddresses } from '@/api/services/address';
import { Card, MetricCard, PageHeader, Badge, ProgressBar, Button, SkeletonBox, EmptyState, Avatar } from '@/components/comman/ui';
import { currencySymbol } from '@/utils/currency';
import { useNavGroups } from '@/components/layouts/AccountLayout';

const STATUS_COLOR: Record<OrderStatus, 'orange' | 'blue' | 'green' | 'red'> = {
  pending: 'orange', processing: 'blue', shipped: 'blue',
  delivered: 'green', completed: 'green', cancelled: 'red',
};

function RecentOrderRow({ order }: { order: OrderSummary }) {
  const navigate = useNavigate();
  const itemCount = (order.stores ?? []).reduce((n, s) => n + s.itemCount, 0);
  return (
    <button
      onClick={() => navigate(`/account/orders/${order.orderId}`)}
      className="group w-full flex items-center gap-3 px-4 py-3 text-start bg-transparent border-none cursor-pointer hover:bg-cream transition-colors rounded-[10px]"
    >
      <div className="w-9 h-9 rounded-[9px] bg-brand-pale-orange flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110">
        <Package size={14} className="text-brand-orange" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-charcoal truncate">{order.orderNumber}</p>
        <p className="text-[11px] text-slate mt-[1px]">
          {new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} · {itemCount} item{itemCount !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge color={STATUS_COLOR[order.orderStatus]} size="sm" className="capitalize">{order.orderStatus}</Badge>
        <span className="text-[12.5px] font-bold text-carbon whitespace-nowrap">
          {currencySymbol(order.currency)} {order.totalAmount.toLocaleString()}
        </span>
        <ChevronRight size={13} className="text-bone shrink-0 transition-transform duration-200 group-hover:translate-x-[2px] group-hover:text-brand-orange" />
      </div>
    </button>
  );
}

function WishlistPreviewImg({ src, name }: { src?: string; name: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return <ProductCoverFallback name={name} size="xs" className="w-12 h-12 rounded-[9px] shrink-0" />;
  }
  return <img loading="lazy" decoding="async" src={src} alt={name} onError={() => setErr(true)} className="w-12 h-12 rounded-[9px] object-cover shrink-0 border border-[#edebe2]" />;
}

// ── Welcome hero — the storefront's own hero language (pale blue panel,
// royal-blue eyebrow, serif greeting, navy primary + white secondary
// button), so the account area reads as part of the same site. ──
function WelcomeHero({ name, image, memberSince }: { name?: string; image?: string | null; memberSince: string }) {
  const navigate = useNavigate();
  const firstName = name?.split(' ')[0];
  const displayName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : '';
  return (
    <div className="dash-section-enter relative overflow-hidden rounded-[18px] bg-[#eaf2f8] px-6 py-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
      <div className="relative flex items-center gap-4 flex-1 min-w-0">
        {image ? (
          <img
            loading="lazy" decoding="async"
            src={image} alt={name ?? 'You'}
            className="size-14 rounded-full object-cover ring-4 ring-white shrink-0"
          />
        ) : (
          <div className="size-14 rounded-full bg-white ring-4 ring-white flex items-center justify-center shrink-0">
            <Avatar name={name ?? 'You'} size={48} />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[11px] sm:text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-1.5">Your Edudeen account</p>
          <p className="font-serif font-normal text-[24px] sm:text-[30px] text-carbon leading-[1.15] tracking-[-0.5px] truncate">
            Welcome back{displayName ? `, ${displayName}` : ''}.
          </p>
          <p className="text-[13px] text-graphite mt-1">Member since {memberSince}</p>
        </div>
      </div>

      <div className="relative flex items-center gap-2 flex-wrap shrink-0">
        <button
          onClick={() => navigate('/account/orders')}
          className="bg-white text-brand-orange border border-[#c5d2db] rounded-lg px-5 py-[10px] text-[14px] font-bold cursor-pointer hover:brightness-95"
        >
          Track orders
        </button>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 bg-brand-orange text-white border border-brand-orange rounded-lg px-5 py-[10px] text-[14px] font-bold cursor-pointer hover:brightness-95"
        >
          <Store size={15} /> Continue shopping
        </button>
      </div>
    </div>
  );
}

// ── Mobile-only profile hero — centered avatar/name/email/role badge on a
// gradient, with a stats strip overlapping its bottom edge (rounded-top
// white sheet pulled up over the gradient) — the native-app "profile tab"
// pattern, distinct from desktop's left-aligned WelcomeHero further down.
function MobileProfileHero({
  name, email, image, totalOrders, wishlistCount, addressCount, isLoggedIn, onSignIn,
}: {
  name?: string; email?: string; image?: string | null;
  totalOrders: number | null; wishlistCount: number; addressCount: number | null;
  isLoggedIn: boolean; onSignIn: () => void;
}) {
  return (
    <div className="lg:hidden -mx-4 -mt-4">
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-orange via-[#4E8F28] to-brand-royal px-6 pt-8 pb-12 flex flex-col items-center text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }}
        />
        {!isLoggedIn ? (
          <>
            {/* Guest state — same hero shape/height as the signed-in one (so
               the stats sheet below still lands in the same place), but the
               identity block is swapped for a sign-in prompt instead of
               showing a blank/fake name. */}
            <div className="relative size-24 rounded-full bg-white/15 ring-4 ring-white/40 flex items-center justify-center">
              <UserCog size={34} className="text-white" />
            </div>
            <p className="relative text-[19px] font-bold text-white mt-3 leading-tight">Welcome to Edudeen</p>
            <button
              onClick={onSignIn}
              className="relative mt-3 px-5 py-[8px] rounded-full bg-white text-brand-deep-orange text-[13px] font-bold cursor-pointer border-none"
            >
              Sign in or Register
            </button>
          </>
        ) : (
          <>
            {image ? (
              <img
                loading="lazy" decoding="async"
                src={image} alt={name ?? 'You'}
                className="relative size-24 rounded-full object-cover ring-4 ring-white/40"
              />
            ) : (
              <div className="relative size-24 rounded-full bg-white/15 ring-4 ring-white/40 flex items-center justify-center">
                <Avatar name={name ?? 'You'} size={80} />
              </div>
            )}
            <p className="relative text-[19px] font-bold text-white mt-3 leading-tight">{name ?? 'Welcome'}</p>
            {email && <p className="relative text-[13px] text-white/75 mt-[2px]">{email}</p>}
            <span className="relative inline-flex mt-3 px-4 py-[6px] rounded-full bg-white/20 text-[11px] font-semibold text-white">
              Buyer Account
            </span>
          </>
        )}
      </div>

      <div className="relative -mt-6 mx-4 rounded-t-[24px] bg-white px-2 pt-5 pb-4 flex items-center">
        <div className="flex-1 flex flex-col items-center gap-[2px]">
          <span className="text-[19px] font-bold text-brand-orange leading-none">{totalOrders ?? 0}</span>
          <span className="text-[11px] text-slate">Orders</span>
        </div>
        <div className="w-px h-9 bg-bone" />
        <div className="flex-1 flex flex-col items-center gap-[2px]">
          <span className="text-[19px] font-bold text-brand-orange leading-none">{wishlistCount}</span>
          <span className="text-[11px] text-slate">Wishlist</span>
        </div>
        <div className="w-px h-9 bg-bone" />
        <div className="flex-1 flex flex-col items-center gap-[2px]">
          <span className="text-[19px] font-bold text-brand-orange leading-none">{addressCount ?? 0}</span>
          <span className="text-[11px] text-slate">Addresses</span>
        </div>
      </div>
    </div>
  );
}

// ── Mobile-only navigation menu — a flat, grouped list of every account
// destination (icon + label + chevron, matching the native-app "account
// home" pattern), reusing AccountLayout's own nav data so there's exactly
// one source of truth for what's in the account section. Desktop already
// has this as the persistent sidebar rail, so this renders lg:hidden only.
function MobileAccountMenu({ isLoggedIn }: { isLoggedIn: boolean }) {
  const navigate = useNavigate();
  // Buyer accounts get no seller sign-up link here — a buyer can't open a store.
  const navGroups = useNavGroups().filter(g => g.group !== 'Overview');

  return (
    <div className="lg:hidden flex flex-col gap-4">
      {navGroups.map(section => (
        <Card key={section.group} padding="none" className="rounded-2xl overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <p className="text-[10.5px] font-bold text-slate uppercase tracking-[0.06em]">{section.group}</p>
          </div>
          <div className="divide-y divide-[#f5f4ef]">
            {section.items.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  // Absolute path (`/sellers`) — a public page open to
                  // anyone, so it navigates directly regardless of login;
                  // every other (relative) item here needs a real account,
                  // so a guest goes to `/login` instead of a page that
                  // would just 401 out from under them anyway.
                  if (item.path.startsWith('/')) { navigate(item.path); return; }
                  navigate(isLoggedIn ? `/account/${item.path}` : '/login');
                }}
                className="w-full flex items-center gap-3 px-5 py-[13px] bg-transparent border-0 cursor-pointer text-start hover:bg-cream transition-colors"
              >
                <div className="w-8 h-8 rounded-[9px] bg-brand-pale-orange flex items-center justify-center shrink-0">
                  <item.Icon size={15} className="text-brand-orange" />
                </div>
                <span className="flex-1 text-[13px] font-medium text-charcoal">{item.label}</span>
                {!!item.badge && item.badge > 0 && (
                  <span className="text-[10px] font-bold px-[7px] py-[2px] rounded-full bg-brand-orange text-white shrink-0">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
                <ChevronRight size={15} className="text-slate shrink-0" />
              </button>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function AccountDashboard() {
  const navigate = useNavigate();
  const isLoggedIn = TokenStorage.isLoggedIn();
  const { profile } = useGetProfile();
  const { wishlistItems, wishlistCount, loading: wishlistLoading } = useWishlistContext();
  const { unreadCount } = useNotification();

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [totalOrders, setTotalOrders] = useState<number | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(isLoggedIn);
  const [addressCount, setAddressCount] = useState<number | null>(null);

  useEffect(() => {
    // Guest: skip these entirely — they'd just 401 (and trip the global
    // logout-on-401 interceptor) for data that only ever existed for a
    // signed-in account anyway.
    if (!isLoggedIn) return;
    let cancelled = false;
    apiGetMyOrders({ page: 1, limit: 3 })
      .then(res => {
        if (cancelled) return;
        setOrders(res.data.orders ?? []);
        setTotalOrders(res.data.pagination?.total ?? (res.data.orders ?? []).length);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setOrdersLoading(false); });
    apiGetMyAddresses()
      .then(res => { if (!cancelled) setAddressCount((res.data ?? []).length); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  const completionChecks = [
    !!profile?.name,
    !!profile?.phone,
    !!addressCount,
    !!profile?.profileImage,
    !!profile?.isVerified,
  ];
  const completionPct = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : '—';

  return (
    <div className="flex flex-col gap-5">
      <MobileProfileHero
        name={profile?.name}
        email={profile?.email}
        image={profile?.profileImage}
        totalOrders={totalOrders}
        wishlistCount={wishlistCount}
        addressCount={addressCount}
        isLoggedIn={isLoggedIn}
        onSignIn={() => navigate('/login')}
      />

      <div className="hidden lg:block">
        <WelcomeHero name={profile?.name} image={profile?.profileImage} memberSince={memberSince} />
      </div>

      <MobileAccountMenu isLoggedIn={isLoggedIn} />

      {/* Summary cards — desktop only; the mobile profile hero above already
         shows Orders/Wishlist/Addresses in its own stats strip, so this grid
         would just repeat the same three numbers a second time on mobile. */}
      <div className="hidden lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard
          label="Total Orders"
          value={totalOrders ?? 0}
          loading={ordersLoading}
          icon={<ShoppingBag size={16} />}
        />
        <MetricCard
          label="Wishlist Items"
          value={wishlistCount}
          loading={wishlistLoading}
          icon={<Heart size={16} />}
        />
        <MetricCard
          label="Saved Addresses"
          value={addressCount ?? 0}
          loading={addressCount === null}
          icon={<MapPin size={16} />}
        />
        <MetricCard
          label="Unread Alerts"
          value={unreadCount}
          icon={<Bell size={16} />}
        />
      </div>

      {/* Recent Orders / Wishlist Preview / Account Completion / Security
         Status / Quick Actions — desktop only. On mobile the profile hero +
         menu list above already cover navigation, and these are dashboard-
         style widgets that just add clutter to what's meant to be a clean
         native-app menu screen there. */}
      <div className="hidden lg:grid dash-section-enter grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="min-w-0 flex flex-col gap-5">
          {/* Recent orders */}
          <Card padding="none">
            <div className="px-5 pt-5 pb-3 border-b border-bone">
              <PageHeader
                title="Recent Orders"
                actions={
                  <Button variant="ghost" size="sm" iconRight={<ArrowRight size={13} />} onClick={() => navigate('/account/orders')}>
                    View all
                  </Button>
                }
              />
            </div>
            {ordersLoading ? (
              <div className="p-4 flex flex-col gap-2">
                {[1, 2, 3].map(i => <SkeletonBox key={i} height={56} rounded="10px" />)}
              </div>
            ) : orders.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag size={26} className="text-brand-orange opacity-55" />}
                title="No orders yet"
                description="Your recent purchases will show up here."
                action={{ label: 'Browse resources', onClick: () => navigate('/'), icon: <Store size={13} /> }}
                className="py-9"
              />
            ) : (
              <div className="px-2 pb-2 flex flex-col">
                {orders.map(o => <RecentOrderRow key={o.orderId} order={o} />)}
              </div>
            )}
          </Card>

          {/* Wishlist preview */}
          <Card padding="none">
            <div className="px-5 pt-5 pb-3 border-b border-bone">
              <PageHeader
                title="Wishlist Preview"
                actions={
                  <Button variant="ghost" size="sm" iconRight={<ArrowRight size={13} />} onClick={() => navigate('/account/wishlist')}>
                    View all
                  </Button>
                }
              />
            </div>
            {wishlistLoading ? (
              <div className="p-4 flex gap-3">
                {[1, 2, 3].map(i => <SkeletonBox key={i} width={72} height={72} rounded="10px" />)}
              </div>
            ) : wishlistCount === 0 ? (
              <EmptyState
                icon={<Heart size={26} className="text-brand-orange opacity-55" />}
                title="Wishlist is empty"
                description="Save products you love and find them here."
                className="py-9"
              />
            ) : (
              <div className="px-5 pb-5 pt-1 flex gap-3 flex-wrap">
                {wishlistItems.slice(0, 4).map(item => (
                  <button
                    key={item.product._id}
                    onClick={() => navigate(`/product/${item.product.slug}`)}
                    className="group flex flex-col items-start gap-1.5 bg-transparent border-none cursor-pointer p-0 text-start w-[84px] transition-transform duration-200 hover:-translate-y-[2px]"
                  >
                    <div className="overflow-hidden rounded-[10px]">
                      <WishlistPreviewImg src={item.product.images?.[0]} name={item.product.name} />
                    </div>
                    <p className="text-[11px] text-charcoal font-medium line-clamp-2 leading-tight group-hover:text-brand-orange transition-colors">{item.product.name}</p>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-5 min-w-0">
          {/* Account completion */}
          <Card>
            <p className="text-[12px] font-semibold text-charcoal mb-3 flex items-center gap-1.5">
              <UserCog size={13} className="text-brand-orange" /> Account Completion
            </p>
            <ProgressBar value={completionPct} showValue color={completionPct === 100 ? 'green' : 'orange'} />
            <p className="text-[11px] text-slate mt-3 leading-relaxed">
              {completionPct === 100
                ? 'Your profile is fully set up.'
                : 'Complete your profile for a smoother checkout experience.'}
            </p>
            {completionPct < 100 && (
              <Button variant="outline" size="sm" fullWidth className="mt-3" onClick={() => navigate('/account/profile')}>
                Complete Profile
              </Button>
            )}
          </Card>

          {/* Security status */}
          <Card>
            <p className="text-[12px] font-semibold text-charcoal mb-3 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-brand-orange" /> Security Status
            </p>
            <div className="flex items-center gap-2 mb-2.5">
              <Mail size={13} className={profile?.isVerified ? 'text-success' : 'text-slate'} />
              <span className="text-[12px] text-graphite flex-1">Email verification</span>
              <Badge color={profile?.isVerified ? 'green' : 'gray'} size="sm">
                {profile?.isVerified ? 'Verified' : 'Unverified'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mb-3.5">
              <ShieldCheck size={13} className={profile?.hasPassword === false ? 'text-slate' : 'text-success'} />
              <span className="text-[12px] text-graphite flex-1">Password protection</span>
              {profile?.hasPassword === false
                ? <Badge color="gray" size="sm">Not set</Badge>
                : <Badge color="green" size="sm">Active</Badge>}
            </div>
            <Button variant="outline" size="sm" fullWidth onClick={() => navigate('/account/security')}>
              Manage Security
            </Button>
          </Card>

          {/* Quick actions — desktop only; on mobile MobileAccountMenu above
             already covers every one of these destinations (and more), so
             this would just be a second, redundant copy of the same links. */}
          <Card className="hidden lg:block">
            <p className="text-[12px] font-semibold text-charcoal mb-3 flex items-center gap-1.5">
              <Sparkles size={13} className="text-brand-orange" /> Quick Actions
            </p>
            <div className="flex flex-col gap-1.5">
              {[
                { label: 'Edit Profile',      path: '/account/profile',      Icon: UserCog },
                { label: 'Add New Address',   path: '/account/addresses',    Icon: MapPin },
                { label: 'Track Orders',      path: '/account/orders',       Icon: Package },
                { label: 'Notification Settings', path: '/account/notifications', Icon: Bell },
                { label: 'Browse resources',   path: '/',         Icon: Store },
              ].map(a => (
                <button
                  key={a.path}
                  onClick={() => navigate(a.path)}
                  className="group w-full flex items-center gap-2.5 px-3 py-[9px] rounded-[8px] text-[12.5px] text-charcoal bg-cream hover:bg-brand-pale-orange border-none cursor-pointer transition-colors"
                >
                  <a.Icon size={14} className="text-brand-orange shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  <span className="flex-1 text-start">{a.label}</span>
                  <ChevronRight size={13} className="text-slate shrink-0 transition-transform duration-200 group-hover:translate-x-[2px]" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
