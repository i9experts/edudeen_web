// RootLayout's content wrapper (not window/document) is the app's single
// scroll container. Anything that used to read window.scrollY / call
// window.scrollTo must go through this instead.
export const scrollRootRef: { current: HTMLDivElement | null } = { current: null };

export function scrollRootToTop(behavior: ScrollBehavior = 'auto') {
  scrollRootRef.current?.scrollTo({ top: 0, behavior });
}
