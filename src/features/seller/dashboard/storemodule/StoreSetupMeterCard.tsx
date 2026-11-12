import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { CircleCheck, Circle } from 'lucide-react';
import { storeSetupMeter, type MeterInput } from './storePageCompleteness';

/** The store-page meter on Store Settings: same seven checks as Customize store and the Dashboard card; each missing one links to its field. */
export function StoreSetupMeterCard({ storeId, store }: { storeId: string; store: MeterInput | null | undefined }) {
  if (!store) return null;
  const items = storeSetupMeter(store);
  const done = items.filter(i => i.done).length;
  return (
    <section aria-label="Store page completeness" className="rounded-xl border border-bone bg-white p-5 sm:col-span-2">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[13.5px] font-semibold text-charcoal m-0">Store page completeness</p>
        <span className="text-[13px] font-semibold text-carbon" aria-live="polite">{done}/{items.length}</span>
      </div>
      <div className="h-2 rounded-full bg-mist overflow-hidden mb-3" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done} aria-label="Store page completeness">
        <div className="h-full bg-brand-royal transition-[width] duration-300" style={{ width: `${Math.round((done / items.length) * 100)}%` }} />
      </div>
      {done === items.length ? (
        <p className="text-[12.5px] text-success m-0">All set. Your store page is complete.</p>
      ) : (
        <ul className="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
          {items.map(it => (
            <li key={it.key}>
              {it.done ? (
                <span className="flex items-center gap-2 py-2 min-h-[44px]">
                  <CircleCheck size={16} className="text-success shrink-0" />
                  <span className="text-[13px] text-slate line-through">{it.label}</span>
                </span>
              ) : (
                <Link to={`/store/${storeId}/${it.path}`} className="flex items-center gap-2 py-2 min-h-[44px] no-underline">
                  <Circle size={16} className="text-slate shrink-0" />
                  <span className="min-w-0">
                    <span className={clsx('block text-[13px] font-medium text-carbon')}>{it.label}</span>
                    <span className="block text-[12px] text-slate">{it.hint}</span>
                  </span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
