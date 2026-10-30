import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Printer, BadgeCheck, Download } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getStorePagePath } from '@/utils/storefrontUrl';
import { apiVerifyCertificate, type CertificateData } from '@/api/services/classroom';
import { CertificateView } from '@/features/buyer/components/CertificateView';

/**
 * `/certificates/:code` — a course certificate. Public on purpose: the code
 * printed on it lets a school or employer confirm it's genuine.
 * Print and "Download PDF" both use the browser's print dialog (A4 landscape; choose "Save as PDF" to get a file).
 */
export function CertificatePage() {
  const { code = '' } = useParams();
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [error, setError] = useState(false);
  const title = cert?.courseTitle ?? cert?.courseName;
  usePageTitle(cert ? `Certificate — ${title}` : 'Certificate');

  useEffect(() => { apiVerifyCertificate(code).then(res => setCert(res.data)).catch(() => setError(true)); }, [code]);

  // The print stylesheet only hides the rest of the app while this class is on <html>.
  useEffect(() => {
    document.documentElement.classList.add('cert-printing');
    return () => document.documentElement.classList.remove('cert-printing');
  }, []);

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

  const teacher = cert.instructorName ?? cert.teacher;
  const storeName = cert.storeName ?? null;

  return (
    <div className="min-h-screen bg-[#eef1f4] print:bg-white py-8 print:py-0 px-3 sm:px-4 overflow-x-clip">
      <div className="max-w-[1000px] mx-auto mb-4 flex items-center gap-3 flex-wrap print:hidden">
        <p className="inline-flex items-center gap-1.5 text-[13px] text-success font-semibold m-0"><BadgeCheck size={16} /> Verified by Edudeen</p>
        <div className="ms-auto flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-carbon text-white px-4 py-2 text-[13px] font-semibold border-none cursor-pointer">
            <Printer size={14} /> Print
          </button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-white text-carbon px-4 py-2 text-[13px] font-semibold border border-bone cursor-pointer">
            <Download size={14} /> Download PDF
          </button>
        </div>
        <p className="basis-full text-[12px] text-slate m-0 text-end">To save a PDF, choose “Save as PDF” as the printer in the print window.</p>
      </div>
      <div className="max-w-[1000px] mx-auto rounded-xl overflow-hidden">
        <CertificateView
          printable
          config={cert.config ?? null}
          data={{
            learnerName: cert.learnerName,
            courseTitle: title ?? '',
            code: cert.code,
            date: cert.issuedAt ?? cert.completedAt,
            guardianName: cert.guardianName,
            institute: cert.institute,
            city: cert.city,
            country: cert.country,
            instructorName: teacher,
            storeName,
            storeLogoUrl: cert.storeLogoUrl ?? null,
          }}
        />
      </div>
      {cert.storeSlug && (
        <p className="max-w-[1000px] mx-auto mt-3 text-[13px] text-slate print:hidden">
          Taught by <Link to={getStorePagePath(cert.storeSlug)} className="text-brand-royal font-semibold">{teacher ?? storeName ?? 'the seller'}</Link>
        </p>
      )}
    </div>
  );
}
