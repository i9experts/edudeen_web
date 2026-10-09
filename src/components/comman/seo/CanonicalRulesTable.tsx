import { Pencil, Trash2 } from 'lucide-react';
import { Table, type TableColumn, type TablePagination } from '@/components/comman/ui/Table';
import { Toggle } from '@/components/comman/ui/Toggle';

export interface CanonicalRuleRowData {
  _id:          string;
  pathPattern:  string;
  canonicalUrl: string;
  isActive:     boolean;
}

interface CanonicalRulesTableProps {
  data:           CanonicalRuleRowData[];
  loading?:       boolean;
  pagination?:    TablePagination;
  onEdit:         (row: CanonicalRuleRowData) => void;
  onDelete:       (row: CanonicalRuleRowData) => void;
  onToggleActive: (row: CanonicalRuleRowData, next: boolean) => void;
  className?:     string;
}

export function CanonicalRulesTable({ data, pagination, onEdit, onDelete, onToggleActive, className }: CanonicalRulesTableProps) {
  const columns: TableColumn<CanonicalRuleRowData>[] = [
    { key: 'pathPattern', header: 'Path Pattern', render: r => <span className="font-mono text-[12px]">{r.pathPattern}</span> },
    { key: 'canonicalUrl', header: 'Canonical URL', render: r => <span className="font-mono text-[12px]">{r.canonicalUrl}</span> },
    {
      key: 'isActive', header: 'Active', align: 'center',
      render: r => <Toggle label={`Canonical rule ${r.pathPattern} active`} checked={r.isActive} onChange={next => onToggleActive(r, next)} size="sm" />,
    },
    {
      key: 'actions', header: '', align: 'right',
      render: r => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => onEdit(r)} className="p-1.5 rounded-md hover:bg-cream text-slate hover:text-carbon cursor-pointer border-0 bg-transparent" aria-label="Edit canonical rule">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(r)} className="p-1.5 rounded-md hover:bg-error-bg text-slate hover:text-error cursor-pointer border-0 bg-transparent" aria-label="Delete canonical rule">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={data}
      keyExtractor={r => r._id}
      pagination={pagination}
      className={className}
    />
  );
}
