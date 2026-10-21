import { Input } from './Input';

export interface DeleteAccountForm { password: string; confirm: string }
export const EMPTY_DELETE_FORM: DeleteAccountForm = { password: '', confirm: '' };

/** The typed word is required before the delete button enables (the server checks it again). */
export const canSubmitDelete = (f: DeleteAccountForm) => f.confirm.trim().toUpperCase() === 'DELETE';

interface Props {
  value: DeleteAccountForm;
  onChange: (next: DeleteAccountForm) => void;
  error?: string;
  disabled?: boolean;
}

/** Shared by the buyer and seller delete-account dialogs: password (if the account has one) + typed confirmation. */
export function DeleteAccountFields({ value, onChange, error, disabled }: Props) {
  return (
    <div className="mt-4 space-y-3">
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="Leave empty if you sign in with Google, Apple or Facebook"
        value={value.password}
        disabled={disabled}
        onChange={e => onChange({ ...value, password: e.target.value })}
      />
      <Input
        label="Type DELETE to confirm"
        autoComplete="off"
        value={value.confirm}
        disabled={disabled}
        onChange={e => onChange({ ...value, confirm: e.target.value })}
      />
      {error && <p className="text-[12px] text-error" role="alert">{error}</p>}
    </div>
  );
}
