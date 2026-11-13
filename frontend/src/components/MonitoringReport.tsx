import React, { useEffect, useMemo, useState } from 'react';
import { Allocation, DiscrepancyType, Distribution, Transaction, User, VerificationResult } from '../types';
import { formatCurrency, formatDate, formatDay } from '../utils/formatters';
import { issuesByAllocation, positionAsAt, quarterEnds } from '../utils/ledger';
import { AVAILABLE_AGENCIES } from '../data/agencies';
import { api } from '../services/api';
import { AlertCircle, Check } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { KpiStrip } from './ui/KpiStrip';
import { DataTable } from './ui/DataTable';
import { Pagination, usePage } from './ui/Pagination';
import {
  BTN_PRIMARY, BTN_SECONDARY, CARD, CARD_EDITORIAL, H2, INPUT, LABEL, NOTICE_ERROR, SECTION_HEAD, TH, THEAD_ROW,
} from './ui/styles';

const FINDING: Record<DiscrepancyType, string> = {
  VALUE_MISMATCH: 'Value differs',
  MISSING_FROM_COPY: 'Missing from database',
  NOT_ON_CHAIN: 'Not on the ledger',
};

const plural = (n: number) => (n === 1 ? 'discrepancy' : 'discrepancies');
const PAGE = 10;
// The printed report lists every row, so off-page rows are hidden on screen rather than sliced out.
const onPage = (p: { start: number; end: number }) => (i: number) => (i >= p.start && i < p.end ? '' : 'hidden print:table-row');

interface MonitoringReportProps {
  currentUser: User;
  allocations: Allocation[];
  distributions: Distribution[];
  transactions: Transaction[];
  onViewTransaction: (tx: Transaction) => void;
}

export const MonitoringReport: React.FC<MonitoringReportProps> = ({
  currentUser,
  allocations,
  distributions,
  transactions,
  onViewTransaction,
}) => {
  // Filters: agency + "position as at" the end of a quarter drive the whole report; type narrows only the transactions list.
  const [agencyFilter, setAgencyFilter] = useState<string>('all');
  const [period, setPeriod] = useState<string>('latest');
  const [typeFilter, setTypeFilter] = useState<'all' | Transaction['type']>('all');

  // Ledger vs database copy check (GET /api/verification); reports only, repairs nothing.
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const runVerification = async () => {
    setVerifying(true);
    setVerifyError('');
    try {
      setVerification(await api.getVerification());
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };
  // Every visit to Reports re-checks, so no status on this page is older than the visit.
  useEffect(() => {
    runVerification();
  }, []);
  const found = verification?.discrepancies.length ?? 0;
  const issues = verification ? issuesByAllocation(verification.discrepancies, distributions) : null;
  const ledgerRecord = allocations[0]?.blockchainRecord;
  const latestBlock = transactions.reduce((max, tx) => Math.max(max, tx.blockchainRecord.blockNumber), 0);

  const quarters = useMemo(
    () => quarterEnds([...allocations.map((a) => a.allocatedDate), ...distributions.map((d) => d.distributedDate)]),
    [allocations, distributions],
  );
  const quarter = quarters.find((q) => q.label === period); // undefined = latest

  // Programme position as at the period end, for the chosen agency.
  const rows = useMemo(
    () => positionAsAt(allocations, distributions, quarter?.end)
      .filter((r) => agencyFilter === 'all' || r.allocation.receivingAgency === agencyFilter),
    [allocations, distributions, quarter, agencyFilter],
  );
  const totalAllocated = rows.reduce((sum, r) => sum + r.allocation.amount, 0);
  const totalDistributed = rows.reduce((sum, r) => sum + r.distributed, 0);
  const remainingFunds = totalAllocated - totalDistributed;
  const overallPct = totalAllocated > 0 ? Math.round((totalDistributed / totalAllocated) * 100) : 0;

  // Transactions inside the chosen quarter (everything for "latest"), by agency and type.
  const periodTransactions = useMemo(() => transactions.filter((tx) => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (agencyFilter !== 'all' && tx.from !== agencyFilter && tx.to !== agencyFilter) return false;
    if (quarter) {
      const t = new Date(tx.date).getTime();
      if (t < quarter.start || t > quarter.end) return false;
    }
    return true;
  }), [transactions, typeFilter, agencyFilter, quarter]);
  const validTxCount = periodTransactions.filter((tx) => tx.status === 'Committed').length;
  const rejectedTxCount = periodTransactions.filter((tx) => tx.status === 'Rejected').length;

  const resetKey = `${agencyFilter}|${period}|${typeFilter}`;
  const rowsPage = usePage(rows.length, PAGE, resetKey);
  const txPage = usePage(periodTransactions.length, PAGE, resetKey);
  const discPage = usePage(found, PAGE, verification?.checkedAt);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Fund monitoring & integrity audit report"
        actions={
          <button type="button" onClick={handlePrint} className={BTN_PRIMARY}>
            Print official report
          </button>
        }
      />

      {/* Filter Controls (Hidden when printing) */}
      <section aria-label="Report filters" className={`${CARD} px-6 py-5 print:hidden`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="mr-agency" className={LABEL}>AGENCY</label>
            <select id="mr-agency" value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className={INPUT}>
              <option value="all">All agencies</option>
              {AVAILABLE_AGENCIES.map((agency) => (
                <option key={agency} value={agency}>{agency}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="mr-period" className={LABEL}>POSITION AS AT</label>
            <select id="mr-period" value={period} onChange={(e) => setPeriod(e.target.value)} className={INPUT}>
              <option value="latest">Latest (all records)</option>
              {quarters.map((q) => (
                <option key={q.label} value={q.label}>End of {q.label} ({formatDay(q.end)})</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Audit Metrics Summary */}
      <KpiStrip
        items={[
          { label: 'TOTAL ALLOCATED', value: formatCurrency(totalAllocated) },
          { label: 'DISTRIBUTED', swatch: 'distributed', value: formatCurrency(totalDistributed) },
          { label: 'REMAINING', swatch: 'remaining', value: formatCurrency(remainingFunds) },
          { label: 'TRANSACTIONS', value: periodTransactions.length, caption: `${validTxCount} valid · ${rejectedTxCount} rejected` },
        ]}
      />

      {/* Allocation vs Distribution Ledger Reconciliation Table */}
      <section aria-labelledby="recon-h" className={CARD}>
        <div className={SECTION_HEAD}>
          <h2 id="recon-h" className={H2}>
            {quarter ? `Programme position as at ${formatDay(quarter.end)}` : 'Programme position, latest'}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] border-collapse">
            <thead>
              <tr className={THEAD_ROW}>
                <th scope="col" className={`${TH} pl-6`}>PROGRAMME &amp; REFERENCE</th>
                <th scope="col" className={TH}>RECIPIENT AGENCY / NGO</th>
                <th scope="col" className={`${TH} text-right`}>ALLOCATED</th>
                <th scope="col" className={`${TH} text-right`}>DISBURSED</th>
                <th scope="col" className={`${TH} text-right`}>REMAINING</th>
                <th scope="col" className={`${TH} text-right ${found ? '' : 'pr-6'}`}>OUT</th>
                {/* Only worth a column when there is a difference to point at; the verdict itself is in the verification card. */}
                {found > 0 && <th scope="col" className={`${TH} pr-6`}>LEDGER INTEGRITY</th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={found ? 7 : 6} className="px-6 py-8 text-center text-muted">No allocations match these filters.</td>
                </tr>
              )}
              {rows.map(({ allocation: item, distributed, remaining }, i) => {
                const pct = item.amount > 0 ? Math.round((distributed / item.amount) * 100) : 0;
                const n = issues?.get(item.id) ?? 0;
                return (
                  <tr key={item.id} className={`border-b border-divider ${onPage(rowsPage)(i)}`}>
                    <td className="py-3 pl-6 pr-3 max-w-[280px]">
                      <div className="font-semibold truncate" title={item.programme}>{item.programme}</div>
                      <div className="font-mono text-[11px] text-muted">
                        REF {item.referenceNo}
                      </div>
                    </td>
                    <td className="p-3 max-w-[220px] truncate" title={item.receivingAgency}>{item.receivingAgency}</td>
                    <td className="p-3 text-right font-semibold whitespace-nowrap">{formatCurrency(item.amount)}</td>
                    <td className="p-3 text-right font-semibold whitespace-nowrap">{formatCurrency(distributed)}</td>
                    {/* Orange only while money is still waiting; a fully distributed row goes quiet. */}
                    <td className={`p-3 text-right font-semibold whitespace-nowrap ${remaining > 0 ? 'text-remaining-text' : 'text-muted'}`}>
                      {formatCurrency(remaining)}
                    </td>
                    <td className={`p-3 text-right font-mono text-xs ${found ? '' : 'pr-6'}`}>{pct}%</td>
                    {found > 0 && (
                      <td className={`py-3 pl-3 pr-6 text-[13px] whitespace-nowrap ${n ? 'font-semibold text-remaining-text' : 'text-muted'}`}>
                        {n ? `${n} ${n === 1 ? 'difference' : 'differences'}` : 'Matches'}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-[1.5px] border-ink font-semibold">
                <td colSpan={2} className="py-3 pl-6 pr-3 font-mono text-[11px] font-normal text-muted">TOTAL CONSOLIDATED SUM</td>
                <td className="p-3 text-right whitespace-nowrap">{formatCurrency(totalAllocated)}</td>
                <td className="p-3 text-right whitespace-nowrap">{formatCurrency(totalDistributed)}</td>
                <td className="p-3 text-right text-remaining-text whitespace-nowrap">{formatCurrency(remainingFunds)}</td>
                <td className={`p-3 text-right font-mono text-xs ${found ? '' : 'pr-6'}`}>{overallPct}%</td>
                {found > 0 && <td className="py-3 pl-3 pr-6" />}
              </tr>
            </tfoot>
          </table>
        </div>
        <Pagination {...rowsPage} label="Programme" />
      </section>

      {/* Transactions inside the chosen period; the Type select narrows only this list. */}
      <section aria-labelledby="period-tx-h" className={CARD}>
        <div className={SECTION_HEAD}>
          <h2 id="period-tx-h" className={H2}>Transactions in this period</h2>
          <div className="w-full sm:w-72 print:hidden">
            <label htmlFor="mr-type" className={LABEL}>TYPE</label>
            <select id="mr-type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className={INPUT}>
              <option value="all">All transactions</option>
              <option value="Fund Allocation">Fund allocation only</option>
              <option value="Fund Distribution">Fund distribution only</option>
            </select>
          </div>
        </div>
        <DataTable
          full
          transactions={periodTransactions}
          onView={onViewTransaction}
          rowClassName={onPage(txPage)}
          emptyMessage="No transactions in this period."
        />
        <Pagination {...txPage} label="Transaction" />
      </section>

      {/* Ledger vs database verification */}
      <section aria-labelledby="verify-h" className={CARD}>
        <div className={SECTION_HEAD}>
          <div className="flex flex-col gap-1.5">
            <h2 id="verify-h" className={H2}>Ledger vs database verification</h2>
            <p className="m-0 text-[13px] text-text-2 max-w-[70ch]">
              Compares every record on the Hyperledger Fabric ledger with the copy kept in the application database,
              field by field. The ledger is the source of truth: this check reports differences and changes nothing.
            </p>
          </div>
          <button type="button" onClick={runVerification} disabled={verifying} className={`${BTN_SECONDARY} print:hidden`}>
            {verifying ? 'Verifying…' : verification ? 'Run again' : 'Run verification'}
          </button>
        </div>

        <div aria-live="polite" className="px-6 pb-5 flex flex-col gap-3">
          {verifyError && (
            <div role="alert" className={NOTICE_ERROR}>
              <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{verifyError}</span>
            </div>
          )}
          {!verification && !verifyError && (
            <p className="m-0 text-[13px] text-muted">{verifying ? 'Checking every record against the database copy…' : 'Not run yet.'}</p>
          )}
          {verification && found === 0 && (
            <p className="m-0 inline-flex items-center gap-1.5 text-[13px]">
              <Check aria-hidden="true" size={12} strokeWidth={3} />
              All {verification.recordsChecked} records match the ledger. Checked {formatDate(verification.checkedAt)}.
            </p>
          )}
          {verification && found > 0 && (
            <div className={NOTICE_ERROR}>
              <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {found} {plural(found)} across {verification.recordsChecked} records, checked {formatDate(verification.checkedAt)}.
                Figures in this report come from the ledger, not the database.
              </span>
            </div>
          )}
        </div>

        {verification && found > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse">
                <thead>
                  <tr className={THEAD_ROW}>
                    <th scope="col" className={`${TH} pl-6`}>RECORD</th>
                    <th scope="col" className={TH}>FINDING</th>
                    <th scope="col" className={TH}>FIELD</th>
                    <th scope="col" className={TH}>ON LEDGER</th>
                    <th scope="col" className={`${TH} pr-6`}>IN DATABASE</th>
                  </tr>
                </thead>
                <tbody>
                  {verification.discrepancies.map((d, i) => (
                    <tr key={`${d.recordId}-${d.field ?? d.type}-${i}`} className={`border-b border-divider ${onPage(discPage)(i)}`}>
                      <td className="py-3 pl-6 pr-3 font-mono text-xs whitespace-nowrap">{d.recordId}</td>
                      <td className="p-3 font-semibold">{FINDING[d.type]}</td>
                      <td className="p-3 font-mono text-xs">{d.field ?? '—'}</td>
                      <td className="p-3 font-mono text-xs break-all">{d.chainValue ?? '—'}</td>
                      <td className="py-3 pl-3 pr-6 font-mono text-xs break-all text-remaining-text">{d.copyValue ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...discPage} label="Discrepancy" />
          </>
        )}
      </section>

      {/* Audit Signature & Endorsement Certificate */}
      <section aria-labelledby="decl-h" className={`${CARD_EDITORIAL} px-6 pt-5 pb-[22px] flex flex-col gap-3`}>
        <h2 id="decl-h" className={H2}>Endorsement &amp; audit verification declaration</h2>
        <p className="m-0 text-sm text-text-2 leading-relaxed max-w-[70ch]">
          This monitoring report is generated from the Hyperledger Fabric ledger (<code className="font-mono text-ink">{ledgerRecord?.channel ?? 'myfund-channel'}</code>, chaincode <code className="font-mono text-ink">{ledgerRecord?.chaincode ?? 'fund_cc'}</code>). Allocations by the Ministry of Finance are endorsed under <code className="font-mono text-ink">AND(&apos;MinistryMSP.peer&apos;, &apos;AuditorMSP.peer&apos;)</code> and agency disbursements under <code className="font-mono text-ink">AND(&apos;AgencyMSP.peer&apos;, &apos;AuditorMSP.peer&apos;)</code>.{' '}
          {!verification
            ? verifying
              ? 'Verification against the database copy is running.'
              : 'Run the ledger verification above to confirm the database copy matches the ledger.'
            : found === 0
              ? `Verification on ${formatDate(verification.checkedAt)} found no discrepancies between the ledger and the database copy.`
              : `Verification on ${formatDate(verification.checkedAt)} found ${found} ${plural(found)} between the ledger and the database copy; the ledger figures in this report stand.`}
        </p>
        <dl className="m-0 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border">
          <div>
            <dt className="font-mono text-[11px] text-muted">AUDITOR OFFICER</dt>
            <dd className="m-0 font-semibold">{currentUser.name}</dd>
            <dd className="m-0 text-xs text-muted">{currentUser.designation}</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] text-muted">AUDIT AUTHORITY</dt>
            <dd className="m-0 font-semibold">National Audit Department</dd>
            <dd className="m-0 text-xs text-muted">Federal Audit Office</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] text-muted">REPORT GENERATION DATE</dt>
            <dd className="m-0 font-mono text-xs font-medium">
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
            </dd>
            <dd className="m-0 font-mono text-[11px] text-muted">LATEST LEDGER BLOCK #{latestBlock}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
};
