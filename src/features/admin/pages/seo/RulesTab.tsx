import { useState } from 'react';
import { Card } from '@/components/comman/ui/Card';
import { Select } from '@/components/comman/ui/Input';
import { Toggle } from '@/components/comman/ui/Toggle';
import { Badge } from '@/components/comman/ui/Badge';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { useSeoRules, useSeoRuleMutations } from '@/hooks/admin/seo/useSeoSettings';
import type { SeoRuleConfig } from '@/api/services/seo/admin/settings.service';

const RULE_LABELS: Record<string, string> = {
  title_length: 'Title Length',
  description_length: 'Description Length',
  missing_alt_text: 'Missing Alt Text',
  thin_content: 'Thin Content',
  duplicate_meta: 'Duplicate Meta',
  missing_canonical: 'Missing Canonical',
  broken_internal_link: 'Broken Internal Link',
  missing_schema: 'Missing Schema',
};

const SEVERITY_COLOR = { info: 'blue', warning: 'yellow', error: 'red' } as const;

export function RulesTab() {
  const { data, loading, error, refetch } = useSeoRules();
  const { updateRule, submitting } = useSeoRuleMutations();
  const [busyCode, setBusyCode] = useState<string | null>(null);

  if (error) return <AnalyticsErrorState message={error} onRetry={refetch} />;
  if (loading) {
    return (
      <Card padding="none" className="max-w-[720px]">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`px-5 py-4 flex items-center justify-between gap-4 ${i < 5 ? 'border-b border-bone' : ''}`}>
            <div className="min-w-0 flex flex-col gap-[6px]">
              <SkeletonBox height={13} width={140} />
              <SkeletonBox height={16} width={60} rounded="9999px" />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <SkeletonBox height={32} width={110} rounded="8px" />
              <SkeletonBox height={22} width={40} rounded="9999px" />
            </div>
          </div>
        ))}
      </Card>
    );
  }

  const handleToggle = async (rule: SeoRuleConfig, enabled: boolean) => {
    setBusyCode(rule.code);
    await updateRule(rule.code, { enabled });
    await refetch();
    setBusyCode(null);
  };

  const handleSeverity = async (rule: SeoRuleConfig, severity: string) => {
    setBusyCode(rule.code);
    await updateRule(rule.code, { severity });
    await refetch();
    setBusyCode(null);
  };

  return (
    <Card padding="none" className="max-w-[720px]">
      {(data ?? []).map((rule, i) => (
        <div key={rule.code} className={`px-5 py-4 flex items-center justify-between gap-4 ${i < (data?.length ?? 0) - 1 ? 'border-b border-bone' : ''}`}>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-carbon">{RULE_LABELS[rule.code] ?? rule.code}</p>
            <Badge color={SEVERITY_COLOR[rule.severity as keyof typeof SEVERITY_COLOR] ?? 'gray'} size="sm" className="mt-1">
              {rule.severity}
            </Badge>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Select
              value={rule.severity}
              disabled={submitting && busyCode === rule.code}
              onChange={e => handleSeverity(rule, e.target.value)}
              className="w-[110px]"
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </Select>
            <Toggle
              label={`${RULE_LABELS[rule.code] ?? rule.code} enabled`}
              checked={rule.enabled}
              disabled={submitting && busyCode === rule.code}
              onChange={next => handleToggle(rule, next)}
            />
          </div>
        </div>
      ))}
      {(data ?? []).length === 0 && (
        <div className="px-5 py-10 text-center text-[12px] text-slate">No SEO rules configured.</div>
      )}
    </Card>
  );
}
