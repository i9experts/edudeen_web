import type { ReactNode } from 'react';
import { UploadCloud } from 'lucide-react';
import { Input } from '@/components/comman/ui';

/** The platform's bank / wallet details (any of the three bank-transfer APIs return this shape). */
export interface BankDetailsLike {
  payeeName?: string | null;
  bankName: string | null;
  accountTitle: string | null;
  accountNumber: string | null;
  iban: string | null;
  jazzcashNumber: string | null;
  easypaisaNumber: string | null;
  instructions: string | null;
}

/**
 * Amount to transfer + the Edudeen account to pay into. Shared by the checkout bank-transfer step and
 * the Edudeen Premium purchase so both always show the same details the same way.
 */
export function BankDetailsCard({ bankDetails, amountText, note }: { bankDetails: BankDetailsLike; amountText: string; note?: ReactNode }) {
  const rows: [string, string | null | undefined][] = [
    ['Pay to', bankDetails.payeeName],
    ['Bank', bankDetails.bankName],
    ['Account Title', bankDetails.accountTitle],
    ['Account Number', bankDetails.accountNumber],
    ['IBAN', bankDetails.iban],
    ['JazzCash', bankDetails.jazzcashNumber],
    ['Easypaisa', bankDetails.easypaisaNumber],
  ];
  return (
    <div className="rounded-[10px] border border-bone bg-cream px-4 py-3 flex flex-col gap-2">
      <div className="flex justify-between items-baseline">
        <span className="text-[12px] text-slate">Amount to transfer</span>
        <span className="text-[18px] font-bold text-brand-deep-orange">{amountText}</span>
      </div>
      {note}
      <div className="h-px bg-bone my-1" />
      {rows.filter(([, v]) => v).map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 text-[12px]">
          <span className="text-slate flex-shrink-0">{label}</span>
          <span className="font-medium text-carbon text-end font-mono">{value}</span>
        </div>
      ))}
      {bankDetails.instructions && <p className="text-[11px] text-slate mt-1">{bankDetails.instructions}</p>}
    </div>
  );
}

/** Receipt image picker + optional reference / sender name, shared by checkout and Premium purchases. */
export function ProofFields({
  file, onFile, transactionReference, onTransactionReference, senderName, onSenderName,
}: {
  file: File | null; onFile: (f: File | null) => void;
  transactionReference: string; onTransactionReference: (v: string) => void;
  senderName: string; onSenderName: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="block text-[12px] font-medium text-charcoal mb-1.5">Payment proof (screenshot or receipt photo)</label>
        <label className="flex items-center gap-2 border border-dashed border-bone rounded-[8px] px-3 py-3 cursor-pointer hover:border-brand-orange/50 transition-colors">
          <UploadCloud size={16} className="text-slate flex-shrink-0" />
          <span className="text-[12px] text-slate truncate">{file ? file.name : 'Choose an image…'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      <Input label="Transaction reference (optional)" value={transactionReference} onChange={(e) => onTransactionReference(e.target.value)} placeholder="TXN123456789" />
      <Input label="Sender name (optional, if different from your account)" value={senderName} onChange={(e) => onSenderName(e.target.value)} />
    </div>
  );
}
