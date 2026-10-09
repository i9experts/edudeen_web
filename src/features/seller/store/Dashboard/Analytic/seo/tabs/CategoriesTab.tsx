import { Card } from '@/components/comman/ui/Card';
import { EmptyState } from '@/components/comman/ui/EmptyState';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { TableCardSkeleton } from '@/components/comman/analytics/AnalyticsSkeletons';
import { FolderTree } from 'lucide-react';
import { useStoreCategoriesSeo } from '@/hooks/seller/seo/useSeoContent';

interface CategoriesTabProps {
  storeId: string;
}

export function CategoriesTab({ storeId }: CategoriesTabProps) {
  const { data, loading, error, refetch } = useStoreCategoriesSeo(storeId);

  if (error) return <AnalyticsErrorState message={error} onRetry={refetch} />;
  if (loading) return <TableCardSkeleton rows={5} />;

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<FolderTree size={26} className="text-slate/50" />}
        title="No categories linked yet"
        description="Categories your products belong to will appear here once assigned."
      />
    );
  }

  return (
    <Card padding="none">
      <div className="px-5 py-3 border-b border-bone">
        <p className="text-[13px] font-semibold text-carbon">Category SEO</p>
        <p className="text-[12px] text-slate mt-[2px]">
          Categories are platform-curated — meta for these pages is managed by Edudeen admins.
        </p>
      </div>
      {data.map((cat, i) => (
        <div key={cat._id} className={`px-5 py-3 flex items-center justify-between ${i < data.length - 1 ? 'border-b border-[#f0eee6]' : ''}`}>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-carbon truncate">{cat.name}</p>
            <p className="text-[12px] text-slate truncate mt-[2px]">{cat.seo?.metaTitle || 'No meta title set'}</p>
          </div>
        </div>
      ))}
    </Card>
  );
}
