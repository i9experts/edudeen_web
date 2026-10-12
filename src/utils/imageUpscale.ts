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
