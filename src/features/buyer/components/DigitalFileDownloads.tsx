import { useState } from 'react';
import { Download, Loader2, FileText, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';
import {
  apiGetDownloadFiles, apiGetDownloadLink, buildDownloadHref,
  type DigitalDownloadFile,
} from '@/api/services/orders';

function formatSize(bytes?: number) {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function openDownload(endpoint: string, token: string) {
  window.open(buildDownloadHref(endpoint, token), '_blank');
}

// ─────────────────────────────────────────────────────────────────────────────
// DigitalFileDownloads — every file of a purchased digital product.
//
// Real flow (see OrdersService.getDownloadUrls / getDownloadLink):
//   1. GET /orders/download-url lists all files (+ checks expiry/limit) with a
//      short-lived token each.
//   2. A single-file product downloads straight away; a multi-file product
//      lists every file with its own button. Each per-file click asks for a
//      fresh token via /orders/get-download-link?fileIndex=N, so a list left
//      open longer than the 10-minute token life still works.
//   3. The token URL is opened directly — no auth header needed.
// ─────────────────────────────────────────────────────────────────────────────
export function DigitalFileDownloads({
  orderId, productId, align = 'end',
}: {
  orderId:   string;
  productId: string;
  align?:    'start' | 'end';
}) {
  const [files, setFiles]     = useState<DigitalDownloadFile[] | null>(null);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  const [error, setError]     = useState('');

  const loadFiles = async () => {
    if (files && files.length > 1) { setOpen(o => !o); return; }
    setLoading(true);
    setError('');
    try {
      const res = await apiGetDownloadFiles(orderId, productId);
      const list = res.data.files ?? [];
      if (list.length === 0) { setError('No files are attached to this product yet.'); return; }
      if (list.length === 1) {
        openDownload(list[0].endpoint, list[0].token);
        return;
      }
      setFiles(list);
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch download link.');
    } finally {
      setLoading(false);
    }
  };

  const downloadOne = async (file: DigitalDownloadFile) => {
    setBusyIdx(file.index);
    setError('');
    try {
      const res = await apiGetDownloadLink(orderId, productId, file.index);
      openDownload(res.data.endpoint, res.data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch download link.');
    } finally {
      setBusyIdx(null);
    }
  };

  const multi = !!files && files.length > 1;

  return (
    <div className={clsx('flex flex-col gap-1.5', align === 'end' ? 'items-end' : 'items-start')}>
      <button
        type="button"
        onClick={loadFiles}
        disabled={loading}
        className={clsx(
          'flex items-center gap-[5px] px-3 min-h-8 rounded-[7px] text-[12px] font-semibold border-none transition-opacity',
          loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
          'bg-[#eef0ff] text-[#3851d1]',
        )}
      >
        {loading
          ? <Loader2 size={11} className="animate-spin" />
          : multi && open ? <ChevronUp size={11} /> : <Download size={11} />}
        {loading ? 'Fetching…' : multi ? `${open ? 'Hide' : 'Show'} ${files!.length} files` : 'Download'}
      </button>

      {multi && open && (
        <ul className="flex flex-col gap-1 w-full min-w-[220px] max-w-[320px] list-none p-0 m-0">
          {files!.map(file => (
            <li
              key={file.index}
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[7px] border border-bone bg-white"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <FileText size={12} className="text-slate shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[12px] font-medium text-charcoal truncate" title={file.fileName}>
                    {file.fileName || `File ${file.index + 1}`}
                  </span>
                  {formatSize(file.size) && (
                    <span className="block text-[12px] text-slate">{formatSize(file.size)}</span>
                  )}
                </span>
              </span>
              <button
                type="button"
                onClick={() => downloadOne(file)}
                disabled={busyIdx !== null}
                aria-label={`Download ${file.fileName}`}
                className={clsx(
                  'shrink-0 flex items-center gap-1 px-2 py-[4px] rounded-[6px] text-[12px] font-semibold border-none bg-[#eef0ff] text-[#3851d1]',
                  busyIdx !== null ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                )}
              >
                {busyIdx === file.index ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
                Download
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className={clsx('text-[12px] text-error leading-tight max-w-[220px]', align === 'end' && 'text-end')}>{error}</p>}
    </div>
  );
}
