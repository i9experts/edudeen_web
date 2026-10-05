import client from '../client';

/** A first-launch intro slide shown by the Edudeen mobile app. */
export interface OnboardingSlide {
  _id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  order: number;
  isActive: boolean;
}

type Ok<T> = { success: boolean; message?: string; data: T };
const BASE = '/api/onboarding-slides';

export const apiAdminListOnboardingSlides = () => client.get<never, Ok<OnboardingSlide[]>>(`${BASE}/admin`);
export const apiCreateOnboardingSlide = (body: { title: string; subtitle?: string; imageUrl: string; order?: number }) =>
  client.post<never, Ok<OnboardingSlide>>(BASE, body);
export const apiUpdateOnboardingSlide = (id: string, body: Partial<Pick<OnboardingSlide, 'title' | 'subtitle' | 'imageUrl' | 'order' | 'isActive'>>) =>
  client.patch<never, Ok<OnboardingSlide>>(`${BASE}/${id}`, body);
export const apiReorderOnboardingSlides = (items: { id: string; order: number }[]) =>
  client.put<never, Ok<unknown>>(`${BASE}/reorder`, { items });
export const apiDeleteOnboardingSlide = (id: string) => client.delete<never, Ok<unknown>>(`${BASE}/${id}`);
