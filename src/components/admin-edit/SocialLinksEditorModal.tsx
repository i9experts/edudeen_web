import { useState } from 'react';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';
import { Input } from '@/components/comman/ui/Input';
import type { SocialNetwork } from '@/api/services/publicPlatformConfig';
import { apiUpdateSocialLinks } from '@/api/services/config/adminConfig';
import { FIELDS, validateSocialLinks } from '@/features/admin/pages/SocialLinksCard';
import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';
import { useReauth } from '@/contexts/reauthCtx';
import { inlineEditConfig } from '@/api/services/reauth';

/** Inline editor for the footer social icons. Update asks for the admin password; wrong password changes nothing. */
export default function SocialLinksEditorModal({ onClose }: { onClose: () => void }) {
  const { config, refresh } = usePublicPlatformConfig();
  const { confirm } = useReauth();
  const [links, setLinks] = useState<Partial<Record<SocialNetwork, string>>>(() => ({ ...(config?.socialLinks ?? {}) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const update = async () => {
    setError('');
    const invalid = validateSocialLinks(links);
    if (invalid) { setError(invalid); return; }
    const token = await confirm();
    if (!token) return; // not confirmed: nothing is changed
    setBusy(true);
    try {
      await apiUpdateSocialLinks(Object.fromEntries(FIELDS.map(f => [f.key, (links[f.key] ?? '').trim()])), inlineEditConfig(token));
      refresh();
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save social links.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal mobileSheet width={560} title="Edit social links" onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={update} loading={busy}>Update</Button></>}>
      <div className="flex flex-col gap-3">
        <p className="text-[12px] text-slate">Shown as icons in the footer. Empty fields are hidden. You will be asked for your password before it goes live.</p>
        {FIELDS.map(f => (
          <Input key={f.key} label={f.label} type="url" placeholder={f.placeholder} value={links[f.key] ?? ''}
            onChange={e => setLinks(l => ({ ...l, [f.key]: e.target.value }))} />
        ))}
        {error && <p className="text-[12px] text-error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
