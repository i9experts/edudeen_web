import type { EducatorProfile } from '@/api/services/store';
import type { StoreReturnPolicy } from '@/utils/sellerTrust';
import { returnSummary } from '@/utils/sellerTrust';
import { EducatorCard, hasEducatorProfile } from '@/components/comman/marketplace/EducatorCard';

export interface StoreAboutData {
  name: string;
  aboutBio?: string | null;
  educatorProfile?: EducatorProfile | null;
  returnPolicy?: StoreReturnPolicy | null;
  verifiedEducator?: boolean;
}

/** The store's About content. Used by the buyer About tab AND the seller's live preview, so both always match. */
export function StoreAboutView({ data }: { data: StoreAboutData }) {
  const bio = data.aboutBio?.trim();
  const physical = returnSummary(data.returnPolicy, false);
  const digital = returnSummary(data.returnPolicy, true);
  const physicalNote = data.returnPolicy?.note?.trim();
  const digitalNote = data.returnPolicy?.digitalNote?.trim();

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-bone bg-white px-5 py-4">
        <h2 className="text-[15px] font-bold text-carbon mb-2">About {data.name}</h2>
        {bio
          ? <p className="text-[14px] text-graphite leading-relaxed whitespace-pre-line break-words">{bio}</p>
          : <p className="text-[13px] text-slate">This seller has not added an About text yet.</p>}
      </section>

      {hasEducatorProfile(data.educatorProfile) && (
        <EducatorCard profile={data.educatorProfile} verified={!!data.verifiedEducator} name={data.name} />
      )}

      <section className="rounded-2xl border border-bone bg-white px-5 py-4">
        <h2 className="text-[15px] font-bold text-carbon mb-3">Returns</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="min-w-0">
            <dt className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate">Physical items</dt>
            <dd className="text-[13.5px] font-semibold text-carbon mt-1">{physical.line}</dd>
            {physicalNote && <dd className="text-[13px] text-graphite mt-1 break-words">{physicalNote}</dd>}
          </div>
          <div className="min-w-0">
            <dt className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate">Digital downloads</dt>
            <dd className="text-[13.5px] font-semibold text-carbon mt-1">{digital.line}</dd>
            {digitalNote && <dd className="text-[13px] text-graphite mt-1 break-words">{digitalNote}</dd>}
          </div>
        </dl>
        <p className="text-[12px] text-slate mt-3">Seller-stated policy. Every request is reviewed; digital items can be refunded only before they are downloaded.</p>
      </section>
    </div>
  );
}

export function StoreAboutTab({ store }: { store: StoreAboutData }) {
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 max-w-[1480px] mx-auto w-full">
      <StoreAboutView data={store} />
    </div>
  );
}
