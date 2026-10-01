import { useState, useEffect } from 'react';
import {
  MapPin, Plus, Pencil, ArrowLeft, Home, Briefcase, Star as StarIcon,
  Trash2, type LucideIcon,
} from 'lucide-react';
import {
  apiGetMyAddresses, apiUpdateAddress, apiSetDefaultAddress, apiDeleteAddress,
  type Address, type AddressPayload,
} from '@/api/services/address';
import {
  Table, type TableColumn, ActionMenu, Badge, Card, EmptyState, SkeletonBox, PageHeader, Modal, Button,
} from '@/components/comman/ui';
import { AddressForm, EMPTY_ADDRESS_FORM, addressFromProfile, saveNewAddress } from '@/features/buyer/components/AddressForm';
import { useGetProfile } from '@/hooks/auth/useGetProfile';
import { useToast } from '@/contexts/ToastContext';

const LABEL_ICON: Record<string, LucideIcon> = { Home, Work: Briefcase, Other: StarIcon };

type AddrView = 'list' | 'add' | 'edit';

export function Addresses() {
  const toast = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrLoading, setAddrLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<AddrView>('list');
  const [editTarget, setEditTarget] = useState<Address | null>(null);
  const { profile } = useGetProfile();

  useEffect(() => {
    let cancelled = false;
    apiGetMyAddresses()
      .then(res => { if (!cancelled) setAddresses(res.data ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setAddrLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const goList = () => { setView('list'); setEditTarget(null); };

  const refreshAddresses = () =>
    apiGetMyAddresses()
      .then(res => setAddresses(res.data ?? []))
      .catch(() => {});

  const handleSave = async (data: AddressPayload) => {
    setSaving(true);
    try {
      if (view === 'add') await saveNewAddress(data);
      else if (view === 'edit' && editTarget) await apiUpdateAddress(editTarget._id, data);
      await refreshAddresses();
      toast.success(view === 'add' ? 'Address added' : 'Address updated');
      goList();
    } catch (err) {
      // Keep the form open so nothing typed is lost — but the failure must
      // actually be shown, not silently swallowed.
      toast.error(err instanceof Error ? err.message : 'Failed to save address.');
    }
    finally { setSaving(false); }
  };

  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const handleSetDefault = async (addressId: string) => {
    setSettingDefaultId(addressId);
    setActionError('');
    try {
      await apiSetDefaultAddress(addressId);
      await refreshAddresses();
      toast.success('Default address updated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set default address.';
      setActionError(message);
      toast.error(message);
    } finally {
      setSettingDefaultId(null);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);
  const handleDeleteAddress = async () => {
    if (!deleteTarget) return;
    const addressId = deleteTarget._id;
    setDeletingId(addressId);
    setActionError('');
    try {
      await apiDeleteAddress(addressId);
      await refreshAddresses();
      setDeleteTarget(null);
      toast.success('Address deleted');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete address.';
      setActionError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const columns: TableColumn<Address>[] = [
    {
      key: 'label', header: 'Label',
      render: a => {
        const LIcon = LABEL_ICON[a.label] ?? MapPin;
        return <Badge color="orange" size="sm"><LIcon size={10} className="mr-[3px]" />{a.label}</Badge>;
      },
    },
    {
      key: 'recipientName', header: 'Recipient',
      render: a => (
        <div className="flex items-center gap-2">
          <div className="w-[26px] h-[26px] rounded-full bg-[#eaf3fb] text-[11px] font-bold flex items-center justify-center shrink-0 text-[#2156a8]">
            {(a.recipientName ?? '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <span className="text-charcoal">{a.recipientName}</span>
        </div>
      ),
    },
    { key: 'phoneNumber', header: 'Phone', render: a => <span className="text-slate">{a.phoneNumber}</span> },
    {
      key: 'address', header: 'Address',
      render: a => (
        <span className="text-slate text-[12px] block max-w-[220px] truncate">
          {a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ''}, {a.city}, {a.state}
        </span>
      ),
    },
    {
      key: 'isDefault', header: 'Status',
      render: a => <Badge color={a.isDefault ? 'green' : 'gray'} dot>{a.isDefault ? 'Default' : 'Saved'}</Badge>,
    },
    {
      key: 'actions', header: '', align: 'center', width: '60px',
      render: a => (
        <ActionMenu
          align="right"
          items={[
            { label: 'Edit', onClick: () => { setEditTarget(a); setView('edit'); }, icon: <Pencil size={13} /> },
            ...(a.isDefault ? [] : [{
              label: settingDefaultId === a._id ? 'Setting…' : 'Set as Default',
              onClick: () => handleSetDefault(a._id),
              icon: <StarIcon size={13} />,
            }]),
            {
              label: deletingId === a._id ? 'Deleting…' : 'Delete',
              onClick: () => { setDeleteTarget(a); setActionError(''); },
              icon: <Trash2 size={13} />,
              danger: true,
            },
          ]}
        />
      ),
    },
  ];

  if (view !== 'list') {
    return (
      <div>
        <Card padding="none">
          <div className="px-5 pt-5 pb-4 mb-1 border-b border-bone">
            <PageHeader
              eyebrow="Account"
              title={view === 'edit' ? 'Edit Address' : 'Add New Address'}
              actions={
                <Button variant="outline" size="sm" icon={<ArrowLeft size={14} />} onClick={goList}>Back</Button>
              }
            />
          </div>
          <div className="px-5 pb-5 pt-4">
            <AddressForm
              initial={editTarget
                ? { label: editTarget.label, recipientName: editTarget.recipientName, phoneNumber: editTarget.phoneNumber, addressLine1: editTarget.addressLine1, addressLine2: editTarget.addressLine2, state: editTarget.state, city: editTarget.city, zipCode: editTarget.zipCode, latitude: editTarget.latitude, longitude: editTarget.longitude, isDefault: editTarget.isDefault }
                // First address: start from the one given at sign-up.
                : addresses.length === 0 ? addressFromProfile(profile) : EMPTY_ADDRESS_FORM}
              onSave={handleSave}
              onCancel={goList}
              saving={saving}
            />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
    <Card padding="none" className="rounded-2xl overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-bone">
        <PageHeader
          eyebrow="Account"
          title="Addresses"
          description={`${addresses.length} saved address${addresses.length !== 1 ? 'es' : ''}`}
          actions={
            <Button icon={<Plus size={15} />} onClick={() => setView('add')}>Add Address</Button>
          }
        />
      </div>

      {actionError && (
        <div className="px-5 pt-4">
          <p className="text-[12px] text-error bg-error-bg border border-error-border rounded-lg px-3 py-2">{actionError}</p>
        </div>
      )}

      {addrLoading ? (
        <div className="px-5 py-4 flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4">
              <SkeletonBox width={60}  height={22} rounded="999px" />
              <SkeletonBox width="20%" height={13} />
              <SkeletonBox width="15%" height={13} />
              <SkeletonBox width="30%" height={13} />
              <SkeletonBox width={60}  height={22} rounded="999px" />
              <SkeletonBox width={30}  height={30} rounded="7px" />
            </div>
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <EmptyState
          icon={<MapPin size={28} className="text-brand-orange opacity-55" />}
          title="No addresses saved"
          description="Add a shipping address to speed up checkout."
          action={{ label: 'Add Address', onClick: () => setView('add'), icon: <Plus size={14} /> }}
        />
      ) : (
        <Table columns={columns} data={addresses} keyExtractor={a => a._id} />
      )}
    </Card>

    {deleteTarget && (
      <Modal title="Delete this address?" onClose={() => setDeleteTarget(null)} footer={
        <>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteAddress} loading={deletingId === deleteTarget._id}>Delete Address</Button>
        </>
      }>
        <p className="text-[13px] text-slate">
          Delete the address for <strong>{deleteTarget.recipientName}</strong>? This cannot be undone.
        </p>
        {actionError && <p className="text-[12px] text-error mt-2">{actionError}</p>}
      </Modal>
    )}
    </div>
  );
}
