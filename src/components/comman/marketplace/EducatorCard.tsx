import { BadgeCheck, GraduationCap, BookOpen, School, Clock } from 'lucide-react';
import type { EducatorProfile } from '@/api/services/store';

/** True when the teacher has filled in anything worth showing. */
export function hasEducatorProfile(p?: EducatorProfile | null): p is EducatorProfile {
  return !!p && !!(p.headline || p.qualifications?.length || p.subjects?.length || p.institutions?.length || p.experienceYears != null);
}

/** "Meet the teacher" — the person behind a store, with the admin-granted badge when verified. */
export function EducatorCard({ profile, verified, name, compact = false }: {
  profile: EducatorProfile; verified: boolean; name: string; compact?: boolean;
}) {
  const facts = [
    profile.experienceYears != null && { Icon: Clock, label: 'Teaching', value: `${profile.experienceYears} year${profile.experienceYears === 1 ? '' : 's'}` },
    profile.qualifications?.length && { Icon: GraduationCap, label: 'Qualifications', value: profile.qualifications.join(' · ') },
    profile.subjects?.length && { Icon: BookOpen, label: 'Teaches', value: profile.subjects.join(', ') },
    profile.institutions?.length && { Icon: School, label: 'Has taught at', value: profile.institutions.join(', ') },
    profile.teachingLevels?.length && { Icon: GraduationCap, label: 'Levels', value: profile.teachingLevels.join(', ') },
  ].filter(Boolean) as { Icon: typeof Clock; label: string; value: string }[];

  return (
    <section aria-label="Meet the teacher" className="rounded-2xl border border-bone bg-white px-5 py-4">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-royal">Meet the teacher</p>
        {verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-bg text-success text-[12px] font-semibold px-2 py-[2px]">
            <BadgeCheck size={12} /> Verified Educator
          </span>
        )}
      </div>
      <p className="text-[15px] font-bold text-carbon">{name}</p>
      {profile.headline && <p className="text-[13px] text-graphite mt-0.5">{profile.headline}</p>}
      {facts.length > 0 && (
        <dl className={compact ? 'mt-3 flex flex-col gap-2' : 'mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2'}>
          {facts.map(f => (
            <div key={f.label} className="flex items-start gap-2 min-w-0">
              <f.Icon size={14} className="text-brand-orange mt-[3px] shrink-0" aria-hidden />
              <div className="min-w-0">
                <dt className="text-[12px] text-slate">{f.label}</dt>
                <dd className="text-[13px] text-carbon break-words">{f.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
