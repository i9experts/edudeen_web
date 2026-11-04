import { safeHttpUrl } from '@/utils/safeRedirect';

/** Note + photo thumbnails of a refund request (buyer, seller and admin views). Old requests have neither, so it renders nothing. */
export function RefundEvidence({ request }: { request: { note?: string | null; evidenceImages?: string[] } }) {
  const images = (request.evidenceImages ?? []).map(u => safeHttpUrl(u)).filter((u): u is string => !!u);
  if (!request.note && images.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      {request.note && <p className="text-[12px] text-charcoal m-0 whitespace-pre-wrap break-words">{request.note}</p>}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((u, i) => (
            <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="block w-[64px] h-[64px] rounded-[8px] overflow-hidden border border-bone">
              <img src={u} alt={`Photo ${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
