import { createContext } from 'react';

/** field id -> error message, provided by the form steps for the step the seller was blocked on */
export const FieldErrorsContext = createContext<Record<string, string>>({});
