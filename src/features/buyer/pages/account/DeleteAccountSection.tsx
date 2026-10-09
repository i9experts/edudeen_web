import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { invalidateProfileCache } from '@/hooks/auth/useGetProfile';
import { apiDeleteAccount } from '@/api/services/users';
import { TokenStorage } from '@/api/services/auth';
import { Card, Modal, Button } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';

/** Account deletion lives under Account -> Login & Security (moved from the footer / profile page). */
export function DeleteAccountSection() {
  const navigate = useNavigate();
  const toast = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiDeleteAccount();
      TokenStorage.clear();
      invalidateProfileCache();
      navigate('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account.');
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
        <Modal title="Delete your account?" onClose={() => setShowConfirm(false)} footer={
          <>
            <Button variant="ghost" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Delete Account</Button>
          </>
        }>
          <p className="text-[13px] text-slate">
            This deactivates your account and signs you out immediately. You'll need to contact support to reactivate it.
          </p>
        </Modal>
      )}
    </>
  );
}