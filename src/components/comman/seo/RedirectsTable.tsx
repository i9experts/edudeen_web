import { Pencil, Trash2 } from 'lucide-react';
import { Table, type TableColumn, type TablePagination } from '@/components/comman/ui/Table';
import { Badge } from '@/components/comman/ui/Badge';
import { Toggle } from '@/components/comman/ui/Toggle';

export interface RedirectRowData {
  _id:         string;
  source:      string;
  destination: string;
  statusCode:  number;
  isActive:    boolean;
  hitCount?:   number;
}

interface RedirectsTableProps {
  data:             RedirectRowData[];
  loading?:         boolean;
  pagination?:      TablePagination;
  onEdit:           (row: RedirectRowData) => void;
  onDelete:         (row: RedirectRowData) => void;
  onToggleActive:   (row: RedirectRowData, next: boolean) => void;
  className?:       string;
}

export function RedirectsTable({ data, pagination, onEdit, onDelete, onToggleActive, className }: RedirectsTableProps) {
  const columns: TableColumn<RedirectRowData>[] = [
    { key: 'source', header: 'Source', render: r => <span className="font-mono text-[12px]">{r.source}</span> },
    { key: 'destination', header: 'Destination', render: r => <span className="font-mono text-[12px]">{r.destination}</span> },
    { key: 'statusCode', header: 'Code', align: 'center', render: r => <Badge color="gray">{r.statusCode}</Badge> },
    { key: 'hitCount', header: 'Hits', align: 'right', render: r => r.hitCount ?? 0 },
    {
      key: 'isActive', header: 'Active', align: 'center',
      render: r => <Toggle label={`Redirect ${r.source} active`} checked={r.isActive} onChange={next => onToggleActive(r, next)} size="sm" />,
    },
    {
      key: 'actions', header: '', align: 'right',
      render: r => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => onEdit(r)} className="p-1.5 rounded-md hover:bg-cream text-slate hover:text-carbon cursor-pointer border-0 bg-transparent" aria-label="Edit redirect">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(r)} className="p-1.5 rounded-md hover:bg-error-bg text-slate hover:text-error cursor-pointer border-0 bg-transparent" aria-label="Delete redirect">
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
