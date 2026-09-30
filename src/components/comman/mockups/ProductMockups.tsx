import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import {
  ShoppingCart, Check,
  TrendingUp, TrendingDown, Users, Package, DollarSign,
  Bell, PackageCheck,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { PhoneShell, StatusBar } from '@/components/comman/ui/AppDownloadBanner';
import { unsplashUrl } from '@/assets/stockPhotos';

// ── Shared "browser chrome" strip reused by every desktop-shaped mockup ──────
function BrowserChrome({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-cream border-b border-bone">
      <span className="size-[7px] rounded-full bg-[#e5675b]" />
      <span className="size-[7px] rounded-full bg-[#66AD36]" />
      <span className="size-[7px] rounded-full bg-[#59c26a]" />
      <span className="ml-2 text-[10px] text-slate truncate">{label}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// StorefrontPreview — a real-looking storefront: nav, hero banner, product
// grid with real product photography. Illustrative UI only (fixed demo
// copy/prices), same convention already used by Homepage's showcase mockups.
// ────────────────────────────────────────────────────────────────────────────
const STORE_PRODUCTS = [
  { name: 'The Noble Quran (Tajweed)', price: '$24', img: 'quran' as const },
  { name: 'Arabic for Beginners Course', price: '$39', img: 'onlineStudy' as const },
  { name: 'Grade 5 Maths Worksheets', price: '$9', img: 'examPaper' as const },
  { name: 'A5 Study Notebook Set',  price: '$12', img: 'notebookPen' as const },
];

export function StorefrontPreview({ className }: { className?: string }) {
  return (
    <div className={clsx('w-full rounded-2xl bg-white overflow-hidden shadow-raised border border-bone', className)}>
      <BrowserChrome label="yourstore.edudeen.com" />
      <div className="flex items-center justify-between px-4 py-3 border-b border-bone">
        <span className="text-[13px] font-bold text-carbon">Noor Learning</span>
        <div className="hidden sm:flex items-center gap-4 text-[10.5px] text-slate">
          <span>Books</span><span>Courses</span><span>About</span>
        </div>
        <ShoppingCart size={14} className="text-carbon" />
      </div>
      <div className="h-[80px] sm:h-[100px] bg-gradient-to-br from-brand-orange to-brand-deep-orange relative flex items-center px-5">
        <div>
          <p className="text-white font-bold text-[13px] sm:text-[15px] leading-tight">Back to School</p>
          <p className="text-white/80 text-[9.5px] sm:text-[10.5px] mt-0.5">Up to 30% off books and course bundles</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[10px] p-4">
        {STORE_PRODUCTS.map(p => (
          <div key={p.name} className="rounded-lg overflow-hidden bg-cream group">
            <div className="aspect-square overflow-hidden">
              <img src={unsplashUrl(p.img, 240)} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="p-[7px]">
              <p className="text-[9.5px] font-semibold text-carbon truncate">{p.name}</p>
              <p className="text-[10px] font-bold text-brand-orange">{p.price}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SellerDashboardPreview — metrics row + chart + recent orders + top products.
// ────────────────────────────────────────────────────────────────────────────
const CHART_BARS = [30, 45, 38, 60, 52, 70, 64, 80, 74, 90, 82, 96];
const RECENT_ORDERS = [
  { id: '#3921', customer: 'M. Ahmed', amount: 'Rs 4,200', status: 'Paid' },
  { id: '#3920', customer: 'S. Khan',  amount: 'Rs 1,850', status: 'Packed' },
  { id: '#3919', customer: 'A. Raza',  amount: 'Rs 6,400', status: 'Paid' },
];
const TOP_PRODUCTS = [
  { name: 'Tajweed Basics Course',   units: 84,  img: 'quran' as const },
  { name: 'Grade 5 Maths Workbook',  units: 61,  img: 'examPaper' as const },
  { name: 'Stationery Starter Kit',  units: 52,  img: 'stationery' as const },
];

export function SellerDashboardPreview({ className }: { className?: string }) {
  return (
    <div className={clsx('w-full rounded-2xl bg-white overflow-hidden shadow-raised border border-bone', className)}>
      <BrowserChrome label="yourstore — dashboard" />
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-bold text-carbon">Overview</p>
          <span className="text-[9.5px] text-slate border border-bone rounded-md px-2 py-1">Last 30 days</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-[8px] mb-4">
          {[
            { label: 'Revenue',   value: '$18.4k', trend: '+12%', up: true,  Icon: DollarSign },
            { label: 'Orders',    value: '412',    trend: '+8%',  up: true,  Icon: Package },
            { label: 'Customers', value: '1,204',  trend: '+5%',  up: true,  Icon: Users },
            { label: 'Refunds',   value: '1.2%',    trend: '-0.4%', up: false, Icon: TrendingDown },
          ].map(({ label, value, trend, up, Icon }) => (
            <div key={label} className="rounded-lg bg-cream p-2.5">
              <div className="flex items-center justify-between mb-1">
                <Icon size={12} className="text-slate" />
                <span className={clsx('flex items-center gap-[2px] text-[8.5px] font-semibold', up ? 'text-success' : 'text-error')}>
                  {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}{trend}
                </span>
              </div>
              <p className="text-[13px] font-bold text-carbon leading-tight">{value}</p>
              <p className="text-[8.5px] text-slate leading-tight">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-end gap-[3px] h-[52px] mb-5 px-1">
          {CHART_BARS.map((h, i) => (
            <div key={i} className="flex-1 rounded-t-[2px] bg-gradient-to-t from-brand-orange to-brand-deep-orange/60" style={{ height: `${h}%` }} />
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[10.5px] font-bold text-carbon mb-2">Recent Orders</p>
            <div className="flex flex-col gap-[6px]">
              {RECENT_ORDERS.map(o => (
                <div key={o.id} className="flex items-center justify-between text-[9.5px]">
                  <span className="text-slate">{o.id} · {o.customer}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-semibold text-carbon">{o.amount}</span>
                    <span className={clsx('text-[8px] font-bold px-[6px] py-[1px] rounded-full', o.status === 'Paid' ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning')}>{o.status}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10.5px] font-bold text-carbon mb-2">Top Products</p>
            <div className="flex flex-col gap-[6px]">
              {TOP_PRODUCTS.map(p => (
                <div key={p.name} className="flex items-center gap-2">
                  <img src={unsplashUrl(p.img, 60)} alt="" className="w-5 h-5 rounded-md object-cover shrink-0" loading="lazy" />
                  <span className="text-[9.5px] text-charcoal truncate flex-1">{p.name}</span>
                  <span className="text-[9.5px] font-semibold text-slate shrink-0">{p.units} sold</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// AnalyticsPreview — a focused single sales chart + KPI strip (distinct from
// the fuller SellerDashboardPreview, for contexts that just need "analytics").
// ────────────────────────────────────────────────────────────────────────────
export function AnalyticsPreview({ className }: { className?: string }) {
  return (
    <div className={clsx('w-full rounded-2xl bg-white overflow-hidden shadow-raised border border-bone p-5', className)}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[12.5px] font-bold text-carbon">Store Revenue</p>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-success"><TrendingUp size={11} /> 24% vs last month</span>
      </div>
      <div className="flex items-end gap-[4px] h-[70px] mb-4">
        {[35, 55, 42, 70, 50, 85, 62, 78, 90, 66, 74, 96].map((h, i) => (
          <div key={i} className="flex-1 rounded-t-[3px] bg-gradient-to-t from-brand-orange to-brand-deep-orange/70" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Revenue', value: '$18.4k' },
          { label: 'Orders', value: '412' },
          { label: 'Avg. Order', value: '$44.60' },
        ].map(s => (
          <div key={s.label} className="rounded-lg bg-cream px-2.5 py-2 text-center">
            <p className="text-[13px] font-bold text-carbon">{s.value}</p>
            <p className="text-[9px] text-slate">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MobileStorePreview — a mobile storefront screen inside the shared PhoneShell.
// ────────────────────────────────────────────────────────────────────────────
export function MobileStorePreview({ className }: { className?: string }) {
  return (
    <PhoneShell className={className}>
      <StatusBar />
      <div className="px-[10px] pt-[6px]">
        <div className="flex items-center justify-between mb-[10px]">
          <span className="text-[10px] font-bold text-carbon">Noor Learning</span>
          <div className="flex items-center gap-[6px]">
            <Bell size={11} className="text-charcoal" />
            <ShoppingCart size={11} className="text-charcoal" />
          </div>
        </div>
        <div className="h-[46px] rounded-[8px] bg-gradient-to-br from-brand-orange to-brand-deep-orange mb-[8px] flex items-center px-[10px]">
          <p className="text-white text-[9px] font-bold leading-tight">30% off<br />Course Bundles</p>
        </div>
        <div className="grid grid-cols-2 gap-[6px]">
          {(['quran', 'bookStack', 'notebookPen', 'stationery'] as const).map(key => (
            <div key={key} className="rounded-[6px] overflow-hidden bg-cream">
              <div className="aspect-square overflow-hidden">
                <img src={unsplashUrl(key, 140)} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-[5px]">
                <div className="h-[4px] w-[70%] rounded-full bg-bone mb-[3px]" />
                <div className="h-[4px] w-[40%] rounded-full bg-brand-pale-orange" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// InventoryPreview — stock levels + a real low-stock alert + restock action.
// Distinct from SellerDashboardPreview (which the Inventory tab previously,
// wrongly, reused verbatim) — this shows the actual inventory concept: stock
// counts moving toward zero, not orders/revenue.
// ────────────────────────────────────────────────────────────────────────────
const STOCK_LEVELS = [
  { name: 'Mushaf — Hardback, 15-line', img: 'quran' as const,      stock: 84, pct: 84 },
  { name: 'Science Textbook, 3rd ed.',  img: 'bookSpines' as const, stock: 12, pct: 12 },
  { name: 'A5 Ruled Notebooks (5-pack)', img: 'notebookPen' as const, stock: 52, pct: 52 },
  { name: 'Seerah Reader — Paperback',  img: 'openBooks' as const,  stock: 4,  pct: 4 },
];

export function InventoryPreview({ className }: { className?: string }) {
  return (
    <div className={clsx('w-full rounded-2xl bg-white overflow-hidden shadow-raised border border-bone', className)}>
      <BrowserChrome label="yourstore — inventory" />
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12.5px] font-bold text-carbon">Stock levels</p>
          <span className="text-[9.5px] text-slate">4 products</span>
        </div>
        <div className="flex flex-col gap-2.5 mb-3">
          {STOCK_LEVELS.map(item => {
            const low = item.stock <= 15;
            return (
              <div key={item.name} className="flex items-center gap-2.5">
                <img src={unsplashUrl(item.img, 60)} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10.5px] font-medium text-charcoal truncate">{item.name}</span>
                    <span className={clsx('text-[10px] font-bold shrink-0', low ? 'text-error' : 'text-carbon')}>{item.stock} left</span>
                  </div>
                  <div className="h-[4px] rounded-full bg-bone overflow-hidden">
                    <div className={clsx('h-full rounded-full', low ? 'bg-error' : 'bg-brand-orange')} style={{ width: `${Math.min(100, item.pct)}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="rounded-lg bg-error-bg p-2.5 flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-md bg-white flex items-center justify-center shrink-0">
            <PackageCheck size={13} className="text-error" />
          </span>
          <span className="text-[10.5px] text-error flex-1">"Seerah Reader — Paperback" is almost out of stock</span>
          <button className="text-[9.5px] font-semibold text-white bg-error rounded-md px-2 py-1 shrink-0">Restock</button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// OrdersTimelinePreview — an order's real lifecycle (New → Processing →
// Shipped → Delivered), auto-advancing, plus a customer's real order
// history list. Distinct from SellerDashboardPreview's "recent orders" row.
// ────────────────────────────────────────────────────────────────────────────
const ORDER_STAGES = ['New', 'Processing', 'Shipped', 'Delivered'];
const CUSTOMER_ORDERS = [
  { customer: 'M. Ahmed', orders: 4, spent: 'Rs 18,400' },
  { customer: 'S. Khan',  orders: 2, spent: 'Rs 6,150' },
  { customer: 'A. Raza',  orders: 7, spent: 'Rs 31,900' },
];

export function OrdersTimelinePreview({ className }: { className?: string }) {
  const [stageIndex, setStageIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setStageIndex(i => (i + 1) % ORDER_STAGES.length), 1500);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <div className={clsx('w-full rounded-2xl bg-white overflow-hidden shadow-raised border border-bone', className)}>
      <BrowserChrome label="yourstore — orders" />
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[12.5px] font-bold text-carbon">Order #3921</p>
          <span className="text-[10px] font-semibold text-brand-orange">Rs 4,200</span>
        </div>

        <div className="relative flex items-center justify-between mb-5 px-1">
          <div className="absolute left-0 right-0 top-[9px] h-[2px] bg-bone" />
          <motion.div
            className="absolute left-0 top-[9px] h-[2px] bg-brand-orange"
            animate={{ width: `${(stageIndex / (ORDER_STAGES.length - 1)) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
          {ORDER_STAGES.map((s, i) => (
            <div key={s} className="relative z-[1] flex flex-col items-center gap-1.5">
              <span className={clsx(
                'w-[18px] h-[18px] rounded-full flex items-center justify-center transition-colors duration-300',
                i <= stageIndex ? 'bg-brand-orange' : 'bg-bone',
              )}>
                {i <= stageIndex && <Check size={10} className="text-white" />}
              </span>
              <span className={clsx('text-[8.5px] font-semibold whitespace-nowrap transition-colors duration-300', i === stageIndex ? 'text-brand-orange' : i < stageIndex ? 'text-carbon' : 'text-slate')}>{s}</span>
            </div>
          ))}
        </div>

        <p className="text-[10px] font-bold text-slate uppercase tracking-[0.06em] mb-2">Top customers</p>
        <div className="flex flex-col gap-[6px]">
          {CUSTOMER_ORDERS.map(c => (
            <div key={c.customer} className="flex items-center justify-between text-[10px]">
              <span className="text-charcoal">{c.customer}</span>
              <span className="text-slate">{c.orders} orders</span>
              <span className="font-semibold text-carbon">{c.spent}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Single source of truth for "which mockup represents this platform-
// product slug" — previously duplicated identically in Homepage.tsx (twice)
// and PublicMegaNavbar.tsx; every caller now imports this instead. ──
export function mockupForProductSlug(slug: string) {
  switch (slug) {
    case 'store-builder': return <StorefrontPreview />;
    case 'analytics':      return <AnalyticsPreview />;
    case 'inventory':      return <InventoryPreview />;
    default:               return <OrdersTimelinePreview />; // orders-customers
  }
}
