import { clsx } from 'clsx';
import { Globe } from 'lucide-react';
import { Card } from '@/components/comman/ui/Card';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';

interface SocialPreviewCardProps {
  ogTitle?:       string | null;
  ogDescription?: string | null;
  ogImage?:       string | null;
  url:            string;
  variant:        'facebook' | 'twitter';
  loading?:       boolean;
  className?:     string;
}

function domainOf(url: string): string {
  try { return new URL(url).hostname.toUpperCase(); } catch { return url; }
}

export function SocialPreviewCard({ ogTitle, ogDescription, ogImage, url, variant, loading, className }: SocialPreviewCardProps) {
  if (loading) {
    return (
      <Card padding="none" className={clsx('overflow-hidden', className)}>
        <SkeletonBox height={160} width="100%" rounded="0" />
        <div className="p-3 flex flex-col gap-2">
          <SkeletonBox height={10} width="40%" rounded="3px" />
          <SkeletonBox height={13} width="80%" rounded="4px" />
          <SkeletonBox height={11} width="95%" rounded="3px" />
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none" className={clsx('overflow-hidden', className)}>
      <div className="h-[160px] bg-cream border-b border-bone flex items-center justify-center overflow-hidden">
        {ogImage ? (
          <img
            src={ogImage}
            alt=""
            className="w-full h-full object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <Globe size={28} className="text-slate/40" />
        )}
      </div>
      <div className={clsx('p-3', variant === 'twitter' && 'border border-bone rounded-b-xl')}>
        <p className="text-[12px] text-slate uppercase tracking-[0.04em] mb-1">{domainOf(url)}</p>
        <p className="text-[13px] font-semibold text-carbon leading-[1.35] mb-1 line-clamp-2">
          {ogTitle || 'Untitled page'}
        </p>
        {ogDescription && (
          <p className="text-[12px] text-slate leading-[1.5] line-clamp-2">{ogDescription}</p>
        )}
      </div>
    </Card>
  );
}
