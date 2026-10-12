import { createContext, useContext } from 'react';

export interface AdminEditState {
  /** The signed-in user is an admin (and we are on a public/buyer page). */
  isAdmin: boolean;
  editing: boolean;
  setEditing: (on: boolean) => void;
}

export const AdminEditCtx = createContext<AdminEditState>({ isAdmin: false, editing: false, setEditing: () => {} });

/** Safe outside the provider: returns the "not an admin" state. */
export function useAdminEdit() {
  return useContext(AdminEditCtx);
}