import React from 'react';
import { Transaction } from '../../types';
import { formatCurrency, formatDateShort, agencyCode } from '../../utils/formatters';

// Ledger entry card. runningLabel is the total after this entry, e.g. "Σ 21.05M" or "CAP 32.5M".
export const BlockCard: React.FC<{ tx: Transaction; runningLabel: string }> = ({ tx, runningLabel }) => {
  const isAlc = tx.type === 'Fund Allocation';
  return (
    <article className="h-full border-[1.5px] border-ink flex flex-col bg-surface">
      <div
        className={`flex justify-between items-center gap-2 px-2.5 py-2 border-b-[1.5px] border-ink font-mono text-[11px] ${
          isAlc ? 'bg-surface text-ink' : 'bg-ink text-white'
        }`}
      >
        <span>{tx.id}</span>
        <span>{isAlc ? 'ALLOCATION' : 'DISTRIBUTION'}</span>
      </div>
      <div className="p-2.5 flex flex-col gap-1.5">
        <span className="text-xl font-semibold tracking-[-0.02em]">{formatCurrency(tx.amount)}</span>
        <span className="text-xs text-text-2 truncate" title={`${tx.from} → ${tx.to}`}>
          {agencyCode(tx.from)} → {tx.to}
        </span>
        <div className="flex justify-between pt-2 border-t border-dashed border-border-control font-mono text-[11px] text-muted">
          <span>{formatDateShort(tx.date)}</span>
          <span>{runningLabel}</span>
        </div>
      </div>
    </article>
  );
};
