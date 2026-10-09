import { useState, type ReactNode } from 'react';
import { Download, SlidersHorizontal, FileText } from 'lucide-react';
import { Button, FilterDropdown, Input, Toggle } from '@/components/comman/ui';
import { RANGE_PRESET_OPTIONS, type BaseAnalyticsUIFilters } from './analyticsFilters';

interface FilterOption { value: string; label: string }

interface AnalyticsFilterBarProps<T extends BaseAnalyticsUIFilters> {
  filters: T;
  onChange: (filters: T) => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
  exporting?: boolean;
  /** Extra filter controls rendered in a collapsible "Advanced filters" row (e.g. admin's storeId/sellerId drill-down). Omit entirely to hide the toggle. */
  advanced?: ReactNode;
  /** Optional bucket-size override (admin only — the seller backend has no granularity param). Omit to hide the control entirely. */
  granularityOptions?: FilterOption[];
  granularity?: string;
  onGranularityChange?: (v: string) => void;
  /** Which report section "Export CSV" downloads — lets the user pick explicitly instead of inferring from whatever tab happens to be open, so every backend-supported section stays reachable. */
  csvSections: FilterOption[];
  csvSection: string;
  onCsvSectionChange: (v: string) => void;
  /** Hide the PDF/CSV export controls entirely — for views export doesn't support yet (e.g. the seller's cross-store "All Stores" view). Defaults to shown. */
  showExport?: boolean;
}

export function AnalyticsFilterBar<T extends BaseAnalyticsUIFilters>({
  filters, onChange, onExportPdf, onExportCsv, exporting, advanced,
  granularityOptions, granularity, onGranularityChange,
  csvSections, csvSection, onCsvSectionChange, showExport = true,
}: AnalyticsFilterBarProps<T>) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const patch = (partial: Partial<T>) => onChange({ ...filters, ...partial });

  return (
    <div className="bg-white border border-bone rounded-[10px] px-4 py-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <FilterDropdown
          options={RANGE_PRESET_OPTIONS}
          value={filters.range}
          onChange={v => patch({ range: v as T['range'] } as Partial<T>)}
        />

        {filters.range === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="date"
              value={filters.from}
              onChange={e => patch({ from: e.target.value } as Partial<T>)}
              className="w-[140px]"
            />
            <span className="text-slate text-[12px]">to</span>
            <Input
              type="date"
              value={filters.to}
              onChange={e => patch({ to: e.target.value } as Partial<T>)}
              className="w-[140px]"
            />
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Toggle
            label="Compare to previous period"
            checked={filters.compareToPreviousPeriod}
            onChange={v => patch({ compareToPreviousPeriod: v } as Partial<T>)}
            size="sm"
          />
          <span className="text-[12px] text-graphite">Compare to previous period</span>
        </label>

        {granularityOptions && onGranularityChange && (
          <FilterDropdown
            options={granularityOptions}
            value={granularity ?? ''}
            onChange={onGranularityChange}
            placeholder="Auto bucket size"
          />
        )}

        {advanced && (
          <button
            type="button"
            onClick={() => setShowAdvanced(o => !o)}
            className="flex items-center gap-1.5 text-[12px] font-medium text-slate hover:text-carbon cursor-pointer bg-transparent border-none"
          >
            <SlidersHorizontal size={13} />
            Advanced filters
          </button>
        )}

        <div className="flex-1" />

        {showExport && (
          <>
            <Button variant="outline" size="sm" icon={<FileText size={13} />} onClick={onExportPdf} loading={exporting} disabled={exporting}>
              Export PDF
            </Button>
            <FilterDropdown options={csvSections} value={csvSection} onChange={onCsvSectionChange} />
            <Button variant="outline" size="sm" icon={<Download size={13} />} onClick={onExportCsv} loading={exporting} disabled={exporting}>
              Export CSV
            </Button>
          </>
        )}
      </div>

      {advanced && showAdvanced && (
        <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-bone">
          {advanced}
        </div>
      )}
    </div>
  );
}
