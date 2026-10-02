import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import { ChevronUp, ChevronDown, ArrowUpDown, Inbox } from 'lucide-react';
import { Pagination } from './Pagination';
import { SkeletonBox } from './SkeletonBox';
import { EmptyState } from './EmptyState';

export interface TableColumn<T = Record<string, unknown>> {
  key:       string;
  header:    string;
  render?:   (row: T, index: number) => ReactNode;
  align?:    'left' | 'center' | 'right';
  width?:    string;
  sortable?: boolean;
}

export interface TablePagination {
  page:     number;
  total:    number;
  perPage?: number;
  onChange: (page: number) => void;
  label?:   string;
}

export interface TableSort {
  key:       string;
  direction: 'asc' | 'desc';
}

interface EmptyStateConfig {
  icon?:        ReactNode;
  title:        string;
  description?: string;
  action?:      { label: string; onClick: () => void; icon?: ReactNode };
}

interface TableProps<T = Record<string, unknown>> {
  columns:           TableColumn<T>[];
  data:              T[];
  keyExtractor:      (row: T, index: number) => string | number;
  onRowClick?:       (row: T) => void;
  pagination?:       TablePagination;
  className?:        string;
  sort?:             TableSort;
  onSortChange?:     (key: string) => void;
  selectable?:       boolean;
  selectedKeys?:     Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
  bulkActions?:      (selectedKeys: Set<string | number>) => ReactNode;
  /** When true, renders skeleton rows in place of data. */
  loading?:          boolean;
  /** Number of skeleton rows to render while loading. Defaults to 5. */
  loadingRows?:      number;
  /**
   * Empty-state content shown when `data` is empty and `loading` is false.
   * Pass `false` to opt out and render a bare empty table instead.
   */
  emptyState?:       EmptyStateConfig | false;
}

const TH =
  'text-start text-[12px] font-medium text-slate uppercase tracking-[0.04em] ' +
  'px-5 py-[14px] whitespace-nowrap';

export function Table<T = Record<string, unknown>>({
  columns, data, keyExtractor, onRowClick, pagination, className,
  sort, onSortChange, selectable, selectedKeys, onSelectionChange, bulkActions,
  loading = false, loadingRows = 5, emptyState,
}: TableProps<T>) {
  const perPage    = pagination?.perPage ?? 10;
  const start      = pagination ? (pagination.page - 1) * perPage + 1 : 1;
  const end        = pagination ? Math.min(pagination.page * perPage, pagination.total) : data.length;
  const label      = pagination?.label ?? 'items';

  const keys        = selectedKeys ?? new Set<string | number>();
  const rowKeys     = data.map((row, i) => keyExtractor(row, i));
  const allSelected = selectable && rowKeys.length > 0 && rowKeys.every(k => keys.has(k));
  const someSelected = selectable && rowKeys.some(k => keys.has(k));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(rowKeys));
    }
  };

  const toggleRow = (key: string | number) => {
    if (!onSelectionChange) return;
    const next = new Set(keys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  // Below `sm`, columns stack into label/value pairs on a card per row instead
  // of forcing a horizontally-scrolling table — a column with no header (an
  // actions/icon-only column) has nothing meaningful to label, so its cells
  // render together in a trailing unlabeled strip instead of a blank-labeled row.
  const labeledColumns   = columns.filter(c => c.header);
  const unlabeledColumns = columns.filter(c => !c.header);

  const showEmptyState = !loading && data.length === 0 && emptyState !== false;

  return (
    <div className={className}>
      {selectable && keys.size > 0 && bulkActions && (
        <div className="px-5 py-2.5 border-b border-bone bg-brand-pale-orange/40 flex items-center gap-3">
          <span className="text-[12px] font-medium text-charcoal">{keys.size} selected</span>
          <div className="flex items-center gap-2 ms-auto">
            {bulkActions(keys)}
          </div>
        </div>
      )}

      {showEmptyState ? (
        <EmptyState
          icon={emptyState?.icon ?? <Inbox size={28} className="text-slate/50" />}
          title={emptyState?.title ?? 'No data yet'}
          description={emptyState?.description ?? 'Nothing to show here right now.'}
          action={emptyState?.action}
        />
      ) : (
        <>
          {/* ── Desktop / tablet — full table ── */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead className="sticky top-0 z-[1]">
                <tr className="border-b border-bone bg-[#f5f8fa]">
                  {selectable && (
                    <th className={clsx(TH, 'w-[40px]')}>
                      <input
                        type="checkbox"
                        className="accent-brand-orange cursor-pointer"
                        checked={!!allSelected}
                        ref={el => { if (el) el.indeterminate = !allSelected && !!someSelected; }}
                        onChange={toggleAll}
                        aria-label="Select all rows"
                      />
                    </th>
                  )}
                  {columns.map(col => {
                    const isSorted   = sort?.key === col.key;
                    const ariaSort: 'ascending' | 'descending' | 'none' =
                      isSorted ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : 'none';
                    return (
                      <th
                        key={col.key}
                        className={clsx(TH, col.align === 'right' && 'text-end', col.align === 'center' && 'text-center')}
                        style={col.width ? { width: col.width } : undefined}
                        aria-sort={col.sortable ? ariaSort : undefined}
                      >
                        {col.sortable ? (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={() => onSortChange?.(col.key)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSortChange?.(col.key); } }}
                            className={clsx(
                              'inline-flex items-center gap-1 cursor-pointer select-none',
                              col.align === 'right' && 'flex-row-reverse',
                            )}
                          >
                            {col.header}
                            {isSorted
                              ? (sort!.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                              : <ArrowUpDown size={12} className="text-slate/60" />}
                          </span>
                        ) : (
                          col.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: loadingRows }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className={clsx(i < loadingRows - 1 && 'border-b border-bone')}>
                      {selectable && (
                        <td className="px-5 py-[14px]"><SkeletonBox width={16} height={16} rounded="4px" /></td>
                      )}
                      {columns.map(col => (
                        <td key={col.key} className="px-5 py-[14px]">
                          <SkeletonBox height={14} rounded="4px" className="w-full max-w-[160px]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  data.map((row, i) => {
                  const rowKey = keyExtractor(row, i);
                  return (
                    <tr
                      key={rowKey}
                      className={clsx(
                        i < data.length - 1 && 'border-b border-bone',
                        onRowClick && 'cursor-pointer',
                        'transition-colors duration-150 hover:bg-cream',
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {selectable && (
                        <td className="px-5 py-[14px]" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="accent-brand-orange cursor-pointer"
                            checked={keys.has(rowKey)}
                            onChange={() => toggleRow(rowKey)}
                            aria-label="Select row"
                          />
                        </td>
                      )}
                      {columns.map(col => (
                        <td
                          key={col.key}
                          className={clsx(
                            'px-5 py-[14px] text-carbon',
                            col.align === 'right'  && 'text-end',
                            col.align === 'center' && 'text-center',
                          )}
                        >
                          {col.render
                            ? col.render(row, i)
                            : String((row as Record<string, unknown>)[col.key] ?? '')}
                        </td>
                      ))}
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Mobile — one card per row, columns stacked as label/value ── */}
          <div className="sm:hidden divide-y divide-[#f0eee6]">
            {loading ? (
              Array.from({ length: loadingRows }).map((_, i) => (
                <div key={`skeleton-${i}`} className="px-4 py-3 flex flex-col gap-2">
                  <SkeletonBox height={13} width="60%" rounded="4px" />
                  <SkeletonBox height={12} width="40%" rounded="4px" />
                </div>
              ))
            ) : (
              data.map((row, i) => {
                const rowKey = keyExtractor(row, i);
                return (
                  <div
                    key={rowKey}
                    className={clsx('px-4 py-3 flex flex-col gap-1.5', onRowClick && 'cursor-pointer active:bg-cream')}
                    onClick={() => onRowClick?.(row)}
                  >
                    {labeledColumns.map(col => (
                      <div key={col.key} className="flex items-start justify-between gap-3">
                        <span className="text-[10.5px] font-semibold text-slate uppercase tracking-[0.05em] shrink-0 pt-[1px]">{col.header}</span>
                        <span className="text-[13px] text-carbon text-end min-w-0">
                          {col.render ? col.render(row, i) : String((row as Record<string, unknown>)[col.key] ?? '')}
                        </span>
                      </div>
                    ))}
                    {unlabeledColumns.length > 0 && (
                      <div className="flex items-center justify-end gap-2 pt-1" onClick={e => e.stopPropagation()}>
                        {unlabeledColumns.map(col => (
                          <span key={col.key}>{col.render ? col.render(row, i) : null}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Pagination footer */}
      {!loading && data.length > 0 && pagination && pagination.total > 0 && (
        <div className="px-5 py-3 border-t border-bone flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
          <span className="text-[12px] text-slate whitespace-nowrap">
            Showing {start}–{end} of {pagination.total.toLocaleString()} {label}
          </span>
          <Pagination
            page={pagination.page}
            total={pagination.total}
            perPage={perPage}
            onChange={pagination.onChange}
          />
        </div>
      )}
    </div>
  );
}
