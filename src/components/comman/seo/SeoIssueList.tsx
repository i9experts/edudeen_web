import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { EmptyState } from '@/components/comman/ui/EmptyState';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { CheckCircle2 } from 'lucide-react';

export type SeoIssueSeverity = 'info' | 'warning' | 'error';

export interface SeoIssueItem {
  severity:    SeoIssueSeverity;
  code:        string;
  message:     string;
  entityType?: string | null;
  entityId?:   string | null;
}

const SEVERITY_ORDER: Record<SeoIssueSeverity, number> = { error: 0, warning: 1, info: 2 };

const SEVERITY_STYLE: Record<SeoIssueSeverity, { icon: typeof AlertCircle; color: string }> = {
  error:   { icon: AlertCircle,   color: 'text-error' },
  warning: { icon: AlertTriangle, color: 'text-warning' },
  info:    { icon: Info,          color: 'text-info' },
};

interface SeoIssueListProps {
  issues:    SeoIssueItem[];
  loading?:  boolean;
  className?: string;
}

export function SeoIssueList({ issues, loading, className }: SeoIssueListProps) {
  if (loading) {
    return (
      <div className={clsx('flex flex-col gap-2', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBox key={i} height={16} width={`${85 - i * 8}%`} rounded="4px" />
        ))}
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle2 size={28} className="text-success" />}
        title="No issues found"
        description="This audit didn't surface any SEO issues — nice work."
        className={className}
      />
    );
  }

  const sorted = [...issues].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      {sorted.map((issue, i) => {
        const { icon: Icon, color } = SEVERITY_STYLE[issue.severity] ?? SEVERITY_STYLE.info;
        return (
          <div key={`${issue.code}-${issue.entityId ?? i}`} className="flex items-start gap-2 py-2 border-b border-[#f0eee6] last:border-b-0">
            <Icon size={14} className={clsx('shrink-0 mt-[1px]', color)} />
            <div className="min-w-0">
              <p className="text-[13px] text-carbon leading-[1.5]">{issue.message}</p>
              <p className="text-[12px] text-slate mt-[2px]">{issue.code}{issue.entityType ? ` · ${issue.entityType}` : ''}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
