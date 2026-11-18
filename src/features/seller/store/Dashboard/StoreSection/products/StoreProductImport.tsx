import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { StorePageHeader, useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { Button } from '@/components/comman/ui';
import { saveCsv } from '@/api/services/adminExports';
import {
  apiImportTemplate, apiImportPreview, apiImportCommit, IMPORT_MAX_BYTES, IMPORT_MAX_ROWS,
  type ImportType, type ImportPreview, type ImportResult,
} from '@/api/services/productImport';
import { errorMessage } from '@/utils/bulkRun';

/**
 * Import products from a CSV file. DRAFTS ONLY: photos and files cannot come from a spreadsheet, so every row is created
 * as a draft you finish in the normal editor. Preview first (nothing is saved), then create.
 */
export default function StoreProductImport() {
  usePageTitle('Import products');
  const { storeId } = useStoreWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<ImportType>('physical');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<(ImportResult & { message: string }) | null>(null);
  const [busy, setBusy] = useState<'' | 'template' | 'preview' | 'commit'>('');
  const [error, setError] = useState('');

  const reset = () => { setFile(null); setPreview(null); setResult(null); setError(''); if (inputRef.current) inputRef.current.value = ''; };

  async function downloadTemplate() {
    setBusy('template'); setError('');
    try { saveCsv(await apiImportTemplate(type), `products-${type}-template.csv`); }
    catch (e) { setError(errorMessage(e) || 'Could not download the template.'); }
    finally { setBusy(''); }
  }

  async function onPick(f: File | undefined) {
    setPreview(null); setResult(null); setError('');
    if (!f) { setFile(null); return; }
    if (f.size > IMPORT_MAX_BYTES) { setFile(null); setError('The file is too large (limit 1 MB).'); return; }
    if (!/\.csv$/i.test(f.name) && !/csv|text\/plain/i.test(f.type)) { setFile(null); setError('Please choose a .csv file. In Excel use Save As > CSV (UTF-8).'); return; }
    setFile(f);
    setBusy('preview');
    try { setPreview((await apiImportPreview(storeId, type, f)).data); }
    catch (e) { setError(errorMessage(e) || 'Could not read the file.'); }
    finally { setBusy(''); }
  }

  async function commit() {
    if (!file || busy) return;
    setBusy('commit'); setError('');
    try { const r = await apiImportCommit(storeId, type, file); setResult({ ...r.data, message: r.message }); setPreview(null); }
    catch (e) { setError(errorMessage(e) || 'Could not create the drafts.'); }
    finally { setBusy(''); }
  }

  return (
    <>
      <StorePageHeader title="Import products" subtitle="Create many draft products from a CSV file." />
      <div className="px-4 md:px-7 pt-5 pb-8 flex flex-col gap-5 max-w-[980px]">

        <section className="bg-white border border-bone rounded-xl px-5 py-4 flex flex-col gap-3">
          <h2 className="text-[14px] font-bold text-carbon m-0">1. Choose the product type and get the template</h2>
          <div role="radiogroup" aria-label="Product type" className="flex flex-wrap gap-2">
            {(['physical', 'digital'] as const).map(t => (
              <label key={t} className={`min-h-[44px] inline-flex items-center gap-2 rounded-lg border px-4 cursor-pointer text-[13px] font-semibold ${type === t ? 'border-brand-orange bg-brand-pale-orange text-brand-deep-orange' : 'border-bone bg-white text-graphite'}`}>
                <input type="radio" name="import-type" checked={type === t} onChange={() => { setType(t); reset(); }} />
                {t === 'physical' ? 'Physical products' : 'Digital downloads'}
              </label>
            ))}
          </div>
          <p className="text-[12.5px] text-slate m-0">Up to {IMPORT_MAX_ROWS} products per file, 1 MB. Prices are in your store's currency. Every product is created as a <strong>draft</strong>: add photos and files, then publish from the editor. Use <strong>|</strong> between tags.</p>
          <div><Button variant="outline" size="sm" icon={<Download size={13} />} loading={busy === 'template'} onClick={downloadTemplate}>Download CSV template</Button></div>
        </section>

        <section className="bg-white border border-bone rounded-xl px-5 py-4 flex flex-col gap-3">
          <h2 className="text-[14px] font-bold text-carbon m-0">2. Upload your file</h2>
          <label className="min-h-[44px] inline-flex items-center gap-2 self-start rounded-lg border border-bone px-4 cursor-pointer text-[13px] font-semibold text-carbon hover:bg-cream">
            <FileSpreadsheet size={15} /> {file ? file.name : 'Choose a CSV file'}
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="CSV file" onChange={e => void onPick(e.target.files?.[0])} />
          </label>
          {busy === 'preview' && <p role="status" className="text-[13px] text-slate m-0">Checking your file…</p>}
          {error && <p role="alert" className="text-[13px] text-error m-0">{error}</p>}
        </section>

        {preview && (
          <section className="bg-white border border-bone rounded-xl overflow-hidden" aria-label="Preview">
            <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-bone">
              <div>
                <h2 className="text-[14px] font-bold text-carbon m-0">3. Preview (nothing is saved yet)</h2>
                <p className="text-[12.5px] text-slate m-0 mt-1">{preview.valid} ready · {preview.invalid} with problems · {preview.total} rows</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={reset}>Choose another file</Button>
                <Button variant="primary" size="sm" loading={busy === 'commit'} disabled={preview.valid === 0} onClick={commit}>
                  Create {preview.valid} draft{preview.valid === 1 ? '' : 's'}
                </Button>
              </div>
            </div>
            {preview.ignoredColumns.length > 0 && (
              <p className="text-[12.5px] text-[#946200] bg-[#fdf2da] px-5 py-2 m-0">Ignored columns: {preview.ignoredColumns.join(', ')}</p>
            )}
            {preview.invalid > 0 && <p className="text-[12.5px] text-slate px-5 py-2 m-0">Rows with problems are skipped. Fix them in your file and upload again, or create the ready ones now.</p>}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-[12.5px] border-collapse">
                <thead><tr className="text-start text-slate"><th scope="col" className="px-4 py-2 text-start font-medium">Row</th><th scope="col" className="px-2 py-2 text-start font-medium">Title</th><th scope="col" className="px-2 py-2 text-start font-medium">Result</th></tr></thead>
                <tbody>
                  {preview.rows.map(r => (
                    <tr key={r.row} className="border-t border-[#f0eee6] align-top">
                      <td className="px-4 py-2 text-slate whitespace-nowrap">{r.row}</td>
                      <td className="px-2 py-2 text-carbon break-words max-w-[260px]">{r.title || '—'}</td>
                      <td className="px-2 py-2">
                        {r.ok
                          ? <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 size={13} /> Ready</span>
                          : <ul className="m-0 p-0 list-none text-error">{r.errors.map((e, i) => <li key={i}><span className="font-semibold">{e.field}:</span> {e.message}</li>)}</ul>}
                        {r.warnings.map((w, i) => <p key={i} className="m-0 text-[12px] text-[#946200]">{w}</p>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {result && (
          <section role="status" className="bg-white border border-bone rounded-xl px-5 py-4 flex flex-col gap-3" aria-label="Import result">
            <h2 className="text-[14px] font-bold text-carbon m-0 flex items-center gap-2">
              {result.failed.length ? <AlertTriangle size={16} className="text-[#946200]" /> : <CheckCircle2 size={16} className="text-success" />}
              {result.message}
            </h2>
            {result.failed.length > 0 && (
              <ul className="m-0 p-0 list-none text-[12.5px] text-error flex flex-col gap-1">
                {result.failed.map(f => <li key={f.row}>Row {f.row}{f.title ? ` (${f.title})` : ''}: {f.message}</li>)}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <Link to={`/store/${storeId}/products`} className="min-h-[44px] inline-flex items-center px-4 rounded-lg bg-brand-orange text-white text-[13px] font-semibold no-underline">View my products</Link>
              {result.errorsCsv && (
                <Button variant="outline" size="sm" icon={<Download size={13} />} onClick={() => saveCsv(result.errorsCsv ?? '', 'import-errors.csv')}>Download errors.csv</Button>
              )}
              <Button variant="ghost" size="sm" onClick={reset}>Import another file</Button>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
