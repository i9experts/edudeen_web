import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowUp } from 'lucide-react';
import { EdudeenLogo } from './EdudeenLogo';
import { apiSubscribeNewsletter } from '../../../api/services/newsletter';
import { scrollRootToTop } from '@/utils/scrollRoot';

const FOOTER_LINKS: { label: string; path: string }[] = [
  { label: 'Marketplace',      path: '/marketplace' },
  { label: 'Education',        path: '/education' },
  { label: 'Sell on Edudeen',  path: '/sellers' },
  { label: 'Pricing',          path: '/pricing' },
  { label: 'About',            path: '/about' },
  { label: 'FAQ',              path: '/faq' },
  { label: 'Contact',          path: '/contact-us' },
  { label: 'Privacy',          path: '/privacy-policy' },
  { label: 'Terms',            path: '/terms-of-service' },
];

const CONTACT_EMAIL = 'support@edudeen.com';

function Newsletter() {
  const [email, setEmail]     = useState('');
  const [subscribed, setSub]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      await apiSubscribeNewsletter(email.trim());
      setSub(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return (
      <p className="flex items-center gap-2 text-[13px] text-brand-orange">
        <Check size={14} /> You're subscribed — thank you!
      </p>
    );
  }

  return (
    <div className="w-full sm:w-auto">
      <form onSubmit={submit} className="flex items-stretch border border-[#afbdc6] rounded-full overflow-hidden w-full sm:w-[340px] bg-white">
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="email"
          required
          placeholder="Your email for new resources"
          aria-label="Email address"
          disabled={loading}
          className="flex-1 min-w-0 px-4 py-[10px] text-[13px] text-carbon placeholder:text-slate bg-transparent border-none outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 px-4 bg-brand-orange text-white text-[13px] font-bold border-none cursor-pointer hover:brightness-95 disabled:opacity-70"
        >
          {loading ? '…' : 'Subscribe'}
        </button>
      </form>
      {error && <p className="mt-1.5 pl-2 text-[11.5px] text-error">{error}</p>}
    </div>
  );
}

export function Footer({ showNewsletter = true }: { showNewsletter?: boolean }) {
  const navigate = useNavigate();

  return (
    <footer className="bg-white border-t border-bone text-slate">
      <div className="px-[5%] md:px-[4%] py-[35px] flex flex-wrap items-center gap-[15px] md:gap-[25px] text-[13px]">
        <button onClick={() => navigate('/')} aria-label="Edudeen home" className="bg-transparent border-none p-0 cursor-pointer">
          <EdudeenLogo size={26} />
        </button>
        <p className="m-0 text-[12px] md:text-[13px] text-brand-orange">Purposeful learning. Meaningful possibilities.</p>
        <span className="hidden md:inline">Islamic &amp; educational resources for homes and classrooms.</span>
        <a href={`mailto:${CONTACT_EMAIL}`} className="md:ml-auto text-slate hover:text-brand-orange">{CONTACT_EMAIL}</a>
      </div>

      <div className="border-t border-bone px-[5%] md:px-[4%] py-5 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
          {FOOTER_LINKS.map(l => (
            <button
              key={l.path}
              onClick={() => navigate(l.path)}
              className="bg-transparent border-none p-0 cursor-pointer text-slate hover:text-brand-orange"
            >
              {l.label}
            </button>
          ))}
        </nav>
        {showNewsletter && <div className="lg:ml-auto"><Newsletter /></div>}
      </div>

      <div className="border-t border-bone px-[5%] md:px-[4%] py-3 flex items-center justify-between gap-3 text-[12px]">
        <span>© {new Date().getFullYear()} Edudeen LLC. All rights reserved.</span>
        <button
          type="button"
          onClick={() => scrollRootToTop('smooth')}
          className="flex items-center gap-1.5 bg-transparent border-none p-0 cursor-pointer text-slate hover:text-brand-orange"
        >
          Back to top <ArrowUp size={13} />
        </button>
      </div>
    </footer>
  );
}
