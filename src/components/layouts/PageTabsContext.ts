import { createContext, type ReactNode } from 'react';

/** Lets a tabbed wrapper (StorePathTabs) hand its tab bar to the page's StorePageHeader,
 *  so the tabs render BELOW the page title. `claim` tells the wrapper a header took the bar. */
export interface PageTabsValue { tabBar: ReactNode; claim: () => () => void }
export const PageTabsCtx = createContext<PageTabsValue | null>(null);
