import type { ReactNode } from 'react';
import { resolveCategoryArt, type ArtId } from './categoryArtMap';

/**
 * Original flat education illustrations in Edudeen's palette, drawn as inline
 * SVG (no network requests). Each fills a 64x64 rounded square so it reads at
 * 24px (nav icon), 56px (sub-category circle) and 200px (tile). The artwork
 * stays inside a safe area so a circular clip never cuts it off.
 */

const NAVY = '#152D43';
const ROYAL = '#174771';
const MID = '#2b6a8f';
const GREEN = '#66AD36';
const YELLOW = '#F4DC4C';
const PALE = '#EAF2F8';
const CREAM = '#F5F8FA';
const AR_FONT = "'Noto Naskh Arabic','Segoe UI','Arial',sans-serif";

const bg = (fill: string) => <rect width="64" height="64" rx="14" fill={fill} />;
const stroke = { stroke: NAVY, strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** A pencil lying at an angle, tip down-left. */
const Pencil = ({ x, y, r = 40 }: { x: number; y: number; r?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${r})`}>
    <rect x="-4" y="-18" width="8" height="5" rx="1.5" fill={GREEN} {...stroke} strokeWidth={1.5} />
    <rect x="-4" y="-13" width="8" height="21" fill={YELLOW} {...stroke} strokeWidth={1.5} />
    <polygon points="-4,8 4,8 0,16" fill="#F5E6C8" {...stroke} strokeWidth={1.5} />
    <polygon points="-1.6,13 1.6,13 0,16" fill={NAVY} />
  </g>
);

const Crayon = ({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) => (
  <g transform={`translate(${x} ${y}) rotate(${r})`}>
    <polygon points="-5,0 5,0 0,-9" fill={fill} {...stroke} strokeWidth={1.5} />
    <rect x="-5" y="0" width="10" height="26" rx="1.5" fill={fill} {...stroke} strokeWidth={1.5} />
    <rect x="-5" y="8" width="10" height="6" fill="#fff" opacity=".65" />
  </g>
);

const ART: Record<ArtId, ReactNode> = {
  quran: (
    <>
      {bg(PALE)}
      <path d="M20 55 L32 42 L44 55" fill="none" stroke={ROYAL} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 19 Q20 15 32 20 V41 Q20 36 8 40 Z" fill="#fff" {...stroke} />
      <path d="M56 19 Q44 15 32 20 V41 Q44 36 56 40 Z" fill="#fff" {...stroke} />
      <path d="M13 25 Q20 23 27 26 M13 31 Q20 29 27 32 M13 37 Q20 35 27 38" fill="none" stroke={MID} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="44" cy="29" r="7" fill="none" stroke={GREEN} strokeWidth="2" />
      <circle cx="44" cy="29" r="2.6" fill={YELLOW} />
      <path d="M32 9 l2 4 4 .6 -3 3 .8 4.2 -3.8 -2 -3.8 2 .8 -4.2 -3 -3 4 -.6z" fill={YELLOW} {...stroke} strokeWidth={1.4} />
    </>
  ),
  islamic: (
    <>
      {bg('#E8F3DD')}
      <circle cx="27" cy="24" r="13" fill={YELLOW} />
      <circle cx="33" cy="21" r="11.5" fill="#E8F3DD" />
      <path d="M44 14 l2.2 4.6 5 .7 -3.6 3.5 .9 5 -4.5 -2.4 -4.5 2.4 .9 -5 -3.6 -3.5 5 -.7z" fill={YELLOW} {...stroke} strokeWidth={1.4} />
      <rect x="10" y="38" width="44" height="16" rx="3" fill={ROYAL} {...stroke} />
      <rect x="14" y="41" width="36" height="10" rx="1.5" fill="#fff" />
      <circle cx="32" cy="46" r="3.4" fill="none" stroke={GREEN} strokeWidth="2" />
    </>
  ),
  arabic: (
    <>
      {bg(PALE)}
      <text x="32" y="43" textAnchor="middle" fontSize="38" fontWeight="700" fill={NAVY} fontFamily={AR_FONT}>ع</text>
      <path d="M12 51 Q32 58 52 49" fill="none" stroke={YELLOW} strokeWidth="4" strokeLinecap="round" />
      <circle cx="49" cy="14" r="3.4" fill={GREEN} />
      <circle cx="14" cy="16" r="2.4" fill={MID} />
    </>
  ),
  urdu: (
    <>
      {bg('#FFF7D6')}
      <rect x="8" y="16" width="22" height="30" rx="4" fill="#fff" {...stroke} />
      <rect x="34" y="16" width="22" height="30" rx="4" fill={ROYAL} {...stroke} />
      <text x="19" y="40" textAnchor="middle" fontSize="26" fontWeight="700" fill={NAVY} fontFamily={AR_FONT}>ا</text>
      <text x="45" y="40" textAnchor="middle" fontSize="26" fontWeight="700" fill="#fff" fontFamily={AR_FONT}>ب</text>
      <path d="M12 52 H52" stroke={GREEN} strokeWidth="3.5" strokeLinecap="round" />
    </>
  ),
  english: (
    <>
      {bg('#E6F1FB')}
      <rect x="8" y="30" width="22" height="22" rx="3" fill={ROYAL} {...stroke} />
      <rect x="34" y="30" width="22" height="22" rx="3" fill={GREEN} {...stroke} />
      <rect x="21" y="8" width="22" height="22" rx="3" fill={YELLOW} {...stroke} />
      <text x="19" y="47" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff" fontFamily="Arial,sans-serif">A</text>
      <text x="45" y="47" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff" fontFamily="Arial,sans-serif">B</text>
      <text x="32" y="25" textAnchor="middle" fontSize="16" fontWeight="800" fill={NAVY} fontFamily="Arial,sans-serif">C</text>
    </>
  ),
  math: (
    <>
      {bg('#E6F1FB')}
      <polygon points="30,54 58,54 58,22" fill={GREEN} {...stroke} />
      <rect x="9" y="10" width="30" height="44" rx="4" fill={NAVY} />
      <rect x="13" y="14" width="22" height="9" rx="2" fill={PALE} />
      {[0, 1, 2].map(r => [0, 1, 2].map(c => (
        <circle key={`${r}${c}`} cx={17 + c * 7} cy={31 + r * 7.5} r="2.4" fill={r === 2 && c === 2 ? YELLOW : '#fff'} />
      )))}
      <path d="M46 14 v10 M41 19 h10" stroke={YELLOW} strokeWidth="3.4" strokeLinecap="round" />
    </>
  ),
  science: (
    <>
      {bg('#EAF6E2')}
      <path d="M26 10 H38 M28 10 V26 L16 47 Q13 54 20 54 H44 Q51 54 48 47 L36 26 V10" fill="#fff" {...stroke} strokeWidth={2.4} />
      <path d="M21 42 H43 L47 49 Q49 54 44 54 H20 Q15 54 17 49 Z" fill={GREEN} />
      <circle cx="29" cy="36" r="2.4" fill={YELLOW} stroke={NAVY} strokeWidth="1.2" />
      <circle cx="36" cy="30" r="1.8" fill={MID} />
      <ellipse cx="51" cy="15" rx="8" ry="3.2" fill="none" stroke={ROYAL} strokeWidth="1.8" transform="rotate(-30 51 15)" />
      <ellipse cx="51" cy="15" rx="8" ry="3.2" fill="none" stroke={ROYAL} strokeWidth="1.8" transform="rotate(30 51 15)" />
      <circle cx="51" cy="15" r="2.6" fill={YELLOW} />
    </>
  ),
  social: (
    <>
      {bg('#E6F1FB')}
      <circle cx="29" cy="34" r="19" fill={ROYAL} {...stroke} />
      <path d="M17 28 Q22 20 29 24 Q27 30 21 33 Q17 34 17 28Z M33 38 Q40 34 44 40 Q42 48 36 50 Q32 46 33 38Z" fill={GREEN} />
      <ellipse cx="29" cy="34" rx="8" ry="19" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.4" />
      <path d="M10 34 H48" stroke="#fff" strokeOpacity=".5" strokeWidth="1.4" />
      <path d="M47 7 a8 8 0 0 1 8 8 c0 6 -8 14 -8 14 s-8 -8 -8 -14 a8 8 0 0 1 8 -8z" fill={YELLOW} {...stroke} strokeWidth={1.8} />
      <circle cx="47" cy="15" r="3" fill={NAVY} />
    </>
  ),
  early: (
    <>
      {bg('#FFF7D6')}
      <Crayon x={20} y={22} r={-14} fill={GREEN} />
      <Crayon x={32} y={20} r={0} fill={ROYAL} />
      <Crayon x={44} y={22} r={14} fill="#E8A21B" />
      <path d="M32 6 l1.8 3.6 4 .6 -2.9 2.8 .7 4 -3.6 -1.9 -3.6 1.9 .7 -4 -2.9 -2.8 4 -.6z" fill={YELLOW} {...stroke} strokeWidth={1.3} />
      <path d="M12 54 H52" stroke={ROYAL} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  computer: (
    <>
      {bg('#E6F1FB')}
      <rect x="11" y="12" width="42" height="30" rx="4" fill={NAVY} />
      <rect x="15" y="16" width="34" height="22" rx="2" fill={PALE} />
      <path d="M26 22 L20 27 L26 32 M38 22 L44 27 L38 32" fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35 21 L29 33" stroke={ROYAL} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M5 46 H59 L55 52 H9 Z" fill={MID} {...stroke} strokeWidth={1.6} />
      <circle cx="32" cy="49" r="1.3" fill={YELLOW} />
    </>
  ),
  exam: (
    <>
      {bg(CREAM)}
      <rect x="11" y="8" width="32" height="44" rx="3" fill="#fff" {...stroke} />
      {[0, 1, 2].map(i => (
        <g key={i}>
          <path d={`M16 ${19 + i * 11} l3 3 l5 -6`} fill="none" stroke={GREEN} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M29 ${20 + i * 11} H38`} stroke={MID} strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
      <Pencil x={50} y={40} r={30} />
    </>
  ),
  teacher: (
    <>
      {bg(PALE)}
      <path d="M22 42 L17 57 M42 42 L47 57" stroke={ROYAL} strokeWidth="3.4" strokeLinecap="round" />
      <rect x="7" y="10" width="50" height="32" rx="3.5" fill="#fff" {...stroke} strokeWidth={2.4} />
      <path d="M13 33 L20 20 L26 29 L33 17" fill="none" stroke={GREEN} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 22 H51 M38 29 H48 M38 36 H51" stroke={MID} strokeWidth="2" strokeLinecap="round" />
      <rect x="13" y="38" width="10" height="2.6" rx="1.3" fill={YELLOW} />
    </>
  ),
  books: (
    <>
      {bg(PALE)}
      <rect x="9" y="39" width="46" height="12" rx="2.5" fill={ROYAL} {...stroke} />
      <rect x="13" y="27" width="40" height="12" rx="2.5" fill={GREEN} {...stroke} />
      <rect x="7" y="15" width="42" height="12" rx="2.5" fill={YELLOW} {...stroke} />
      <path d="M15 39 V51 M19 27 V39 M13 15 V27" stroke={NAVY} strokeWidth="1.6" />
      <path d="M25 45 H48 M28 33 H46 M22 21 H42" stroke="#fff" strokeOpacity=".75" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  stationery: (
    <>
      {bg('#FFF7D6')}
      <rect x="9" y="10" width="28" height="42" rx="3.5" fill={ROYAL} {...stroke} />
      {[0, 1, 2, 3, 4].map(i => <circle key={i} cx="13.5" cy={17 + i * 8} r="1.7" fill="#fff" />)}
      <rect x="19" y="18" width="13" height="16" rx="1.5" fill="#fff" />
      <path d="M22 24 H29 M22 29 H27" stroke={MID} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="42" y="8" width="12" height="44" rx="2" fill={YELLOW} {...stroke} />
      {[0, 1, 2, 3, 4, 5].map(i => <path key={i} d={`M42 ${15 + i * 6.5} h${i % 2 ? 5 : 8}`} stroke={NAVY} strokeWidth="1.4" />)}
    </>
  ),
  toys: (
    <>
      {bg('#EAF6E2')}
      <path d="M9 15 H27 V12 a4 4 0 0 1 8 0 V15 H38 V33 H9 Z" fill={GREEN} {...stroke} />
      <path d="M26 33 H55 V55 H26 Z" fill={YELLOW} {...stroke} />
      <circle cx="46" cy="33" r="4" fill={YELLOW} {...stroke} strokeWidth={1.8} />
      <circle cx="26" cy="46" r="4" fill="#EAF6E2" {...stroke} strokeWidth={1.8} />
      <rect x="33" y="40" width="14" height="10" rx="2" fill={ROYAL} />
      <text x="40" y="49" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff" fontFamily="Arial,sans-serif">1</text>
    </>
  ),
  handwriting: (
    <>
      {bg(CREAM)}
      <rect x="8" y="9" width="48" height="46" rx="3" fill="#fff" {...stroke} />
      <path d="M12 22 H52 M12 34 H52 M12 46 H52" stroke="#BBD8F2" strokeWidth="1.6" />
      <path d="M12 34 q4 -11 8 0 t8 0 t8 0 t8 0" fill="none" stroke={ROYAL} strokeWidth="2.4" strokeLinecap="round" />
      <Pencil x={46} y={42} r={40} />
    </>
  ),
  creative: (
    <>
      {bg('#FFF7D6')}
      <path d="M32 9 C16 9 7 21 7 32 C7 46 21 55 33 53 C40 52 37 46 42 44 C48 42 57 44 57 32 C57 19 47 9 32 9Z" fill="#fff" {...stroke} strokeWidth={2.2} />
      <circle cx="21" cy="24" r="4.4" fill={GREEN} />
      <circle cx="33" cy="19" r="4.4" fill={YELLOW} stroke={NAVY} strokeWidth="1.2" />
      <circle cx="46" cy="25" r="4.4" fill={ROYAL} />
      <circle cx="19" cy="38" r="4.4" fill={MID} />
      <circle cx="33" cy="43" r="3" fill="#FFF7D6" stroke={NAVY} strokeWidth="1.4" />
    </>
  ),
  courses: (
    <>
      {bg(ROYAL)}
      <rect x="9" y="12" width="46" height="32" rx="4.5" fill={PALE} />
      <circle cx="32" cy="28" r="10" fill={GREEN} />
      <path d="M29 23 L38 28 L29 33 Z" fill="#fff" />
      <rect x="10" y="51" width="44" height="4" rx="2" fill="#fff" fillOpacity=".25" />
      <rect x="10" y="51" width="28" height="4" rx="2" fill={YELLOW} />
      <circle cx="49" cy="18" r="2.4" fill={YELLOW} />
    </>
  ),
  homeschool: (
    <>
      {bg('#E8F3DD')}
      <path d="M8 31 L32 10 L56 31" fill={ROYAL} {...stroke} strokeWidth={2.4} />
      <rect x="14" y="30" width="36" height="24" fill="#fff" {...stroke} />
      <rect x="27" y="40" width="10" height="14" rx="1.5" fill={YELLOW} {...stroke} strokeWidth={1.6} />
      <rect x="18" y="34" width="8" height="8" rx="1" fill={PALE} {...stroke} strokeWidth={1.4} />
      <path d="M40 38 Q44 36 48 38 V46 Q44 44 40 46Z" fill={GREEN} {...stroke} strokeWidth={1.2} />
    </>
  ),
  worksheet: (
    <>
      {bg(PALE)}
      <path d="M15 8 H38 L50 20 V55 H15 Z" fill="#fff" {...stroke} />
      <path d="M38 8 V20 H50" fill={PALE} {...stroke} strokeWidth={1.6} />
      <rect x="20" y="27" width="5" height="5" rx="1" fill="none" stroke={GREEN} strokeWidth="1.8" />
      <path d="M29 30 H44" stroke={MID} strokeWidth="2" strokeLinecap="round" />
      <path d="M20 39 l2 2 l4 -5" fill="none" stroke={GREEN} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M29 39 H44 M20 48 H44" stroke={MID} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  others: (
    <>
      {bg('#FFF7D6')}
      <path d="M32 10 Q34 30 54 32 Q34 34 32 54 Q30 34 10 32 Q30 30 32 10Z" fill={YELLOW} {...stroke} />
      <path d="M49 8 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" fill={GREEN} />
      <circle cx="14" cy="50" r="3.2" fill={ROYAL} />
    </>
  ),
  default: (
    <>
      {bg(PALE)}
      <path d="M18 33 V43 Q32 53 46 43 V33 L32 40Z" fill={ROYAL} {...stroke} />
      <polygon points="32,12 59,25 32,38 5,25" fill={NAVY} {...stroke} />
      <path d="M53 28 V42" stroke={YELLOW} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="53" cy="44" r="3" fill={YELLOW} />
      <circle cx="32" cy="25" r="2" fill={GREEN} />
    </>
  ),
};

interface Props {
  /** Pick the illustration directly... */
  art?: ArtId;
  /** ...or let it be resolved from the category name / slug. */
  name?: string | null;
  /** Parent category name - a sub-category with no keyword match of its own inherits this art. */
  parentName?: string | null;
  className?: string;
  /** When set the illustration is announced to screen readers; otherwise it is decorative. */
  title?: string;
}

export function CategoryArt({ art, name, parentName, className = 'w-full h-full', title }: Props) {
  const id = art ?? resolveCategoryArt(name, parentName);
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {ART[id]}
    </svg>
  );
}

export { resolveCategoryArt, resolveProductArt } from './categoryArtMap';
export type { ArtId } from './categoryArtMap';
