import { Accordion } from '@/components/comman/ui';
import { SELLER_PAGE_SECTIONS } from '@/components/seller-page/sellerPageDefaults';
import { SellerPageSectionForm } from '@/components/admin-edit/SellerPageEditorModal';
import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';

/** Admin -> Platform Config: edit the public /become-a-seller page section by section (same editor as the on-page Edit mode, no password gate here). */
export function SellerPageCard() {
  const { config, loading, refresh } = usePublicPlatformConfig();
  if (!config) {
    return loading
      ? <div className="flex flex-col gap-3"><SkeletonBox className="h-[44px] w-full" /><SkeletonBox className="h-[44px] w-full" /></div>
      : <p className="text-[13px] text-error" role="alert">Could not load the current page content, so editing is disabled to avoid overwriting it. <button type="button" onClick={refresh} className="underline cursor-pointer bg-transparent border-none text-error">Try again</button></p>;
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-slate">Edit any block of the public /become-a-seller page. Plans and prices come from Platform Plans; the live numbers come from the marketplace. You can also edit the page directly with Edit mode on the site.</p>
      <Accordion items={SELLER_PAGE_SECTIONS.map(s => ({
        id: s.key, title: s.label,
        content: <SellerPageSectionForm section={s.key} withReauth={false} />,
      }))} />
    </div>
  );
}
