/**
 * Centre-crops a picture to an exact aspect ratio (e.g. 4 for a 4:1 desktop banner, 16/9 for a phone one), then makes sure
 * it is at least `minWidth` wide (same smooth enlargement as `upscaleToMinWidth`). Already-right pictures are returned as
 * they are; svg/gif and anything that fails to decode are returned untouched.
 */
export async function cropToAspect(file: File, ratio: number, minWidth = 1280, targetWidth = 2560): Promise<File> {
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type) || !(ratio > 0)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const cur = bitmap.width / bitmap.height;
    const same = Math.abs(cur - ratio) / ratio < 0.01;
    if (same && bitmap.width >= minWidth) { bitmap.close(); return file; }
    // Source rectangle that has the wanted ratio, centred.
    let sw = bitmap.width, sh = bitmap.height;
    if (cur > ratio) sw = Math.round(bitmap.height * ratio); else sh = Math.round(bitmap.width / ratio);
    const sx = Math.round((bitmap.width - sw) / 2), sy = Math.round((bitmap.height - sh) / 2);
    const outW = sw >= minWidth ? sw : targetWidth;
    const outH = Math.round(outW / ratio);
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close(); return file; }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH);
    bitmap.close();
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob: Blob | null = await new Promise(res => canvas.toBlob(res, type, 0.92));
    if (!blob) return file;
    const ext = type === 'image/png' ? 'png' : 'jpg';
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + `-${outW}x${outH}.${ext}`, { type });
  } catch {
    return file;
  }
}

/**
 * Banners render full-width, so a small picture looks blurry. Instead of rejecting it, enlarge it in the
 * browser (smooth, high-quality scaling, same aspect ratio) before it is uploaded. Pictures that are already
 * wide enough, non-raster files (svg/gif) and anything that fails to decode are returned untouched.
 */
export async function upscaleToMinWidth(file: File, minWidth = 1280, targetWidth = 2560): Promise<File> {
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width >= minWidth) { bitmap.close(); return file; }
    const scale = targetWidth / bitmap.width;
    const w = targetWidth;
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close(); return file; }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob: Blob | null = await new Promise(res => canvas.toBlob(res, type, 0.92));
    if (!blob) return file;
    const ext = type === 'image/png' ? 'png' : 'jpg';
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + `-${w}w.${ext}`, { type });
  } catch {
    return file;
  }
}
