import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as RPointerEvent } from 'react';
import { Crop, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { useUpload } from '@/hooks/upload/useUpload';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';

const STRIP_RATIO = 2560 / 200; // shape of the strip on desktop (the picture is fitted to it)
const MAX_OUT_W = 2560;
const MIN_SIDE = 24;

type Box = { x: number; y: number; w: number; h: number };
type Dir = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const HANDLES: { dir: Dir; cls: string; cursor: string }[] = [
  { dir: 'nw', cls: '-left-1.5 -top-1.5', cursor: 'nwse-resize' },
  { dir: 'n', cls: 'left-1/2 -top-1.5 -translate-x-1/2', cursor: 'ns-resize' },
  { dir: 'ne', cls: '-right-1.5 -top-1.5', cursor: 'nesw-resize' },
  { dir: 'e', cls: '-right-1.5 top-1/2 -translate-y-1/2', cursor: 'ew-resize' },
  { dir: 'se', cls: '-right-1.5 -bottom-1.5', cursor: 'nwse-resize' },
  { dir: 's', cls: 'left-1/2 -bottom-1.5 -translate-x-1/2', cursor: 'ns-resize' },
  { dir: 'sw', cls: '-left-1.5 -bottom-1.5', cursor: 'nesw-resize' },
  { dir: 'w', cls: '-left-1.5 top-1/2 -translate-y-1/2', cursor: 'ew-resize' },
];

/**
 * Picture picker for the Mega Sale strip. After choosing a file the admin picks the part to keep: drag the frame to move
 * it, drag its edges/corners (or type the width/height %) to make it bigger or smaller in either direction. A live preview
 * shows how the strip will look. "Use without cropping" uploads the original.
 */
export function StripImagePicker({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const { upload, uploading, error } = useUpload('public');
  const [file, setFile] = useState<File | null>(null);
  const [src, setSrc] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');
  const [disp, setDisp] = useState({ w: 0, h: 0 }); // displayed size of the picture in the modal
  const [box, setBox] = useState<Box>({ x: 0, y: 0, w: 0, h: 0 });
  const drag = useRef<{ dir: Dir; px: number; py: number; box: Box } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  function reset() {
    setFile(null);
    setSrc('');
    setDisp({ w: 0, h: 0 });
  }
  function close() { if (!busy) reset(); }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setLocalError('');
    if (!f.type.startsWith('image/')) { setLocalError('Choose a JPG, PNG or WebP picture.'); return; }
    setFile(f);
    setSrc(URL.createObjectURL(f));
  }

  function onImgLoad() {
    const el = imgRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    setDisp({ w, h });
    // Start with the strip-shaped frame, as wide as the picture allows.
    const bw = Math.min(w, h * STRIP_RATIO);
    const bh = bw / STRIP_RATIO;
    setBox({ x: (w - bw) / 2, y: (h - bh) / 2, w: bw, h: bh });
  }

  function startDrag(dir: Dir, e: RPointerEvent<HTMLElement>) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { dir, px: e.clientX, py: e.clientY, box };
  }
  function move(e: RPointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    let { x, y, w, h } = d.box;
    if (d.dir === 'move') {
      x = Math.min(Math.max(0, x + dx), disp.w - w);
      y = Math.min(Math.max(0, y + dy), disp.h - h);
    } else {
      if (d.dir.includes('e')) w = Math.min(Math.max(MIN_SIDE, w + dx), disp.w - x);
      if (d.dir.includes('s')) h = Math.min(Math.max(MIN_SIDE, h + dy), disp.h - y);
      if (d.dir.includes('w')) {
        const nx = Math.min(Math.max(0, x + dx), x + w - MIN_SIDE);
        w += x - nx;
        x = nx;
      }
      if (d.dir.includes('n')) {
        const ny = Math.min(Math.max(0, y + dy), y + h - MIN_SIDE);
        h += y - ny;
        y = ny;
      }
    }
    setBox({ x, y, w, h });
  }
  function up() { drag.current = null; }

  // Typed width/height (as % of the picture), keeping the frame inside the picture.
  function setSizePct(side: 'w' | 'h', pct: number) {
    if (!Number.isFinite(pct) || !disp.w) return;
    const clamped = Math.min(100, Math.max(1, pct)) / 100;
    setBox(b => {
      if (side === 'w') {
        const w = Math.max(MIN_SIDE, disp.w * clamped);
        return { ...b, w, x: Math.min(b.x, disp.w - w) };
      }
      const h = Math.max(MIN_SIDE, disp.h * clamped);
      return { ...b, h, y: Math.min(b.y, disp.h - h) };
    });
  }

  async function finish(crop: boolean) {
    if (!file) return;
    setBusy(true);
    setLocalError('');
    try {
      let out: File = file;
      if (crop) {
        const bmp = await createImageBitmap(file);
        const scale = bmp.width / disp.w;
        const sw = box.w * scale;
        const sh = box.h * scale;
        const outW = Math.round(Math.min(MAX_OUT_W, sw));
        const outH = Math.max(1, Math.round(outW * (sh / sw)));
        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) { bmp.close(); throw new Error('Your browser could not crop this picture.'); }
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bmp, box.x * scale, box.y * scale, sw, sh, 0, 0, outW, outH);
        bmp.close();
        const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
        if (!blob) throw new Error('Could not crop this picture.');
        out = new File([blob], file.name.replace(/\.[^.]+$/, '') + '-strip.jpg', { type: 'image/jpeg' });
      }
      const data = await upload(out);
      onChange(data.url);
      setBusy(false);
      reset();
    } catch (err) {
      setBusy(false);
      setLocalError(err instanceof Error ? err.message : 'Could not upload this picture.');
    }
  }

  const shownError = localError || error;
  const ready = disp.w > 0 && box.w > 0;
  const wPct = ready ? Math.round((box.w / disp.w) * 100) : 100;
  const hPct = ready ? Math.round((box.h / disp.h) * 100) : 100;
  const shapeOff = ready && Math.abs(box.w / box.h - STRIP_RATIO) / STRIP_RATIO > 0.25;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative w-full aspect-[12.8/1] min-h-[40px] rounded-lg overflow-hidden border-2 border-dashed border-bone bg-cream flex items-center justify-center">
        {value
          ? <img src={value} alt="Strip background preview" className="absolute inset-0 h-full w-full object-fill" />
          : <span className="text-[12px] text-slate">No picture yet</span>}
        {uploading && !file && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="animate-spin text-brand-orange" size={18} /></div>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label>
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPick} disabled={uploading} />
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-bone bg-white px-3 py-2 text-[13px] font-medium text-charcoal cursor-pointer hover:bg-cream">
            <UploadCloud size={14} /> {value ? 'Change picture' : 'Upload picture'}
          </span>
        </label>
        {value && (
          <button type="button" onClick={() => onChange('')} className="inline-flex items-center gap-1 text-[12px] text-slate hover:text-error bg-transparent border-0 cursor-pointer min-h-[28px]">
            <Trash2 size={12} aria-hidden="true" /> Remove
          </button>
        )}
      </div>
      {shownError && !file && <p className="text-[12px] text-error m-0">{shownError}</p>}

      {file && (
        <Modal
          title="Choose the part of the picture to use"
          width={680}
          onClose={close}
          footer={<>
            <Button variant="ghost" onClick={close} disabled={busy}>Cancel</Button>
            <Button variant="outline" onClick={() => finish(false)} disabled={busy}>Use without cropping</Button>
            <Button icon={<Crop size={14} />} onClick={() => finish(true)} loading={busy} disabled={!ready}>Crop &amp; use</Button>
          </>}
        >
          <p className="text-[12px] text-slate mt-0 mb-2">Drag inside the frame to move it. Drag its edges or corners to make it wider/narrower or taller/shorter. Only the part inside the frame is used.</p>
          <div className="relative mx-auto select-none overflow-hidden rounded-lg bg-charcoal/90" style={{ width: disp.w || undefined, maxWidth: '100%' }}>
            <img ref={imgRef} src={src} alt="" draggable={false} onLoad={onImgLoad} className="block h-auto max-h-[46vh] w-auto max-w-full" />
            {ready && (
              <div
                onPointerDown={e => startDrag('move', e)}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
                className="absolute cursor-move touch-none border-2 border-white"
                style={{ left: box.x, top: box.y, width: box.w, height: box.h, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }}
              >
                {HANDLES.map(hd => (
                  <span
                    key={hd.dir}
                    onPointerDown={e => startDrag(hd.dir, e)}
                    onPointerMove={move}
                    onPointerUp={up}
                    onPointerCancel={up}
                    className={`absolute size-3.5 touch-none rounded-sm border border-charcoal bg-white ${hd.cls}`}
                    style={{ cursor: hd.cursor }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-[12px] text-charcoal">
              Width: {wPct}% of the picture
              <input type="range" min={1} max={100} value={wPct} onChange={e => setSizePct('w', Number(e.target.value))} aria-label="Crop width" />
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-charcoal">
              Height: {hPct}% of the picture
              <input type="range" min={1} max={100} value={hPct} onChange={e => setSizePct('h', Number(e.target.value))} aria-label="Crop height" />
            </label>
          </div>

          <p className="text-[12px] font-medium text-charcoal mt-3 mb-1">How the strip will look</p>
          <div className="relative w-full aspect-[12.8/1] min-h-[40px] overflow-hidden rounded-lg border border-bone bg-cream">
            {ready && (
              <img
                src={src}
                alt=""
                draggable={false}
                className="absolute max-w-none"
                style={{
                  width: `${(disp.w / box.w) * 100}%`,
                  height: `${(disp.h / box.h) * 100}%`,
                  left: `${-(box.x / box.w) * 100}%`,
                  top: `${-(box.y / box.h) * 100}%`,
                }}
              />
            )}
          </div>
          {shapeOff && <p className="text-[12px] text-warning mt-1 mb-0">The frame is not strip-shaped (about 13 : 1), so the picture will look stretched on the banner, as shown above.</p>}
          {shownError && <p className="text-[12px] text-error mt-2 mb-0">{shownError}</p>}
        </Modal>
      )}
    </div>
  );
}
