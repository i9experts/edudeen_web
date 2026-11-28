import client from '../client';

export type HomeCardLayout = 'grid4' | 'single';

export type HomeCardTint = 'white' | 'sky' | 'peach' | 'mint' | 'blossom' | 'lilac' | 'butter' | 'seafoam' | 'coral';

// Full class names (Tailwind's scanner can't see built-up ones). Tints match the --color-tint-* tokens.
export const HOME_CARD_TINTS: { value: HomeCardTint; label: string; className: string }[] = [
  { value: 'white', label: 'White', className: 'bg-white' },
  { value: 'sky', label: 'Sky', className: 'bg-tint-sky' },
  { value: 'peach', label: 'Peach', className: 'bg-tint-peach' },
  { value: 'mint', label: 'Mint', className: 'bg-tint-mint' },
  { value: 'blossom', label: 'Blossom', className: 'bg-tint-blossom' },
  { value: 'lilac', label: 'Lilac', className: 'bg-tint-lilac' },
  { value: 'butter', label: 'Butter', className: 'bg-tint-butter' },
  { value: 'seafoam', label: 'Seafoam', className: 'bg-tint-seafoam' },
  { value: 'coral', label: 'Coral', className: 'bg-tint-coral' },
];
export const homeCardTintClass = (tint: string | null | undefined) => HOME_CARD_TINTS.find(t => t.value === tint)?.className ?? 'bg-white';

export interface HomeCardTile { label: string; imageUrl: string; link: string }

export interface HomeCard {
  _id: string;
  title: string;
  layout: HomeCardLayout;
  tiles: HomeCardTile[];
  imageUrl: string;
  link: string;
  ctaLabel: string;
  tint?: HomeCardTint;
  status: 'active' | 'draft';
  order: number;
}

export interface HomeCardPayload {
  title?: string;
  layout?: HomeCardLayout;
  tiles?: HomeCardTile[];
  imageUrl?: string;
  link?: string;
  ctaLabel?: string;
  tint?: HomeCardTint;
  status?: 'active' | 'draft';
}

type Res<T> = { success: boolean; data: T };

export const apiGetHomeCards = () => client.get<never, Res<HomeCard[]>>('/api/home-cards');
export const apiGetAdminHomeCards = () => client.get<never, Res<HomeCard[]>>('/api/home-cards/admin/all');
export const apiCreateHomeCard = (p: HomeCardPayload) => client.post<never, Res<HomeCard>>('/api/home-cards', p);
export const apiUpdateHomeCard = (id: string, p: HomeCardPayload & { order?: number }) => client.patch<never, Res<HomeCard>>(`/api/home-cards/${id}`, p);
export const apiDeleteHomeCard = (id: string) => client.delete<never, { success: boolean }>(`/api/home-cards/${id}`);
export const apiReorderHomeCards = (ids: string[]) => client.patch<never, { success: boolean }>('/api/home-cards/admin/reorder', { ids });