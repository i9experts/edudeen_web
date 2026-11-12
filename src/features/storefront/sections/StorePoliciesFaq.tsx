import { Link } from 'react-router-dom';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import type { StoreFaq } from '@/api/services/store';
import type { StoreReturnPolicy } from '@/utils/sellerTrust';
import { returnSummary } from '@/utils/sellerTrust';

export interface StorePoliciesData {
  returnPolicy?: StoreReturnPolicy | null;
  shippingNote?: string | null;
  faqs?: StoreFaq[] | null;
}

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-bone last:border-b-0">
      <summary className="flex items-center justify-between gap-3 py-3 min-h-11 cursor-pointer list-none text-[14px] font-semibold text-carbon [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 break-words">{title}</span>
        <ChevronDown size={16} className="shrink-0 text-slate transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="pb-3 text-[13.5px] text-graphite leading-relaxed whitespace-pre-line break-words">{children}</div>
    </details>
  );
}

/**
 * Seller-written Policies + FAQ accordions under the products. Hidden when the seller wrote nothing.
 * Seller text is shown as plain text (React escapes it) and the fixed buyer-protection line below it always wins.
 */
export function StorePoliciesFaq({ data }: { data: StorePoliciesData }) {
  const policy = data.returnPolicy;
  const shipping = data.shippingNote?.trim();
  const faqs = (data.faqs ?? []).filter(f => f?.q?.trim() && f?.a?.trim());
  const physicalNote = policy?.note?.trim();
  const digitalNote = policy?.digitalNote?.trim();

  const hasPolicies = !!policy || !!shipping;
  if (!hasPolicies && faqs.length === 0) return null;

  return (
    <section aria-label="Store policies and FAQ" className="px-4 sm:px-6 lg:px-10 pb-10 pt-2 max-w-[1480px] mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {hasPolicies && (
          <div className="rounded-2xl border border-bone bg-white px-5 py-3">
            <h2 className="text-[15px] font-bold text-carbon pt-1 pb-1">Store policies</h2>
            {policy && (
              <Item title="Returns: physical items">
                <p className="font-semibold text-carbon">{returnSummary(policy, false).line}</p>
                {physicalNote && <p className="mt-1">{physicalNote}</p>}
              </Item>
            )}
            {policy && (
              <Item title="Returns: digital downloads">
                <p className="font-semibold text-carbon">{returnSummary(policy, true).line}</p>
                {digitalNote && <p className="mt-1">{digitalNote}</p>}
              </Item>
            )}
            {shipping && <Item title="Shipping">{shipping}</Item>}
          </div>
        )}
        {faqs.length > 0 && (
          <div className="rounded-2xl border border-bone bg-white px-5 py-3">
            <h2 className="text-[15px] font-bold text-carbon pt-1 pb-1">Frequently asked questions</h2>
            {faqs.map((f, i) => <Item key={i} title={f.q}>{f.a}</Item>)}
          </div>
        )}
      </div>
      <p className="mt-4 flex items-center gap-2 text-[13px] text-graphite">
        <ShieldCheck size={15} className="text-success shrink-0" aria-hidden />
        <span>Edudeen buyer protection applies. <Link to="/returns" className="font-semibold text-brand-royal underline">Read the returns policy</Link></span>
      </p>
    </section>
  );
}
