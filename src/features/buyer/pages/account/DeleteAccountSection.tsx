import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { invalidateProfileCache } from '@/hooks/auth/useGetProfile';
import { apiDeleteAccount } from '@/api/services/users';
import { TokenStorage } from '@/api/services/auth';
import { Card, Modal, Button } from '@/components/comman/ui';
import { DeleteAccountFields, EMPTY_DELETE_FORM, canSubmitDelete, type DeleteAccountForm } from '@/components/comman/ui/DeleteAccountFields';

/** Account deletion lives under Account -> Login & Security (moved from the footer / profile page). */
export function DeleteAccountSection() {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<DeleteAccountForm>(EMPTY_DELETE_FORM);
  const [error, setError] = useState('');

  const close = () => { setShowConfirm(false); setForm(EMPTY_DELETE_FORM); setError(''); };

  const handleDelete = async () => {
    if (!canSubmitDelete(form)) return;
    setDeleting(true);
    setError('');
    try {
      await apiDeleteAccount(form);
      TokenStorage.clear();
      invalidateProfileCache();
      navigate('/login');
    } catch (err) {
      // Shows the server's reason (wrong password, open orders, active Premium...) right in the dialog.
      setError(err instanceof Error ? err.message : 'Failed to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card padding="none" className="rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f5bcbc] bg-error-bg/40 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] bg-white border border-[#f5bcbc] flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-error" aria-hidden="true" />
          </div>
          <p className="text-[13px] font-bold text-error">Danger Zone</p>
        </div>
        <div className="p-6">
          <p className="text-[12px] text-slate leading-relaxed mb-4">
            Deleting your account signs you out and deactivates your profile immediately. This can't be undone from the app - you'll need to contact support to reactivate it.
          </p>
          <Button variant="danger" icon={<Trash2 size={13} />} onClick={() => setShowConfirm(true)}>
            Delete Account
          </Button>
        </div>
      </Card>
      {showConfirm && (
        <Modal title="Delete your account?" onClose={close} footer={
          <>
            <Button variant="ghost" onClick={close} disabled={deleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting} disabled={!canSubmitDelete(form)}>Delete Account</Button>
          </>
        }>
          <p className="text-[13px] text-slate">
            This deactivates your account and signs you out immediately. You'll need to contact support to reactivate it.
            Orders still in progress or an active Premium membership must finish first.
          </p>
          <DeleteAccountFields value={form} onChange={setForm} error={error} disabled={deleting} />
        </Modal>
      )}
    </>
  );
}