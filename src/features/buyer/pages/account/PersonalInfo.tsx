import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Camera, Check, Loader2, MapPin, Phone, UserCircle } from 'lucide-react';
import { useGetProfile } from '@/hooks/auth/useGetProfile';
import { useEditProfile } from '@/hooks/auth/useEditProfile';
import { TokenStorage, apiEditProfile } from '@/api/services/auth';
import { useUpload } from '@/hooks/upload/useUpload';
import { Card, PageHeader, Badge, SkeletonBox } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';

const INPUT_CLS = 'w-full py-[11px] px-[14px] text-[13px] border border-bone rounded-[10px] outline-none text-charcoal bg-white box-border focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 transition-colors';
const LABEL_CLS = 'text-[12px] font-medium text-graphite mb-[6px] block';

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 rounded-[9px] bg-brand-pale-orange flex items-center justify-center shrink-0">
        {icon}
      </div>
      <p className="text-[13px] font-bold text-charcoal">{title}</p>
    </div>
  );
}

// Real route for what used to live behind Settings' ?tab=profile — see
// router/index.tsx's account children and CLAUDE.md's Account Workspace
// notes for the intended `profile` → PersonalInfo mapping this completes.
export function PersonalInfo() {
  const navigate = useNavigate();
  const toast = useToast();
  const { profile, loading, refetch } = useGetProfile();
  const { execute: editProfile, loading: saving, error: saveError, success: saved } = useEditProfile();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');


  useEffect(() => {
    if (!profile) return;
    const parts = profile.name.split(' ');
    setFirstName(parts[0] ?? '');
    setLastName(parts.slice(1).join(' '));
    setPhone(profile.phone ?? '');
  }, [profile]);

  const handleSaveProfile = () => {
    const name = `${firstName} ${lastName}`.trim();
    editProfile({ name, phone });
  };



  // Profile photo: public upload → save the returned URL on the profile.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload: uploadImage, uploading: imageUploading } = useUpload('public');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const avatarBusy = imageUploading || avatarSaving;

  const handleAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file later
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be 5 MB or smaller.'); return; }
    try {
      const { url } = await uploadImage(file);
      setAvatarSaving(true);
      await apiEditProfile({ profileImage: url });
      // Keep the cached session user (navbar avatar) in sync.
      const stored = TokenStorage.getUser<Record<string, unknown>>();
      if (stored) TokenStorage.saveUser({ ...stored, image: url });
      refetch(); // force-reload the shared profile so every avatar updates
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile photo.');
    } finally {
      setAvatarSaving(false);
    }
  };

  const initials = profile?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '..';

  return (
    <div className="flex flex-col gap-5">
      <div className="hidden lg:block">
        <PageHeader eyebrow="Account" title="Profile" description="Manage your personal information." />
      </div>

      <div className="flex flex-col gap-5 min-w-0">
          <Card padding="none" className="rounded-2xl overflow-hidden">
            <div className="px-6 py-6 bg-gradient-to-br from-brand-pale-orange/60 to-cream flex items-center gap-5 border-b border-bone">
              <div className="relative shrink-0">
                <div className="w-[72px] h-[72px] rounded-full bg-white overflow-hidden flex items-center justify-center text-[24px] font-bold text-brand-deep-orange border-[3px] border-white outline outline-1 outline-bone">
                  {loading
                    ? <SkeletonBox width={72} height={72} rounded="50%" />
                    : profile?.profileImage
                      ? <img loading="lazy" decoding="async" src={profile.profileImage} alt={profile.name} className="w-full h-full object-cover" />
                      : initials}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelected}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || avatarBusy}
                  aria-label="Change profile photo"
                  title="Change profile photo"
                  className={clsx(
                    'absolute bottom-0 end-0 w-[24px] h-[24px] rounded-full bg-brand-orange border-2 border-white flex items-center justify-center',
                    avatarBusy ? 'cursor-wait opacity-80' : 'cursor-pointer',
                  )}
                >
                  {avatarBusy ? <Loader2 size={11} className="text-white animate-spin" /> : <Camera size={11} className="text-white" />}
                </button>
              </div>
              <div className="min-w-0">
                <p className="text-[17px] font-bold text-charcoal truncate">{loading ? '…' : profile?.name ?? '—'}</p>
                <p className="text-[12.5px] text-slate truncate mt-[3px]">{loading ? '' : profile?.email ?? '—'}</p>
                {!loading && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Badge color="orange" size="sm" className="capitalize">{profile?.role ?? ''}</Badge>
                    {profile?.isVerified && <Badge color="green" size="sm"><Check size={9} className="me-[2px]" /> Verified</Badge>}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex flex-col gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i}>
                      <SkeletonBox width={90} height={11} className="mb-[6px]" />
                      <SkeletonBox width="100%" height={42} rounded="10px" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <SectionHeading icon={<UserCircle size={15} className="text-brand-orange" />} title="Basic Details" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    <div>
                      <label className={LABEL_CLS}>First Name</label>
                      <input value={firstName} onChange={e => setFirstName(e.target.value)} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Last Name</label>
                      <input value={lastName} onChange={e => setLastName(e.target.value)} className={INPUT_CLS} />
                    </div>
                  </div>
                  <div className="mb-5">
                    <label className={LABEL_CLS}>Email Address</label>
                    <div className="flex items-center gap-[10px]">
                      <input readOnly value={profile?.email ?? ''} className={clsx(INPUT_CLS, 'flex-1 bg-cream text-slate cursor-default')} />
                      {profile?.isVerified && (
                        <span className="px-3 py-[6px] rounded-[8px] text-[12px] font-semibold bg-success-bg text-success flex items-center gap-1 shrink-0">
                          <Check size={10} /> Verified
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-[#f0ede5] my-5" />

                  <SectionHeading icon={<Phone size={14} className="text-brand-orange" />} title="Contact" />
                  <div className="mb-6">
                    <label className={LABEL_CLS}>Phone Number</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +92 300 0000000" className={INPUT_CLS} />
                    <button
                      type="button"
                      onClick={() => navigate('/account/addresses')}
                      className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-brand-orange bg-transparent border-none cursor-pointer p-0 hover:underline"
                    >
                      <MapPin size={11} /> Manage delivery addresses
                    </button>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-[#f0ede5]">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className={clsx(
                        'mt-4 px-7 py-[11px] bg-brand-orange border-none rounded-[10px] text-[13px] font-semibold text-white flex items-center gap-2',
                        saving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-brand-deep-orange transition-colors',
                      )}
                    >
                      {saving && <Loader2 size={13} className="animate-spin" />}
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    {saved && <span className="text-[12px] text-success font-medium mt-4">Profile updated</span>}
                    {saveError && <span className="text-[12px] text-error font-medium mt-4">{saveError}</span>}
                  </div>
                </>
              )}
            </div>
          </Card>


      </div>


    </div>
  );
}
