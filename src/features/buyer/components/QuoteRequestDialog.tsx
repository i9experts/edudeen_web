import { useState } from 'react';
import { Link } from 'react-router-dom';
import { School, CheckCircle2 } from 'lucide-react';
import { Modal, Button, Input, Textarea, Select } from '@/components/comman/ui';
import { TokenStorage } from '@/api/services/auth';
import { apiRequestQuote, INSTITUTION_TYPES } from '@/api/services/classroom';

/**
 * Bulk-price request for schools, madrasas and academies — the institute
 * says how many it needs and the seller replies with a price on the
 * "School quotes" page.
 */
export function QuoteRequestDialog({ productId, productName, onClose }: { productId: string; productName: string; onClose: () => void }) {
  const user = TokenStorage.getUser<{ name?: string; phone?: string }>();
  const [form, setForm] = useState({
    institutionName: '', institutionType: 'school', city: '',
    contactName: user?.name ?? '', contactPhone: user?.phone ?? '', quantity: '30', message: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setError('');
    const quantity = Number(form.quantity);
    if (!form.institutionName.trim()) return setError('Enter your school or institute name.');
    if (!Number.isInteger(quantity) || quantity < 2) return setError('Quantity should be 2 or more.');
    if (!form.contactName.trim() || form.contactPhone.trim().length < 7) return setError('Add a contact name and phone number.');
    setBusy(true);
    try {
      const res = await apiRequestQuote({ productId, ...form, quantity });
      setSent(res.data?.number ?? 'sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your request.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Modal title="Request sent" onClose={onClose} width={440} mobileSheet>
        <div className="px-5 py-6 flex flex-col items-center text-center gap-2">
          <CheckCircle2 size={36} className="text-success" />
          <p className="text-[15px] font-bold text-carbon">Your request {sent !== 'sent' ? sent : ''} is with the seller</p>
          <p className="text-[13px] text-graphite max-w-[34ch]">You'll get a notification when they send a price. You can accept it and download a quotation for your records.</p>
          <Link to="/account/quotes" onClick={onClose} className="mt-2 text-[13px] font-semibold text-brand-orange no-underline">View my school quotes</Link>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Get a school / bulk price"
      onClose={onClose}
      width={520}
      mobileSheet
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" loading={busy} onClick={submit}>Send request</Button>
        </div>
      }
    >
      <div className="px-5 py-4 flex flex-col gap-3">
        <p className="flex items-start gap-2 text-[12.5px] text-graphite rounded-lg bg-cream px-3 py-2">
          <School size={15} className="text-brand-orange shrink-0 mt-[1px]" />
          <span>Buying <b className="text-carbon">{productName}</b> for a whole school or several classes? Tell the seller how many you need and they'll send a special price.</span>
        </p>
        <Input label="School / institute name" value={form.institutionName} onChange={set('institutionName')} maxLength={120} placeholder="e.g. The City School, Gulberg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Type" value={form.institutionType} onChange={set('institutionType')}>
            {INSTITUTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Input label="City" value={form.city} onChange={set('city')} maxLength={60} placeholder="Lahore" />
          <Input label="Contact person" value={form.contactName} onChange={set('contactName')} maxLength={80} />
          <Input label="Phone / WhatsApp" value={form.contactPhone} onChange={set('contactPhone')} maxLength={30} inputMode="tel" placeholder="03xx xxxxxxx" />
          <Input label="How many copies / students" type="number" min={2} max={100000} value={form.quantity} onChange={set('quantity')} />
        </div>
        <Textarea label="Anything else? (optional)" rows={3} maxLength={2000} value={form.message} onChange={set('message')} placeholder="Delivery date, printed vs digital, invoice in school's name…" />
        {error && <p className="text-[12.5px] text-error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
