import React from 'react';
import { User, Allocation, Transaction, UserRole } from '../types';
import { formatCurrency, formatMillions } from '../utils/formatters';
import { ledgerEvents } from '../utils/ledger';
import { KpiStrip } from './ui/KpiStrip';
import { StepChart } from './ui/StepChart';
import { BlockCard } from './ui/BlockCard';
import { DataTable } from './ui/DataTable';
import { PageHeader } from './ui/PageHeader';
import { BTN_PRIMARY, LINK, CARD, H2, SECTION_HEAD } from './ui/styles';

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
  const recentTransactions = transactions.slice(0, 5);
  const latestBlocks = ledgerEvents(transactions).slice(-5); // oldest -> newest, left to right

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
        <StepChart transactions={transactions} />
        <ol aria-label="Latest committed blocks, oldest first" className="list-none m-0 p-0 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          {latestBlocks.map((e) => (
            <li key={e.tx.id} className="min-w-0">
              <BlockCard
                tx={e.tx}
                runningLabel={e.tx.type === 'Fund Allocation' ? `CAP ${formatMillions(e.ceiling)}` : `Σ ${formatMillions(e.distributed)}`}
              />
            </li>
          ))}
        </ol>
      </section>

      {/* Programme rows */}
      <section aria-labelledby="prog-h" className={`${CARD} px-6 py-5 flex flex-col gap-1`}>
        <div className="flex justify-between items-baseline gap-3 pb-2">
          <h2 id="prog-h" className={H2}>Active programmes</h2>
          <button type="button" onClick={() => onNavigateTab(programmesLink.tab)} className={LINK}>
            {programmesLink.label}
          </button>
        </div>
        {allocations.map((alc) => {
          const alcPct = pctOf(alc);
          return (
            <article key={alc.id} className="border-t border-border py-3.5 flex flex-col gap-2">
              <div className="flex justify-between gap-4">
                <span className="flex flex-col min-w-0">
                  <span className="font-semibold">{alc.programme}</span>
                  <span className="text-xs text-muted">{alc.receivingAgency}</span>
                </span>
                <span className="font-mono text-[22px] font-medium tracking-[-0.02em]">{alcPct}%</span>
              </div>
              <div aria-hidden="true" className="flex h-2 gap-0.5">
                <span className="bg-distributed" style={{ width: `${alcPct}%` }} />
                <span className="flex-1 bg-remaining" />
              </div>
              <div className="flex justify-between flex-wrap gap-2 font-mono text-xs text-text-2">
                <span>DIST {formatCurrency(alc.distributedAmount)}</span>
                <span className="text-remaining-text">LEFT {formatCurrency(alc.amount - alc.distributedAmount)}</span>
                <span>TOTAL {formatCurrency(alc.amount)}</span>
              </div>
            </article>
          );
        })}
      </section>

      {/* Recent Transactions Table */}
      <section aria-labelledby="tx-h" className={`${CARD} flex flex-col`}>
        <div className={SECTION_HEAD}>
          <h2 id="tx-h" className={H2}>Recent transaction records</h2>
          <button type="button" onClick={() => onNavigateTab('transactions')} className={LINK}>
            View complete transaction history →
          </button>
        </div>
        <DataTable transactions={recentTransactions} onView={onViewTransaction} />
      </section>
    </div>
  );
};
