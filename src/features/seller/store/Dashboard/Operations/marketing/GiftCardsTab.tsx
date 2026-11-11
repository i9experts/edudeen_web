import { useEffect, useState } from 'react';
import { formatPrice } from '@/utils/formatPrice';
import { statusLabel } from '@/constants/statusLabels';
import { Gift } from 'lucide-react';
import { useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { EmptyState, SkeletonBox } from '@/components/comman/ui';
import { currencySymbol } from '@/utils/currency';
import { apiGetGiftCardSettings, apiUpdateGiftCardSettings, apiIssueGiftCard, apiListGiftCards, apiDisableGiftCard, type GiftCardSettings, type GiftCard } from '@/api/services/giftCards';
import { INPUT_CLS } from './marketingShared';

export function GiftCardsTab() {
  const { store, storeId } = useStoreWorkspace();
  const quickAmounts = store?.baseCurrency === 'USD' ? [10, 25, 50, 100] : [500, 1000, 2000, 5000];
  const [giftCardSettings, setGiftCardSettings] = useState<GiftCardSettings | null>(null);
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [giftCardsLoading, setGiftCardsLoading] = useState(true);
  const [giftCardsError, setGiftCardsError] = useState('');
  const [giftCardSettingsBusy, setGiftCardSettingsBusy] = useState(false);
  const [denominationsInput, setDenominationsInput] = useState('');
  const [issueForm, setIssueForm] = useState({ value: '', recipientEmail: '', recipientName: '', message: '' });
  const [issueBusy, setIssueBusy] = useState(false);
  const [giftCardDisableBusyId, setGiftCardDisableBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;
    setGiftCardsLoading(true);
    setGiftCardsError('');
    Promise.all([apiGetGiftCardSettings(storeId), apiListGiftCards(storeId, { limit: 50 })])
      .then(([settingsRes, listRes]) => {
        setGiftCardSettings(settingsRes.data);
        setDenominationsInput(settingsRes.data.denominations.join(', '));
        setGiftCards(listRes.data.items ?? []);
      })
      .catch(err => setGiftCardsError(err instanceof Error ? err.message : 'Failed to load gift cards.'))
      .finally(() => setGiftCardsLoading(false));
  }, [storeId]);

  async function saveGiftCardSettings(patch: Partial<GiftCardSettings>) {
    if (!giftCardSettings) return;
    setGiftCardSettingsBusy(true);
    setGiftCardsError('');
    try {
      const res = await apiUpdateGiftCardSettings(storeId, patch);
      setGiftCardSettings(res.data);
      setDenominationsInput(res.data.denominations.join(', '));
    } catch (err) {
      setGiftCardsError(err instanceof Error ? err.message : 'Failed to update gift card settings.');
    } finally {
      setGiftCardSettingsBusy(false);
    }
  }

  function saveDenominations() {
    const values = denominationsInput.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
    if (values.length === 0) return;
    saveGiftCardSettings({ denominations: values });
  }

  async function handleIssueGiftCard() {
    if (!issueForm.value || Number(issueForm.value) <= 0) return;
    setIssueBusy(true);
    setGiftCardsError('');
    try {
      const res = await apiIssueGiftCard(storeId, {
        value: Number(issueForm.value),
        recipientEmail: issueForm.recipientEmail || undefined,
        recipientName: issueForm.recipientName || undefined,
        message: issueForm.message || undefined,
      });
      setGiftCards(prev => [res.data, ...prev]);
      setIssueForm({ value: '', recipientEmail: '', recipientName: '', message: '' });
    } catch (err) {
      setGiftCardsError(err instanceof Error ? err.message : 'Failed to issue gift card.');
    } finally {
      setIssueBusy(false);
    }
  }

  async function disableGiftCard(giftCard: GiftCard) {
    setGiftCardDisableBusyId(giftCard._id);
    try {
      const res = await apiDisableGiftCard(storeId, giftCard._id);
      setGiftCards(prev => prev.map(g => g._id === giftCard._id ? res.data : g));
    } catch (err) {
      setGiftCardsError(err instanceof Error ? err.message : 'Failed to disable gift card.');
    } finally {
      setGiftCardDisableBusyId(null);
    }
  }

  return (
      <div className="flex flex-col gap-5">
        {giftCardsError && <p className="text-xs text-error">{giftCardsError}</p>}

        {/* Settings */}
        <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
          <p className="text-sm font-bold text-carbon mb-4">Gift Card Settings</p>
          {giftCardSettings && (
            <div className="flex flex-col gap-3.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={giftCardSettings.purchaseEnabled}
                  disabled={giftCardSettingsBusy}
                  onChange={e => saveGiftCardSettings({ purchaseEnabled: e.target.checked })}
                  className="w-4 h-4 accent-brand-orange cursor-pointer"
                />
                <span className="text-[13px] text-graphite">Allow buyers to purchase a gift card on my storefront</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">
                    Purchase amounts ({currencySymbol(store?.baseCurrency)}, comma-separated)
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={denominationsInput}
                      onChange={e => setDenominationsInput(e.target.value)}
                      placeholder={store?.baseCurrency === 'USD' ? '10, 25, 50, 100' : '500, 1000, 2000, 5000'}
                      className={INPUT_CLS}
                    />
                    <button
                      onClick={saveDenominations}
                      disabled={giftCardSettingsBusy}
                      className="px-3.5 py-2 bg-white border border-bone rounded-lg text-xs font-semibold text-graphite cursor-pointer hover:bg-cream disabled:opacity-50 whitespace-nowrap"
                    >
                      Save
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Expiry</label>
                  <select
                    value={giftCardSettings.neverExpires ? 'never' : 'expires'}
                    disabled={giftCardSettingsBusy}
                    onChange={e => saveGiftCardSettings({ neverExpires: e.target.value === 'never' })}
                    className={`${INPUT_CLS} cursor-pointer`}
                  >
                    <option value="never">Never expires</option>
                    <option value="expires">Expires after {giftCardSettings.expiryMonths} months</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Manual issue */}
        <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
          <p className="text-sm font-bold text-carbon mb-1">Issue a Gift Card</p>
          <p className="text-xs text-slate mb-4">Send a gift card directly to a customer — e.g. a goodwill credit — with no purchase required.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
            <div>
              <label className="text-xs font-medium text-graphite mb-[5px] block">Value ({currencySymbol(store?.baseCurrency)})</label>
              <input value={issueForm.value} onChange={e => setIssueForm(f => ({ ...f, value: e.target.value }))} placeholder={store?.baseCurrency === 'USD' ? '25.00' : '1000'} className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-graphite mb-[5px] block">Recipient Email</label>
              <input value={issueForm.recipientEmail} onChange={e => setIssueForm(f => ({ ...f, recipientEmail: e.target.value }))} placeholder="customer@email.com" className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-graphite mb-[5px] block">Recipient Name</label>
              <input value={issueForm.recipientName} onChange={e => setIssueForm(f => ({ ...f, recipientName: e.target.value }))} placeholder="Optional" className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-graphite mb-[5px] block">Message</label>
              <input value={issueForm.message} onChange={e => setIssueForm(f => ({ ...f, message: e.target.value }))} placeholder="Optional note" className={INPUT_CLS} />
            </div>
          </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-slate">Quick amounts:</span>
        {quickAmounts.map(a => (
          <button key={a} type="button" onClick={() => setIssueForm(f => ({ ...f, value: String(a) }))}
            className="min-h-11 px-3.5 rounded-full border border-bone bg-white text-xs font-semibold text-graphite cursor-pointer hover:bg-cream">
            {currencySymbol(store?.baseCurrency)}{a.toLocaleString()}
          </button>
        ))}
      </div>
          <button
            onClick={handleIssueGiftCard}
            disabled={issueBusy || !issueForm.value}
            className="px-4 py-2 bg-brand-orange border-none rounded-lg text-xs font-semibold text-white cursor-pointer hover:bg-brand-deep-orange disabled:opacity-50"
          >
            {issueBusy ? 'Issuing…' : 'Issue Gift Card'}
          </button>
        </div>

        {/* Issued gift cards list */}
        <div>
          <p className="text-[15px] font-bold text-carbon mb-3">Issued Gift Cards</p>
          {giftCardsLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonBox key={i} width="100%" height={48} rounded="8px" />)}
            </div>
          ) : giftCards.length === 0 ? (
            <EmptyState icon={<Gift size={28} className="text-brand-orange opacity-55" />} title="No gift cards yet" description="Gift cards you issue or buyers purchase will show up here." />
          ) : (
            <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-cream text-left">
                    <th className="px-4 py-2.5 font-semibold text-graphite">Code</th>
                    <th className="px-4 py-2.5 font-semibold text-graphite">Balance</th>
                    <th className="px-4 py-2.5 font-semibold text-graphite">Source</th>
                    <th className="px-4 py-2.5 font-semibold text-graphite">Status</th>
                    <th className="px-4 py-2.5 font-semibold text-graphite">Recipient</th>
                    <th className="px-4 py-2.5 font-semibold text-graphite"></th>
                  </tr>
                </thead>
                <tbody>
                  {giftCards.map(g => (
                    <tr key={g._id} className="border-t border-bone">
                      <td className="px-4 py-2.5 font-mono font-semibold text-carbon">{g.code}</td>
                      <td className="px-4 py-2.5 text-carbon">{formatPrice(g.balance, g.currency)} / {formatPrice(g.initialValue, g.currency)}</td>
                      <td className="px-4 py-2.5 text-slate capitalize">{g.issuedBy}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2.5 py-[3px] rounded-[5px] text-[12px] font-semibold" style={{ background: g.status === 'active' ? '#E3F4EA' : '#F0EEE6', color: g.status === 'active' ? '#1E7A3C' : '#5A5852' }}>
                          {statusLabel(g.status)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate">{g.recipientEmail ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        {g.status === 'active' && (
                          <button
                            onClick={() => disableGiftCard(g)}
                            disabled={giftCardDisableBusyId === g._id}
                            className="px-2.5 py-1 bg-white border border-bone rounded-md text-[12px] text-error cursor-pointer hover:bg-error hover:text-white hover:border-error disabled:opacity-50"
                          >
                            {giftCardDisableBusyId === g._id ? '…' : 'Disable'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
  );
}
