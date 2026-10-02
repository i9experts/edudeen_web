import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Printer, BadgeCheck } from 'lucide-react';
import { EdudeenLogo } from '@/components/comman/ui/EdudeenLogo';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getStorePagePath } from '@/utils/storefrontUrl';
import { apiVerifyCertificate, type CertificateData } from '@/api/services/classroom';

/**
 * `/certificates/:code` — a course certificate. Public on purpose: the code
 * printed on it lets a school or employer confirm it's genuine.
 */
export function CertificatePage() {
  const { code = '' } = useParams();
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [error, setError] = useState(false);
  usePageTitle(cert ? `Certificate — ${cert.courseName}` : 'Certificate');

  useEffect(() => { apiVerifyCertificate(code).then(res => setCert(res.data)).catch(() => setError(true)); }, [code]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 p-6 text-center bg-cream">
        <p className="text-[17px] font-bold text-carbon">No certificate found for “{code}”</p>
        <p className="text-[13.5px] text-slate">Check the code printed at the bottom of the certificate.</p>
        <Link to="/" className="text-brand-orange text-[13.5px] font-semibold mt-2">Go to Edudeen</Link>
      </div>
    );
  }
  if (!cert) return <p className="p-8 text-slate">Checking certificate…</p>;
  const date = new Date(cert.completedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#eef1f4] print:bg-white py-8 print:py-0 px-4">
      <div className="max-w-[900px] mx-auto mb-4 flex items-center gap-3 flex-wrap print:hidden">
        <p className="inline-flex items-center gap-1.5 text-[13px] text-success font-semibold m-0"><BadgeCheck size={16} /> Verified by Edudeen</p>
        <button type="button" onClick={() => window.print()} className="ms-auto inline-flex items-center gap-2 rounded-lg bg-carbon text-white px-4 py-2 text-[13px] font-semibold border-none cursor-pointer">
          <Printer size={14} /> Print or save as PDF
        </button>
      </div>
      <article className="max-w-[900px] mx-auto bg-white aspect-[1.414/1] shadow-sm print:shadow-none rounded-xl print:rounded-none p-[5%] flex flex-col items-center justify-center text-center relative overflow-hidden">
        <div className="absolute inset-[18px] border-[3px] border-double border-brand-gold/70 rounded-lg pointer-events-none" />
        <EdudeenLogo size={34} />
        <p className="text-[12px] font-bold tracking-[0.3em] uppercase text-brand-royal mt-6 mb-2">Certificate of completion</p>
        <p className="text-[14px] text-slate m-0">This certifies that</p>
        <h1 className="font-serif font-normal text-[34px] md:text-[46px] text-carbon my-3 leading-tight">{cert.learnerName}</h1>
        <p className="text-[14px] text-slate m-0">has successfully completed</p>
        <h2 className="text-[20px] md:text-[26px] font-bold text-carbon mt-2 mb-1 max-w-[80%]">{cert.courseName}</h2>
        {cert.teacher && (
          <p className="text-[14px] text-graphite m-0">taught by {cert.storeSlug ? <Link to={getStorePagePath(cert.storeSlug)} className="text-graphite">{cert.teacher}</Link> : cert.teacher}</p>
        )}
        <div className="mt-8 flex items-end justify-center gap-12 text-[12.5px] text-slate">
          <div><p className="m-0 font-semibold text-carbon">{date}</p><p className="m-0">Date</p></div>
          <div><p className="m-0 font-mono font-semibold text-carbon">{cert.code}</p><p className="m-0">Verify at edudeen.com/certificates</p></div>
        </div>
      </article>
    </div>
  );
}
