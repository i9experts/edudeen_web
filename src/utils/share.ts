/**
 * Shares a link with the Web Share API (phone share sheet: WhatsApp, "send to Abba") and falls back to copying it.
 * Returns which path was used so the caller can show the right toast; 'cancelled' means the user closed the sheet.
 */
export async function shareLink(url: string, title: string, text: string): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title, text, url });
      return 'shared';
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    // any other share failure: fall through to copy
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
