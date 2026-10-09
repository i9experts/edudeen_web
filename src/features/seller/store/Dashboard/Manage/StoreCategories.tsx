import { FolderTree, Tag } from 'lucide-react';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { useStoreSubcategories } from '@/hooks/store/useStoreSubcategories';
import { SkeletonBox } from '@/components/comman/ui';

// A store's main category is fixed at creation (assertValidRootCategory on
// the backend) — sellers can never change it or see other main categories
// here. Subcategories are platform-wide (shared by every store under the same
// main category), so the seller workspace only lists them; new ones are added
// by the Edudeen team, not by individual sellers.
export default function StoreCategories() {
  const { store } = useStoreWorkspace();
  const { mainCategory, subcategories, loading } = useStoreSubcategories(store?.categoryId);

  return (
    <>
      <StorePageHeader
        title="Categories"
        subtitle="Your store's main category and its subcategories."
      />

      <div className="px-4 md:px-8 py-6 flex flex-col gap-5">

        {/* Main category */}
        <div className="bg-white border border-bone rounded-[10px] px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-brand-pale-orange flex items-center justify-center shrink-0">
            <FolderTree size={19} style={{ color: '#174771' }} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate uppercase tracking-[0.06em] mb-0.5">Main Category</p>
            {!store ? (
              <div className="animate-pulse w-32 h-4 rounded bg-bone" />
            ) : (
              <p className="text-[15px] font-bold text-carbon truncate">{mainCategory?.name ?? '—'}</p>
            )}
          </div>
        </div>
        <p className="text-[12px] text-slate -mt-3">
          Set once when your store was created. To change it, contact Edudeen support.
        </p>

        {/* Subcategories */}
        <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
          <div className="px-5 py-[14px] border-b border-bone flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-bold text-charcoal">Subcategories</p>
              <p className="text-[12px] text-slate mt-0.5">Pick one of these when you add a product. They're shared across Edudeen — to request a new one, contact Edudeen support.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-5 py-3 border-b border-[#f0eee6] last:border-b-0">
                  <SkeletonBox width={13} height={13} rounded="3px" />
                  <SkeletonBox height={13} width={120 + (i % 3) * 30} rounded="4px" />
                </div>
              ))}
            </div>
          ) : subcategories.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-slate">No subcategories yet.</p>
          ) : (
            <div className="flex flex-col">
              {subcategories.map(sub => (
                <div key={sub._id} className="flex items-center gap-2.5 px-5 py-3 border-b border-[#f0eee6] last:border-b-0 transition-colors duration-150 hover:bg-cream">
                  <Tag size={13} className="text-slate shrink-0" />
                  <span className="text-[13px] font-medium text-carbon flex-1 truncate">{sub.name}</span>
                  {sub.description && <span className="hidden sm:inline text-[12px] text-slate truncate max-w-[220px]">{sub.description}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
