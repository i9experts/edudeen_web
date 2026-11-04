import { createContext, useContext } from 'react';

/** Set by `/browse/:class/:subject?`: the class (and category slug, '' = none) come from the path instead of `?class=` / `?category=`. */
export interface BrowsePathValue { cls: string; subject: string }
export const BrowsePathCtx = createContext<BrowsePathValue | null>(null);
export const useBrowsePath = () => useContext(BrowsePathCtx);
