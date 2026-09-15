import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, LifeBuoy, Clock, Send, Check, ArrowRight } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button, Input, Textarea, Select } from '@/components/comman/ui';
import { apiSubmitContact } from '@/api/services/contact';
import { RevealStagger } from '@/components/comman/motion/Reveal';
import { MagneticButton } from '@/components/comman/motion/MagneticButton';
import { SectionHeading } from '@/components/comman/motion/SectionHeading';
import { PremiumCard } from '@/components/comman/motion/PremiumCard';
import { motion } from 'motion/react';

const TOPICS = ['General question', 'Order or delivery', 'Billing & payments', 'Selling on Edudeen', 'Report a problem'];

const CONTACT_CARDS = [
  { Icon: Mail,     label: 'Email us',        value: 'support@edudeen.com' },
  { Icon: LifeBuoy,  label: 'Help Center',     value: 'Browse FAQs & guides' },
  { Icon: Clock,     label: 'Response time',   value: 'Usually within 24 hours' },
];

export function ContactUsPage() {
  usePageTitle('Contact Us');
  const navigate = useNavigate();

  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [topic, setTopic]     = useState(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [error, setError]     = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in your name, email, and message.');
      return;
    }
    setError('');
    setSending(true);
    try {
      await apiSubmitContact({ name, email, topic, message });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send your message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-cream min-h-full">
      {/* ── Hero ── */}
      <div className="px-4 md:px-8 lg:px-12 pt-14 md:pt-20 pb-10 max-w-[720px] mx-auto">
        <SectionHeading title="Get in touch" subtitle="Questions, feedback, or need a hand with an order? We're here to help." align="center" size="lg" />
      </div>

      {/* ── Contact info cards ── */}
      <RevealStagger className="max-w-[840px] mx-auto px-4 md:px-8 lg:px-12 pb-10 grid grid-cols-1 sm:grid-cols-3 gap-3" step={0.06} y={14}>
        {CONTACT_CARDS.map(({ Icon, label, value }) => (
          <PremiumCard key={label} className="p-5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-pale-orange flex items-center justify-center shrink-0">
              <Icon size={16} className="text-brand-orange" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-carbon">{label}</p>
              <p className="text-[12px] text-slate mt-0.5 truncate">{value}</p>
            </div>
          </PremiumCard>
        ))}
      </RevealStagger>

      {/* ── Contact form ── */}
      <div className="bg-white border-t border-b border-bone">
        <div className="max-w-[560px] mx-auto px-4 md:px-8 py-12">
          {sent ? (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <motion.div
                className="w-12 h-12 rounded-full bg-success-bg flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <Check size={22} className="text-success" />
              </motion.div>
              <p className="text-[16px] font-bold text-carbon">Message sent</p>
              <p className="text-[13px] text-slate max-w-[360px]">
                Thanks for reaching out — our support team will get back to you at {email}, usually within 24 hours.
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/faq')}>
                Browse the Help Center
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Your name" placeholder="Jane Cooper" value={name} onChange={e => setName(e.target.value)} />
                  <Input label="Email address" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <Select label="What's this about?" value={topic} onChange={e => setTopic(e.target.value)}>
                  {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
                <Textarea
                  label="Message" rows={5}
                  placeholder="Tell us a bit about what's going on…"
                  value={message} onChange={e => setMessage(e.target.value)}
                />
                {error && (
                  <motion.p className="text-[12px] text-error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    {error}
                  </motion.p>
                )}
                <MagneticButton className="block">
                  <Button type="submit" variant="primary" fullWidth loading={sending} icon={!sending && <Send size={14} />}>
                    {sending ? 'Sending…' : 'Send Message'}
                  </Button>
                </MagneticButton>
              </form>

              {/* ── FAQ cross-link — inside the same white block, right below
                  the form, so it reads as one connected section instead of a
                  card floating alone in open space. */}
              <PremiumCard onClick={() => navigate('/faq')} className="p-5 flex items-center justify-between gap-3 mt-8">
                <div>
                  <p className="text-[13px] font-semibold text-carbon">Looking for a quick answer?</p>
                  <p className="text-[12px] text-slate mt-0.5">Check our Frequently Asked Questions first — you might not need to wait for a reply.</p>
                </div>
                <ArrowRight size={16} className="text-slate shrink-0" />
              </PremiumCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
