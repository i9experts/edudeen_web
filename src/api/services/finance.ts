import client from '../client';
import { ENDPOINTS } from '../endpoints';

// ── Types ─────────────────────────────────────────────────────────────────────

// One entry per currency the seller actually holds a balance in — a seller
// can simultaneously have a PKR wallet (bank-transfer/COD sales) and a USD
// wallet (Stripe sales). These are NEVER summed into one number; the UI
// must show them separately (see StoreFinance's wallet selector).
export interface FinanceWallet {
  currency:         string;
  availableBalance: number;
  pendingBalance:   number;
  isFlaggedForReview: boolean;
  flaggedReason:    string | null;
  nextPayout: {
    pendingAmount: number | null;
    scheduledAt:   string | null;
    method: { type: string; bankName: string | null; last4: string | null } | null;
  };
  summary: {
    thisMonthRevenue:     number;
    revenueGrowthPercent: number;
    platformFees:         number;
    totalPaidOut:         number;
    pendingTax:           number;
  };
  payoutSchedule: {
    frequency:     string;
    isEnabled:     boolean;
    minimumAmount: number;
    nextPayoutAt:  string | null;
  };
}

export interface FinanceDashboard {
  wallets: FinanceWallet[];
  feeBreakdown: {
    marketplaceListingFee: string;
    transactionFee:        string;
    transactionFeeSource?:  string;
    paymentProcessing:     string;
    digitalDelivery:       string;
    aiCredits:              string;
  };
}

export type TransactionType   = 'sale' | 'payout' | 'fee' | 'refund' | 'adjustment';
export type TransactionStatus = 'completed' | 'pending' | 'failed';

export interface Transaction {
  _id:            string;
  storeId:        string;
  sellerId:       string;
  type:           TransactionType;
  amount:         number;
  currency:       string;
  balanceBefore:  number;
  balanceAfter:   number;
  description:    string;
  referenceId:    string | null;
  referenceType:  string | null;
  status:         TransactionStatus;
  metadata:       Record<string, any> | null;
  createdAt:      string;
}

export interface TransactionsQuery {
  page?: number; limit?: number; type?: TransactionType; status?: TransactionStatus;
  from?: string; to?: string; currency?: string;
}

export interface FinanceAnalytics {
  monthly: Array<{ month: string; revenue: number; fees: number; refunds: number; net: number }>;
  totals: { totalRevenue: number; totalFees: number; totalRefunds: number; totalPayouts: number; netRevenue: number };
  currentMonth: { sale: number; fee: number; refund: number; payout: number };
}

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Payout {
  _id:            string;
  storeId:        string;
  sellerId:       string;
  amount:         number;
  currency:       string;
  payoutMethodId: string;
  payoutMethodSnapshot: { type: string; bankName: string | null; accountLast4: string } | null;
  status:         PayoutStatus;
  scheduledAt:    string | null;
  processedAt:    string | null;
  failureReason:  string | null;
  notes:          string | null;
  createdAt:      string;
}

export type PayoutMethodType = 'bank_transfer' | 'paypal' | 'stripe';

export interface PayoutMethod {
  _id:               string;
  storeId:           string;
  type:              PayoutMethodType;
  /** Which wallet/currency this method pays out — a payout can only ever be
   *  requested against the wallet matching this exact currency. */
  currency:          string;
  isDefault:         boolean;
  bankName:          string | null;
  accountHolder:     string | null;
  accountLast4:      string | null;
  routingNumber:     string | null;
  externalAccountId: string | null;
  status:            'active' | 'inactive' | 'pending_verification';
  createdAt:         string;
}

export interface AddPayoutMethodPayload {
  type:               PayoutMethodType;
  /** Which wallet this method pays out — defaults sensibly server-side if
   *  omitted, but should be set explicitly whenever the seller is adding a
   *  method for a specific wallet (see StoreFinance's wallet selector). */
  currency?:          string;
  bankName?:          string;
  accountHolder?:     string;
  accountNumber?:     string;
  routingNumber?:     string;
  externalAccountId?: string;
  setAsDefault?:      boolean;
}

export interface PayoutSchedule {
  _id:                    string;
  storeId:                string;
  currency:               string;
  frequency:              'daily' | 'weekly' | 'biweekly' | 'monthly' | 'manual';
  dayOfWeek:              number;
  dayOfMonth:             number;
  minimumAmount:          number;
  isEnabled:              boolean;
  nextPayoutAt:           string | null;
  defaultPayoutMethodId:  string | null;
}

export interface UpdatePayoutSchedulePayload {
  currency?:              string;
  frequency?:             'daily' | 'weekly' | 'biweekly' | 'monthly' | 'manual';
  dayOfWeek?:             number;
  dayOfMonth?:            number;
  minimumAmount?:         number;
  isEnabled?:             boolean;
  defaultPayoutMethodId?: string;
}

export interface TaxReport {
  _id:              string;
  storeId:          string;
  currency:         string;
  period:           'q1' | 'q2' | 'q3' | 'q4' | 'annual';
  year:             number;
  fromDate:         string;
  toDate:           string;
  totalRevenue:     number;
  totalFees:        number;
  totalRefunds:     number;
  totalPayouts:     number;
  netRevenue:       number;
  estimatedTax:     number;
  transactionCount: number;
  pdfUrl:           string | null;
  generatedAt:      string | null;
}

interface Paginated { total: number; page: number; limit: number; pages: number }

function qs(params: Record<string, any>) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function apiGetFinanceDashboard(storeId: string) {
  return client.get<never, FinanceDashboard>(ENDPOINTS.FINANCE.SELLER.DASHBOARD(storeId));
}

// ── Transactions ──────────────────────────────────────────────────────────────
export function apiGetFinanceTransactions(storeId: string, query: TransactionsQuery = {}) {
  return client.get<never, Paginated & { transactions: Transaction[] }>(
    `${ENDPOINTS.FINANCE.SELLER.TRANSACTIONS(storeId)}${qs(query)}`,
  );
}

export function apiExportFinanceTransactions(storeId: string, query: TransactionsQuery = {}) {
  return client.get<never, string>(`${ENDPOINTS.FINANCE.SELLER.TRANSACTIONS_EXPORT(storeId)}${qs(query)}`, {
    responseType: 'text',
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export function apiGetFinanceAnalytics(storeId: string, months = 6) {
  return client.get<never, FinanceAnalytics>(`${ENDPOINTS.FINANCE.SELLER.ANALYTICS(storeId)}${qs({ months })}`);
}

// ── Payouts ───────────────────────────────────────────────────────────────────
export function apiRequestPayout(storeId: string, amount: number, payoutMethodId: string, notes?: string) {
  return client.post<never, Payout>(ENDPOINTS.FINANCE.SELLER.REQUEST_PAYOUT(storeId), { amount, payoutMethodId, notes });
}

export function apiGetPayouts(storeId: string, query: { page?: number; limit?: number; status?: PayoutStatus; currency?: string } = {}) {
  return client.get<never, Paginated & { payouts: Payout[] }>(`${ENDPOINTS.FINANCE.SELLER.PAYOUTS(storeId)}${qs(query)}`);
}

export function apiGetPayoutById(storeId: string, payoutId: string) {
  return client.get<never, Payout>(ENDPOINTS.FINANCE.SELLER.PAYOUT_BY_ID(storeId, payoutId));
}

// ── Payout methods ────────────────────────────────────────────────────────────
export function apiAddPayoutMethod(storeId: string, payload: AddPayoutMethodPayload) {
  return client.post<never, PayoutMethod>(ENDPOINTS.FINANCE.SELLER.ADD_PAYOUT_METHOD(storeId), payload);
}

export function apiGetPayoutMethods(storeId: string) {
  return client.get<never, PayoutMethod[]>(ENDPOINTS.FINANCE.SELLER.PAYOUT_METHODS(storeId));
}

export function apiSetDefaultPayoutMethod(storeId: string, methodId: string) {
  return client.patch<never, { isDefault: boolean }>(ENDPOINTS.FINANCE.SELLER.SET_DEFAULT_METHOD(storeId, methodId));
}

export function apiUpdatePayoutMethod(storeId: string, methodId: string, payload: AddPayoutMethodPayload) {
  return client.patch<never, PayoutMethod>(ENDPOINTS.FINANCE.SELLER.UPDATE_PAYOUT_METHOD(storeId, methodId), payload);
}

export function apiDeletePayoutMethod(storeId: string, methodId: string) {
  return client.delete<never, { deleted: boolean }>(ENDPOINTS.FINANCE.SELLER.DELETE_PAYOUT_METHOD(storeId, methodId));
}

// ── Payout schedule ───────────────────────────────────────────────────────────
// Each currency wallet has its own independent payout schedule (see backend
// PayoutSchedule.currency's unique index on {storeId, currency}) — defaults
// to 'USD' server-side if omitted, so every call site showing a specific
// wallet must pass that wallet's own currency explicitly.
export function apiGetPayoutSchedule(storeId: string, currency?: string) {
  return client.get<never, PayoutSchedule>(`${ENDPOINTS.FINANCE.SELLER.PAYOUT_SCHEDULE(storeId)}${qs({ currency })}`);
}

export function apiUpdatePayoutSchedule(storeId: string, payload: UpdatePayoutSchedulePayload) {
  return client.patch<never, PayoutSchedule>(ENDPOINTS.FINANCE.SELLER.PAYOUT_SCHEDULE(storeId), payload);
}

// ── Tax reports ───────────────────────────────────────────────────────────────
export function apiGetTaxReports(storeId: string) {
  return client.get<never, TaxReport[]>(ENDPOINTS.FINANCE.SELLER.TAX_REPORTS(storeId));
}

// ── Monthly statement (Earnings) ────────────────────────────────────────────
export interface MonthlyStatementTransaction {
  id:          string;
  type:        TransactionType | string;
  amount:      number;
  description: string;
  referenceId: string | null;
  createdAt:   string;
  status:      TransactionStatus | string;
}

export interface MonthlyStatement {
  /** YYYY-MM */
  month:             string;
  currency:          string;
  /** Platform commission rate, as a percentage (e.g. 10 = 10%) or a fraction (0.1) — see formatCommissionRate. */
  commissionRate:    number;
  orderCount:        number;
  grossSales:        number;
  commission:        number;
  processingFees:    number;
  refunds:           number;
  /** Commission owed on cash-on-delivery orders (seller kept the cash) — deducted from the next payout. */
  codCommissionOwed: number;
  netEarnings:       number;
  /** Can be negative when COD commission owed exceeds cleared earnings. */
  availableBalance:  number;
  pendingBalance:    number;
  nextPayoutDate:    string | null;
  payoutFrequency:   string | null;
  payout: {
    id:          string;
    status:      PayoutStatus | string;
    amount:      number;
    createdAt:   string;
    processedAt: string | null;
  } | null;
  transactions: MonthlyStatementTransaction[];
}

// Same unwrap convention as every other seller finance call above: the
// backend returns the statement object directly and the interceptor hands
// back that body. `month` defaults to the current UTC month server-side,
// `currency` to the store's baseCurrency. Defensive: also tolerates a
// `{ success, data }` envelope so a future shape change can't break the page.
export async function apiGetMonthlyStatement(storeId: string, month: string, currency?: string) {
  const res = await client.get<never, MonthlyStatement | { success?: boolean; data: MonthlyStatement }>(
    `${ENDPOINTS.FINANCE.SELLER.MONTHLY_STATEMENT(storeId)}${qs({ month, currency })}`,
  );
  if (res && typeof res === 'object' && 'data' in res && res.data && typeof res.data === 'object' && 'grossSales' in res.data) {
    return res.data;
  }
  return res as MonthlyStatement;
}

export function apiGenerateTaxReport(storeId: string, year: number, period: 'q1' | 'q2' | 'q3' | 'q4' | 'annual', currency?: string) {
  return client.post<never, TaxReport>(`${ENDPOINTS.FINANCE.SELLER.GENERATE_TAX_REPORT(storeId)}${qs({ year, period, currency })}`);
}
