import { useEffect, useState } from 'react';
import {
  User, KeyRound, ShieldCheck, Bell, Camera, ChevronLeft, ChevronRight,
  Settings, Check, Loader2, Eye, EyeOff, type LucideIcon,
} from 'lucide-react';
import { useGetProfile } from '@/hooks/auth/useGetProfile';
import { useEditProfile } from '@/hooks/auth/useEditProfile';
import { useChangePassword } from '@/hooks/auth/useChangePassword';
import { useUpload } from '@/hooks/upload/useUpload';
import { NotificationsPanel } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import { AdminNavMenu } from '@/components/layouts/AdminLayout';
import { apiAdminAnalyticsOverview, type AdminOverviewData } from '@/api/services/analytics/adminAnalytics';
import { formatCurrency, formatNumber } from '@/components/comman/analytics/format';

// ── Types & Nav ───────────────────────────────────────────────────────────────
// No "Delete Account" here — admin self-deletion isn't supported by the
// backend (usersService.deleteAccount only handles role==='user'|'seller')
// and isn't intended: removing an admin account needs a separate admin-team
// management flow (revoke access), not a self-service delete button.
type Section = 'profile' | 'security' | 'two-factor' | 'notifications';

const NAV: { group: string; isDanger?: boolean; items: { id: Section; label: string; Icon: LucideIcon }[] }[] = [
  {
    group: 'Account',
    items: [
      { id: 'profile',       label: 'Profile',          Icon: User       },
      { id: 'security',      label: 'Email & Password', Icon: KeyRound   },
      { id: 'two-factor',    label: 'Two-Factor Auth',  Icon: ShieldCheck},
      { id: 'notifications', label: 'Notifications',    Icon: Bell       },
    ],
  },
];

// ── Mobile-only admin hero — same native-app account-hub pattern already
// built for Seller/Store Settings (avatar/name/identity + a real stats
// strip). Stats reuse the exact same 30-day platform overview call
// AdminOverview.tsx already makes — never fabricated numbers.
function MobileAdminHero({
  name, email, image, isVerified, overview, loading,
}: {
  name?: string; email?: string; image?: string | null; isVerified?: boolean;
  overview: AdminOverviewData | null; loading: boolean;
}) {
  return (
    <div className="lg:hidden -mx-4 -mt-5">
      <div className="relative overflow-hidden bg-gradient-to-br from-carbon via-brand-deep-orange to-brand-orange px-6 pt-8 pb-12 flex flex-col items-center text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }}
        />
        {image ? (
          <img
            loading="lazy" decoding="async"
            src={image} alt={name ?? 'Admin'}
            className="relative size-24 rounded-full object-cover ring-4 ring-white/40"
          />
        ) : (
          <div className="relative size-24 rounded-full bg-white/15 ring-4 ring-white/40 flex items-center justify-center text-white text-[26px] font-bold">
            {name ? name.slice(0, 2).toUpperCase() : 'AD'}
          </div>
        )}
        <p className="relative text-[19px] font-bold text-white mt-3 leading-tight">{name ?? 'Admin'}</p>
        {email && <p className="relative text-[13px] text-white/75 mt-[2px]">{email}</p>}
        <div className="relative flex items-center gap-1.5 mt-3">
          <span className="inline-flex px-4 py-[6px] rounded-full bg-white/15 text-[11px] font-semibold text-white">
            Admin Account
          </span>
          {isVerified && (
            <span className="inline-flex items-center gap-1 px-3 py-[6px] rounded-full bg-white/15 text-[11px] font-semibold text-white">
              <Check size={10} /> Verified
            </span>
          )}
        </div>
      </div>

      <div className="relative -mt-6 mx-4 rounded-t-[24px] bg-white px-2 pt-5 pb-4 flex items-center">
        <div className="flex-1 flex flex-col items-center gap-[2px]">
          <span className="text-[19px] font-bold text-brand-orange leading-none">{loading || !overview ? '—' : formatNumber(overview.totalSellers)}</span>
          <span className="text-[11px] text-slate">Sellers</span>
        </div>
        <div className="w-px h-9 bg-bone" />
        <div className="flex-1 flex flex-col items-center gap-[2px]">
          <span className="text-[19px] font-bold text-brand-orange leading-none">{loading || !overview ? '—' : formatCurrency(overview.totalGMV)}</span>
          <span className="text-[11px] text-slate">GMV (30d)</span>
        </div>
        <div className="w-px h-9 bg-bone" />
        <div className="flex-1 flex flex-col items-center gap-[2px]">
          <span className="text-[19px] font-bold text-brand-orange leading-none">{loading || !overview ? '—' : formatNumber(overview.newUsers)}</span>
          <span className="text-[11px] text-slate">New Users</span>
        </div>
      </div>
    </div>
  );
}

// ── Mobile-only navigation menu — this page's own local "Account" tabs
// (Profile/Security/2FA/Notifications), same grouped-card pattern as
// Seller/Store Settings. The rest of the admin panel's modules render below
// via the shared AdminNavMenu.
function MobileAdminMenu({ active, onSelect }: { active: Section; onSelect: (id: Section) => void }) {
  return (
    <div className="lg:hidden bg-white border border-bone rounded-2xl overflow-hidden">
      {NAV.map(group => (
        <div key={group.group}>
          <div className="px-5 pt-4 pb-2">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate">{group.group}</p>
          </div>
          <div className="divide-y divide-bone">
            {group.items.map(item => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-5 py-[13px] bg-transparent border-0 cursor-pointer text-left transition-colors ${isActive ? 'bg-cream' : 'hover:bg-cream'}`}
                >
                  <div className="w-8 h-8 rounded-[9px] bg-brand-pale-orange flex items-center justify-center shrink-0">
                    <item.Icon size={15} className="text-brand-orange" />
                  </div>
                  <span className="flex-1 text-[13px] font-medium text-charcoal">{item.label}</span>
                  <ChevronRight size={15} className="text-slate shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Profile Skeleton ──────────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <>
      <div className="flex items-center gap-4 mb-[22px]">
        <div className="animate-pulse w-[76px] h-[76px] rounded-full bg-bone flex-shrink-0" />
        <div>
          <div className="animate-pulse w-[110px] h-[13px] rounded bg-bone mb-2" />
          <div className="animate-pulse w-20 h-[11px] rounded bg-bone" />
        </div>
      </div>
      <div className="h-px bg-mist mb-5" />
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="mb-4">
          <div className="animate-pulse w-20 h-[11px] rounded bg-bone mb-[6px]" />
          <div className="animate-pulse w-full h-[38px] rounded-lg bg-bone" />
        </div>
      ))}
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AdminSettings() {
  const [active,    setActive]    = useState<Section>('profile');
  // Mobile-only: whether we've drilled into a section from the account-hub
  // menu below — mirrors the same pattern on Seller/Store Settings. Desktop
  // ignores this; it always shows the content + sidebar.
  const [mobileDrilledIn, setMobileDrilledIn] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [address,   setAddress]   = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const { profile, loading: profileLoading } = useGetProfile();
  const { execute: editProfile, loading: saving, error: saveError, success: saved } = useEditProfile();
  const { upload: uploadPhoto, uploading: photoUploading } = useUpload('public');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword,     setShowNewPassword]     = useState(false);
  const { execute: changePassword, loading: pwSaving, error: pwError, success: pwSuccess } = useChangePassword();

  useEffect(() => {
    if (!profile) return;
    const parts = profile.name.split(' ');
    setFirstName(parts[0] ?? '');
    setLastName(parts.slice(1).join(' '));
    setPhone(profile.phone ?? '');
    setAddress(profile.address ?? '');
    setProfileImage(profile.profileImage ?? '');
  }, [profile]);

  useEffect(() => {
    apiAdminAnalyticsOverview({ range: '30d' })
      .then(res => setOverview(res.data))
      .catch(() => {})
      .finally(() => setOverviewLoading(false));
  }, []);

  const handleSave = () => {
    const name = `${firstName} ${lastName}`.trim();
    editProfile({ name, phone, address, profileImage });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadPhoto(file).then(data => setProfileImage(data.url)).catch(() => {});
  };

  const handleChangePassword = async () => {
    const ok = await changePassword({ currentPassword, newPassword });
    if (ok) { setCurrentPassword(''); setNewPassword(''); }
  };

  const allItems  = NAV.flatMap(g => g.items);
  const activeItem = allItems.find(i => i.id === active);

  return (
    <>
      <AdminStudioHeader eyebrow="Edudeen team workspace · Account" title="Settings" subtitle="Manage your admin account and preferences." />

      <div className="px-4 sm:px-7 pt-5 pb-8">

        {/* Mobile-only account hub — hero (avatar/name/role + real platform
           stats) + this page's own Account menu + every other admin module
           below it. Hidden once a section has been opened. */}
        {!mobileDrilledIn && (
          <div className="lg:hidden flex flex-col gap-4 mb-5">
            <MobileAdminHero
              name={profile?.name}
              email={profile?.email}
              image={profileImage}
              isVerified={profile?.isVerified}
              overview={overview}
              loading={overviewLoading}
            />
            <MobileAdminMenu active={active} onSelect={id => { setActive(id); setMobileDrilledIn(true); }} />

            {/* Every other admin module (Commerce/People/Growth/Finance/
               Content/Analytics/System) — not the dashboard, which stays a
               pure glance page. 'settings' is excluded since this local
               Account menu above already covers it. */}
            <AdminNavMenu excludeItemIds={['settings']} />
          </div>
        )}

        {/* Mobile-only back bar — shown only once a section is open. */}
        {mobileDrilledIn && (
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <button
              onClick={() => setMobileDrilledIn(false)}
              aria-label="Back to account menu"
              className="size-8 -ml-1 flex items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-charcoal hover:bg-cream transition-colors"
            >
              <ChevronLeft size={19} />
            </button>
            <p className="text-[15px] font-bold text-carbon">{activeItem?.label ?? 'Settings'}</p>
          </div>
        )}

        <div className={`${mobileDrilledIn ? 'grid' : 'hidden lg:grid'} grid-cols-1 lg:grid-cols-[1fr_260px] gap-5`}>

          {/* ── LEFT: Content ── */}
          <div>

            {/* Profile */}
            {active === 'profile' && (
              <div className="bg-white border border-bone rounded-xl px-4 sm:px-[26px] py-6">
                <p className="text-[16px] font-bold text-charcoal mb-[22px]">Profile</p>

                {profileLoading ? <ProfileSkeleton /> : (
                  <>
                    {/* Avatar */}
                    <div className="flex items-center gap-4 mb-[22px]">
                      <label className={`relative flex-shrink-0 ${photoUploading ? 'cursor-wait' : 'cursor-pointer'}`}>
                        <div className="w-[76px] h-[76px] rounded-full bg-brand-pale-orange text-brand-deep-orange text-[26px] font-bold flex items-center justify-center overflow-hidden">
                          {photoUploading
                            ? <Loader2 size={24} className="animate-spin" />
                            : profileImage
                              ? <img loading="lazy" decoding="async" src={profileImage} alt={profile?.name} className="w-full h-full object-cover" />
                              : (profile?.name?.slice(0, 2).toUpperCase() ?? 'AD')}
                        </div>
                        <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-brand-orange flex items-center justify-center">
                          <Camera size={12} className="text-white" />
                        </span>
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePhotoChange} disabled={photoUploading} />
                      </label>
                      <div>
                        <p className="text-[13px] font-semibold text-charcoal mb-[3px]">Profile Photo</p>
                        <p className="text-[12px] text-slate mb-2">JPG, PNG — max 2 MB</p>
                        <label className={`inline-block px-[14px] py-[5px] bg-white border border-bone rounded-[7px] text-[12px] text-graphite ${photoUploading ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}>
                          {photoUploading ? 'Uploading…' : 'Upload Photo'}
                          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePhotoChange} disabled={photoUploading} />
                        </label>
                      </div>
                    </div>

                    <div className="h-px bg-mist mb-5" />

                    {/* Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px] mb-4">
                      <div>
                        <label className="text-[12px] font-medium text-graphite mb-[5px] block">First Name</label>
                        <input value={firstName} onChange={e => setFirstName(e.target.value)}
                          className="w-full px-3 py-[9px] text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white box-border" />
                      </div>
                      <div>
                        <label className="text-[12px] font-medium text-graphite mb-[5px] block">Last Name</label>
                        <input value={lastName} onChange={e => setLastName(e.target.value)}
                          className="w-full px-3 py-[9px] text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white box-border" />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="mb-4">
                      <label className="text-[12px] font-medium text-graphite mb-[5px] block">Email</label>
                      <div className="flex items-center gap-[10px]">
                        <input readOnly value={profile?.email ?? ''}
                          className="flex-1 min-w-0 px-3 py-[9px] text-[13px] border border-bone rounded-lg outline-none text-slate bg-cream box-border" />
                        {profile?.isVerified && (
                          <span className="px-[10px] py-1 rounded-[5px] text-[11px] font-semibold bg-[#e3f4ea] text-[#1e7a3c] flex items-center gap-1 flex-shrink-0">
                            <Check size={10} /> Verified
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="mb-4">
                      <label className="text-[12px] font-medium text-graphite mb-[5px] block">Phone Number</label>
                      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +92 300 0000000"
                        className="w-full px-3 py-[9px] text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white box-border" />
                    </div>

                    {/* Address */}
                    <div className="mb-4">
                      <label className="text-[12px] font-medium text-graphite mb-[5px] block">Address</label>
                      <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Your address"
                        className="w-full px-3 py-[9px] text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white box-border" />
                    </div>

                    {/* Role + Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px] mb-[22px]">
                      <div>
                        <label className="text-[12px] font-medium text-graphite mb-[5px] block">Role</label>
                        <input readOnly value={profile?.role ?? ''}
                          className="w-full px-3 py-[9px] text-[13px] border border-bone rounded-lg outline-none text-slate bg-cream box-border capitalize" />
                      </div>
                      <div>
                        <label className="text-[12px] font-medium text-graphite mb-[5px] block">Account Status</label>
                        <input readOnly value={profile?.status ?? ''}
                          className="w-full px-3 py-[9px] text-[13px] border border-bone rounded-lg outline-none bg-cream box-border capitalize"
                          style={{ color: profile?.status === 'active' ? '#1E7A3C' : '#64727B' }} />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`px-6 py-[10px] bg-brand-orange hover:bg-brand-deep-orange border-none rounded-lg text-[13px] font-semibold text-white flex items-center gap-2 transition-colors duration-150 ${saving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                      >
                        {saving && <Loader2 size={13} className="animate-spin" />}
                        {saving ? 'Saving…' : 'Save Changes'}
                      </button>
                      {saved && <span className="text-[11px] text-success font-medium">Profile updated</span>}
                      {saveError && <span className="text-[11px] text-error font-medium">{saveError}</span>}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Email & Password section */}
            {active === 'security' && (
              <div className="bg-white border border-bone rounded-xl px-4 sm:px-[26px] py-6">
                <p className="text-[16px] font-bold text-charcoal mb-[22px]">Email &amp; Password</p>

                <div className="mb-5">
                  <label className="text-[12px] font-medium text-graphite mb-[5px] block">Email</label>
                  <input readOnly value={profile?.email ?? ''}
                    className="w-full px-3 py-[9px] text-[13px] border border-bone rounded-lg outline-none text-slate bg-cream box-border" />
                </div>

                <div className="h-px bg-mist mb-5" />

                <p className="text-[13px] font-semibold text-charcoal mb-4">Change Password</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px] mb-4">
                  <div>
                    <label className="text-[12px] font-medium text-graphite mb-[5px] block">Current Password</label>
                    <div className="relative">
                      <input type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                        className="w-full px-3 pr-[42px] py-[9px] text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white box-border" />
                      <button type="button" onClick={() => setShowCurrentPassword(s => !s)}
                        aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-slate p-0 flex hover:text-charcoal transition-colors">
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-graphite mb-[5px] block">New Password</label>
                    <div className="relative">
                      <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                        className="w-full px-3 pr-[42px] py-[9px] text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white box-border" />
                      <button type="button" onClick={() => setShowNewPassword(s => !s)}
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-slate p-0 flex hover:text-charcoal transition-colors">
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleChangePassword}
                    disabled={pwSaving || !currentPassword || !newPassword}
                    className={`px-6 py-[10px] bg-brand-orange hover:bg-brand-deep-orange border-none rounded-lg text-[13px] font-semibold text-white flex items-center gap-2 transition-colors duration-150 ${pwSaving || !currentPassword || !newPassword ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                  >
                    {pwSaving && <Loader2 size={13} className="animate-spin" />}
                    {pwSaving ? 'Updating…' : 'Update Password'}
                  </button>
                  {pwSuccess && <span className="text-[11px] text-success font-medium">Password changed successfully</span>}
                  {pwError && <span className="text-[11px] text-error font-medium">{pwError}</span>}
                </div>
              </div>
            )}

            {/* Notifications section */}
            {active === 'notifications' && (
              <NotificationsPanel />
            )}

            {/* Other sections */}
            {active !== 'profile' && active !== 'security' && active !== 'notifications' && (
              <div className="bg-white border border-bone rounded-xl px-4 sm:px-[26px] py-6">
                <div className="flex flex-col items-center justify-center py-[60px] text-center">
                  <div className="text-slate mb-[14px]">
                    {activeItem ? <activeItem.Icon size={40} /> : <Settings size={40} />}
                  </div>
                  <p className="text-[15px] font-semibold text-charcoal mb-[6px]">
                    {activeItem?.label ?? 'Settings'}
                  </p>
                  <p className="text-[13px] text-slate">
                    Settings for this section are coming soon.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Nav sidebar — desktop only ── */}
          <div className="hidden lg:block">
            <div className="bg-white border border-bone rounded-xl sticky top-6" style={{ padding: 0 }}>
              {NAV.map((group, gi) => (
                <div key={group.group}>
                  {gi > 0 && <div className="h-px bg-mist" />}
                  <div className="px-4 pt-[10px] pb-1">
                    <p className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${group.isDanger ? 'text-[#c0392b]' : 'text-slate'}`}>
                      {group.group}
                    </p>
                  </div>
                  {group.items.map(item => {
                    const isActive  = active === item.id;
                    const isDanger  = group.isDanger;
                    const activeColor = isDanger ? '#C0392B' : '#174771';
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActive(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className="w-full flex items-center gap-[10px] px-4 py-[9px] cursor-pointer border-none text-left transition-colors duration-[120ms] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-orange/40"
                        style={{
                          borderLeft: `3px solid ${isActive ? activeColor : 'transparent'}`,
                          background: isActive ? (isDanger ? '#FDECEA' : '#EAF2F8') : 'transparent',
                          color: isActive ? activeColor : (isDanger ? '#C0392B' : '#486071'),
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F5F8FA'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <item.Icon size={14} className="flex-shrink-0" />
                        <span className="text-[13px]" style={{ fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
