// How a product's photos sit inside square/portrait tiles.
// 'cover' fills the tile and crops the edges (good for portrait covers);
// 'contain' shows the whole photo on a plain background (landscape spreads, square shots).
export type ImageFit = 'cover' | 'contain';

export const IMAGE_FITS: { value: ImageFit; label: string; hint: string }[] = [
  { value: 'cover', label: 'Fill the tile', hint: 'Best for portrait photos and book covers. Edges may be cropped.' },
  { value: 'contain', label: 'Show whole photo', hint: 'Best for landscape or square photos, e.g. open page spreads. Nothing is cropped.' },
];

/** Tailwind object-fit class for a product photo. Anything unknown falls back to 'cover'. */
export function productImageFitClass(fit: string | null | undefined): 'object-cover' | 'object-contain' {
  return fit === 'contain' ? 'object-contain' : 'object-cover';
}

/** Same, with Tailwind's `!` so it beats a component's built-in object-fit. */
export function productImageFitClassImportant(fit: string | null | undefined): '!object-cover' | '!object-contain' {
  return fit === 'contain' ? '!object-contain' : '!object-cover';
}
