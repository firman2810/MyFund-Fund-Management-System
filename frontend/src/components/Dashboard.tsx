import React from 'react';
import { User, Allocation, Transaction, UserRole } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { ledgerEvents } from '../utils/ledger';
import { KpiStrip } from './ui/KpiStrip';
import { StepChart } from './ui/StepChart';
import { TypeTag } from './ui/TypeTag';
import { Pagination, usePage } from './ui/Pagination';
import { PageHeader } from './ui/PageHeader';
import { BTN_PRIMARY, BTN_ROW, LINK, CARD, H2 } from './ui/styles';

interface DashboardProps {
  currentUser: User;
  currentRole: UserRole;
  allocations: Allocation[];
  transactions: Transaction[];
  onNavigateTab: (tab: string) => void;
  onOpenCreateAllocation?: () => void;
  onOpenRecordDistribution?: () => void;
  onViewTransaction: (tx: Transaction) => void;
}

const pctOf = (alc: Allocation) => (alc.amount > 0 ? Math.round((alc.distributedAmount / alc.amount) * 100) : 0);

export const Dashboard: React.FC<DashboardProps> = ({
  currentRole,
  allocations,
  transactions,
  onNavigateTab,
  onOpenCreateAllocation,
  onOpenRecordDistribution,
  onViewTransaction,
}) => {
  // Aggregate calculations
  const totalAllocated = allocations.reduce((sum, item) => sum + item.amount, 0);
  const totalDistributed = allocations.reduce((sum, item) => sum + item.distributedAmount, 0);
  const remainingFunds = totalAllocated - totalDistributed;

  const totalTxCount = transactions.length;
  // The newest 5 chart events, newest first: one source, so the table always matches the chart's last markers.
  const recentTransactions = ledgerEvents(transactions).slice(-5).reverse().map((e) => e.tx);
  const programmes = usePage(allocations.length, 5);

  const programmesLink = {
    ministry: { tab: 'allocations', label: 'Fund allocation →' },
    agency: { tab: 'distribution', label: 'Fund distribution →' },
    auditor: { tab: 'reports', label: 'Monitoring report →' },
  }[currentRole];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Fund distribution & monitoring"
        // One primary action per role; the auditor reaches the report from the programmes link and nav.
        actions={
          currentRole === 'ministry' ? (
            <button
              type="button"
              onClick={() => onOpenCreateAllocation ? onOpenCreateAllocation() : onNavigateTab('allocations')}
              className={BTN_PRIMARY}
            >
              + Create fund allocation
            </button>
          ) : currentRole === 'agency' ? (
            <button
              type="button"
              onClick={() => onOpenRecordDistribution ? onOpenRecordDistribution() : onNavigateTab('distribution')}
              className={BTN_PRIMARY}
            >
              + Record distribution
            </button>
          ) : undefined
        }
      />

      <KpiStrip
        items={[
          { label: 'TOTAL ALLOCATED', value: formatCurrency(totalAllocated) },
          { label: 'DISTRIBUTED', swatch: 'distributed', value: formatCurrency(totalDistributed) },
          { label: 'REMAINING', swatch: 'remaining', value: formatCurrency(remainingFunds) },
          { label: 'TRANSACTIONS RECORDED', value: totalTxCount },
        ]}
      />

      {/* Ledger chain */}
      <section aria-labelledby="chain-h" className={`${CARD} px-6 py-[22px] flex flex-col gap-4`}>
        <h2 id="chain-h" className={H2}>Fund Utilization Overview</h2>
        <StepChart transactions={transactions} onView={onViewTransaction} />
      </section>

      {/* Programme rows */}
      <section aria-labelledby="prog-h" className={`${CARD} flex flex-col`}>
        <div className="px-6 py-5 flex flex-col gap-1">
        <div className="flex justify-between items-baseline gap-3 pb-2">
          <h2 id="prog-h" className={H2}>Active programmes</h2>
          <button type="button" onClick={() => onNavigateTab(programmesLink.tab)} className={LINK}>
            {programmesLink.label}
          </button>
        </div>
        {allocations.slice(programmes.start, programmes.end).map((alc) => {
          const alcPct = pctOf(alc);
          return (
            // Stacked below lg (name + %, then bar, then figures); one row of name | bar + figures | % from lg up.
            // Column 1 is 38% in both this list and Recent records, so their middle columns start at the same x;
            // the % column is a fixed 4rem so every bar starts and ends at the same place.
            <article
              key={alc.id}
              className="border-t border-border py-3.5 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 lg:grid-cols-[minmax(0,38%)_minmax(0,1fr)_4rem] lg:items-center lg:gap-6"
            >
              <span className="flex flex-col min-w-0">
                <span className="text-base font-semibold leading-[1.3]">{alc.programme}</span>
                <span className="text-[13px] text-muted">{alc.receivingAgency}</span>
              </span>
              <div className="col-span-2 row-start-2 flex flex-col gap-2 min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1">
                <div aria-hidden="true" className="flex h-2 gap-0.5">
                  <span className="bg-distributed" style={{ width: `${alcPct}%` }} />
                  <span className="flex-1 bg-remaining" />
                </div>
                <p className="m-0 text-[13px] text-text-2 tabular-nums">
                  <span className="font-semibold text-remaining-text">{formatCurrency(alc.amount - alc.distributedAmount)} left</span>
                  {' '}of {formatCurrency(alc.amount)} · {formatCurrency(alc.distributedAmount)} distributed
                </p>
              </div>
              <span className="col-start-2 row-start-1 justify-self-end font-mono text-[22px] font-medium tracking-[-0.02em] tabular-nums lg:col-start-3">
                {alcPct}%<span className="sr-only"> distributed</span>
              </span>
            </article>
          );
        })}
        </div>
        <Pagination {...programmes} label="Programme" />
      </section>

      {/* Recent transactions: same row type as Active programmes (16px name, 13px detail, big figure on the right) */}
      <section aria-labelledby="tx-h" className={`${CARD} px-6 py-5 flex flex-col gap-1`}>
        <div className="flex justify-between items-baseline gap-3 pb-2">
          <h2 id="tx-h" className={H2}>Recent transaction records</h2>
          <button type="button" onClick={() => onNavigateTab('transactions')} className={LINK}>
            View complete transaction history →
          </button>
        </div>
        {recentTransactions.length === 0 && (
          <p className="m-0 border-t border-border py-6 text-center text-[13px] text-muted">No transactions recorded yet.</p>
        )}
        {recentTransactions.map((tx) => (
          // Below lg: programme | amount, then details | action. From lg: programme | type, ID, date | amount | action.
          // Same 38% first column as Active programmes; the amount column is a fixed 10rem (fits RM 10,000,000 at 22px).
          <article
            key={tx.id}
            className="border-t border-border py-3.5 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 items-center lg:grid-cols-[minmax(0,38%)_minmax(0,1fr)_10rem_auto] lg:gap-6"
          >
            <span className="flex flex-col min-w-0">
              <span className="text-base font-semibold leading-[1.3] truncate" title={tx.programme}>{tx.programme}</span>
              <span className="text-[13px] text-muted truncate" title={`${tx.from} → ${tx.to}`}>{tx.from} → {tx.to}</span>
            </span>
            <span className="row-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-text-2 tabular-nums min-w-0 lg:col-start-2 lg:row-start-1">
              {/* Fixed slot (fits DISTRIBUTION) so the ID and date line up whichever tag the row has */}
              <span className="w-[6.5rem] shrink-0"><TypeTag type={tx.type} /></span>
              <span className="font-mono">{tx.id}</span>
              <span>{formatDate(tx.date)}</span>
            </span>
            <span className="col-start-2 row-start-1 justify-self-end text-[22px] font-semibold tracking-[-0.02em] tabular-nums whitespace-nowrap lg:col-start-3">
              {formatCurrency(tx.amount)}
            </span>
            <button
              type="button"
              onClick={() => onViewTransaction(tx)}
              aria-label={`Details for ${tx.id}`}
              className={`${BTN_ROW} col-start-2 row-start-2 justify-self-end lg:col-start-4 lg:row-start-1`}
            >
              Details
            </button>
          </article>
        ))}
      </section>
    </div>
  );
};
