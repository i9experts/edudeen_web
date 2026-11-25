import { useState } from 'react';
import { StarRating, Button, ImageUpload, Modal } from '@/components/comman/ui';
import { apiAddReview, apiEditReview, type ReviewUsedFor } from '@/api/services/rating';
import { REVIEW_USED_FOR } from '../utils/reviewUsedFor';
import { useToast } from '@/contexts/ToastContext';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';

interface ReviewFormModalProps {
  mode:            'create' | 'edit';
  productId?:      string;   // required for create
  reviewId?:       string;   // required for edit
  initialRating?:  number;
  initialComment?: string;
  initialMedia?:   string[];
  initialUsedFor?: ReviewUsedFor | null;
  /** The product being reviewed (already known to the caller): shown at the top of the modal. */
  product?:        { name: string; image?: string | null } | null;
  onClose:        () => void;
  onSaved:         () => void;
}

export function ReviewFormModal({
  mode, productId, reviewId,
  initialRating = 0, initialComment = '', initialMedia = [], initialUsedFor = null, product = null,
  onClose, onSaved,
}: ReviewFormModalProps) {
  const [usedFor, setUsedFor]   = useState<ReviewUsedFor | null>(initialUsedFor);
  const [rating, setRating]     = useState(initialRating);
  const [comment, setComment]   = useState(initialComment);
  const [media, setMedia]       = useState<string[]>(initialMedia);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [fieldErrs, setFieldErrs] = useState<{ rating?: string; comment?: string }>({});
  const toast = useToast();

  async function submit() {
    const errs: { rating?: string; comment?: string } = {};
    if (rating < 1) errs.rating = 'Please select a star rating.';
    if (mode === 'create' && comment.trim().length < 10) errs.comment = 'Please write at least 10 characters.';
    else if (mode === 'edit' && comment.trim().length > 0 && comment.trim().length < 10) errs.comment = 'Please write at least 10 characters.';
    setFieldErrs(errs);
    if (errs.rating || errs.comment) return;
    setError('');
    setSaving(true);
    try {
      if (mode === 'create' && productId) {
        await apiAddReview({ productId, rating, comment: comment || undefined, media, isAnonymous, usedFor: usedFor ?? undefined });
      } else if (mode === 'edit' && reviewId) {
        await apiEditReview(reviewId, { rating, comment, media, usedFor: usedFor ?? undefined });
      }
      toast.success(mode === 'create' ? 'Review submitted' : 'Review updated');
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save your review.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={mode === 'create' ? 'Write a Review' : 'Edit Your Review'}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="flex-1 min-w-0 justify-center">Cancel</Button>
          <Button onClick={submit} loading={saving} className="flex-1 min-w-0 justify-center">
            {mode === 'create' ? 'Submit Review' : 'Save Changes'}
          </Button>
        </>
      }
    >
      {product && (
        <div className="flex items-center gap-3 mb-4 rounded-xl border border-bone bg-cream p-2.5">
          {product.image
            ? <img src={product.image} alt="" className="w-12 h-12 rounded-lg object-cover border border-bone shrink-0" />
            : <ProductCoverFallback name={product.name} size="xs" className="w-12 h-12 rounded-lg shrink-0" />}
          <p className="text-[13px] font-semibold text-carbon min-w-0 break-words line-clamp-2">{product.name}</p>
        </div>
      )}
      <p className="text-[12px] font-semibold text-charcoal mb-2">How would you rate this product?</p>
      <StarRating value={rating} onChange={v => { setRating(v); setFieldErrs(f => ({ ...f, rating: undefined })); }} size={30} className={fieldErrs.rating ? 'mb-1' : 'mb-5'} />
      {fieldErrs.rating && <p role="alert" className="text-[12px] text-error mb-4">{fieldErrs.rating}</p>}

      <p className="text-[12px] font-semibold text-charcoal mb-2">Your review</p>
      <textarea
        value={comment}
        onChange={e => { setComment(e.target.value); setFieldErrs(f => ({ ...f, comment: undefined })); }}
        placeholder="What did you like or dislike? How did you use this product?"
        rows={4}
        aria-invalid={!!fieldErrs.comment}
        className={`w-full border rounded-lg px-3 py-2 text-[13px] text-charcoal outline-none box-border resize-vertical focus:border-brand-orange ${fieldErrs.comment ? 'border-error mb-1' : 'border-bone mb-4'}`}
      />
      {fieldErrs.comment && <p role="alert" className="text-[12px] text-error mb-4">{fieldErrs.comment}</p>}

      <p className="text-[12px] font-semibold text-charcoal mb-2">Where did you use it? <span className="font-normal text-slate">(optional)</span></p>
      <div className="flex gap-2 flex-wrap mb-4">
        {REVIEW_USED_FOR.map(o => (
          <button
            key={o.value} type="button"
            onClick={() => setUsedFor(usedFor === o.value ? null : o.value)}
            aria-pressed={usedFor === o.value}
            className={`text-[12px] font-semibold rounded-full px-3 py-[5px] border cursor-pointer transition-colors ${usedFor === o.value ? 'bg-brand-pale-orange text-brand-deep-orange border-brand-orange/40' : 'bg-white text-slate border-bone hover:bg-cream'}`}
          >{o.label}</button>
        ))}
      </div>

      <p className="text-[12px] font-semibold text-charcoal mb-2">Add photos <span className="font-normal text-slate">(optional)</span></p>
      <ImageUpload value={media} onChange={setMedia} maxFiles={4} className="mb-4" />

      {mode === 'create' && (
        <label className="flex items-center gap-2 text-[12px] text-slate mb-4 cursor-pointer">
          <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} />
          Post this review anonymously
        </label>
      )}

      {error && <p className="text-[12px] text-error mb-1">{error}</p>}
    </Modal>
  );
}
