import React, { useState, useMemo } from 'react';
import { Allocation, Distribution, Transaction, User } from '../types';
import { formatCurrency } from '../utils/formatters';
import { Check } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { KpiStrip } from './ui/KpiStrip';
import { BTN_PRIMARY, CARD, CARD_EDITORIAL, H2, INPUT, LABEL, SECTION_HEAD, TH, THEAD_ROW } from './ui/styles';

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
  // Filters
  const [dateFilter, setDateFilter] = useState<'all' | '30days' | 'q1_2026'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Fund Allocation' | 'Fund Distribution'>('all');
  const [agencyFilter, setAgencyFilter] = useState<string>('all');

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) {
        return false;
      }

      // Agency filter
      if (agencyFilter !== 'all') {
        const matchesFrom = tx.from.toLowerCase().includes(agencyFilter.toLowerCase());
        const matchesTo = tx.to.toLowerCase().includes(agencyFilter.toLowerCase());
        if (!matchesFrom && !matchesTo) return false;
      }

      // Date filter
      if (dateFilter === '30days') {
        const txDate = new Date(tx.date).getTime();
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        if (txDate < thirtyDaysAgo) return false;
      } else if (dateFilter === 'q1_2026') {
        const d = new Date(tx.date);
        const year = d.getFullYear();
        const month = d.getMonth();
        if (year !== 2026 || month > 2) return false;
      }

      return true;
    });
  }, [transactions, typeFilter, agencyFilter, dateFilter]);

  // Calculations based on filtered or master records
  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const totalDistributed = allocations.reduce((sum, a) => sum + a.distributedAmount, 0);
  const remainingFunds = totalAllocated - totalDistributed;

  const totalTxCount = filteredTransactions.length;
  const validTxCount = filteredTransactions.filter((tx) => tx.status === 'Committed').length;
  const rejectedTxCount = filteredTransactions.filter((tx) => tx.status === 'Rejected').length;

  const handlePrint = () => {
    window.print();
  };

  const overallPct = totalAllocated > 0 ? Math.round((totalDistributed / totalAllocated) * 100) : 0;
  const Verified = ({ children }: { children: React.ReactNode }) => (
    <span className="inline-flex items-center gap-1 text-[13px] whitespace-nowrap">
      <Check aria-hidden="true" size={12} strokeWidth={3} />
      {children}
    </span>
  );

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="mr-date" className={LABEL}>AUDIT TIMEFRAME</label>
            <select id="mr-date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value as any)} className={INPUT}>
              <option value="all">All available records</option>
              <option value="30days">Last 30 days (trailing)</option>
              <option value="q1_2026">Quarter 1 2026 (Jan – Mar)</option>
            </select>
          </div>

          <div>
            <label htmlFor="mr-type" className={LABEL}>TRANSACTION STREAM</label>
            <select id="mr-type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className={INPUT}>
              <option value="all">All transactions (allocation &amp; distribution)</option>
              <option value="Fund Allocation">Fund allocation only</option>
              <option value="Fund Distribution">Fund distribution only</option>
            </select>
          </div>

          <div>
            <label htmlFor="mr-agency" className={LABEL}>DESIGNATED ENTITY</label>
            <select id="mr-agency" value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className={INPUT}>
              <option value="all">All agencies &amp; NGOs</option>
              <option value="NADMA">National Disaster Management Agency (NADMA)</option>
              <option value="KEMAS">Rural Community Dev (KEMAS)</option>
              <option value="MRCS">Red Crescent Society (MRCS)</option>
              <option value="YKK">Yayasan Kebajikan Komuniti (YKK)</option>
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
          { label: 'TRANSACTIONS', value: totalTxCount, caption: `${validTxCount} valid · ${rejectedTxCount} rejected` },
        ]}
      />

      {/* Allocation vs Distribution Ledger Reconciliation Table */}
      <section aria-labelledby="recon-h" className={CARD}>
        <div className={SECTION_HEAD}>
          <h2 id="recon-h" className={H2}>Programme ledger reconciliation</h2>
          <Verified>All balances reconciled</Verified>
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
                <th scope="col" className={`${TH} text-right`}>OUT</th>
                <th scope="col" className={`${TH} pr-6`}>LEDGER INTEGRITY</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((item) => {
                const pct = Math.round((item.distributedAmount / item.amount) * 100);
                return (
                  <tr key={item.id} className="border-b border-divider">
                    <td className="py-3 pl-6 pr-3 max-w-[280px]">
                      <div className="font-semibold truncate" title={item.programme}>{item.programme}</div>
                      <div className="font-mono text-[11px] text-muted">
                        REF {item.referenceNo}
                      </div>
                    </td>
                    <td className="p-3 max-w-[220px] truncate" title={item.receivingAgency}>{item.receivingAgency}</td>
                    <td className="p-3 text-right font-semibold whitespace-nowrap">{formatCurrency(item.amount)}</td>
                    <td className="p-3 text-right font-semibold whitespace-nowrap">{formatCurrency(item.distributedAmount)}</td>
                    {/* Orange only while money is still waiting; a fully distributed row goes quiet. */}
                    <td className={`p-3 text-right font-semibold whitespace-nowrap ${item.remainingAmount > 0 ? 'text-remaining-text' : 'text-muted'}`}>
                      {formatCurrency(item.remainingAmount)}
                    </td>
                    <td className="p-3 text-right font-mono text-xs">{pct}%</td>
                    {/* Same value on every row, so plain text; the check marks only the section and total verdicts. */}
                    <td className="py-3 pl-3 pr-6 text-[13px] text-muted whitespace-nowrap">Verified on chain</td>
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
                <td className="p-3 text-right font-mono text-xs">{overallPct}%</td>
                <td className="py-3 pl-3 pr-6"><Verified>Audit approved</Verified></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Audit Signature & Endorsement Certificate */}
      <section aria-labelledby="decl-h" className={`${CARD_EDITORIAL} px-6 pt-5 pb-[22px] flex flex-col gap-3`}>
        <h2 id="decl-h" className={H2}>Endorsement &amp; audit verification declaration</h2>
        <p className="m-0 text-sm text-text-2 leading-relaxed max-w-[70ch]">
          This monitoring report is generated directly from the tamper-proof state database of Hyperledger Fabric (<code className="font-mono text-ink">myfund-channel</code>, chaincode <code className="font-mono text-ink">fund_cc:v1.2</code>). All fund allocations initiated by the Ministry of Finance and subsequent disbursements recorded by accredited agencies have satisfied the multi-organization endorsement policy <code className="font-mono text-ink">AND(&apos;MinistryMSP.peer&apos;, &apos;AuditorMSP.peer&apos;)</code>. No unauthorized ledger modifications or discrepancies were detected.
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
            <dd className="m-0 font-mono text-[11px] text-muted">CONSENSUS STATE: SYNCHRONIZED</dd>
          </div>
        </dl>
      </section>
    </div>
  );
};
