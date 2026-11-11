import React from 'react';
import { LedgerEvent } from '../../utils/ledger';
import { formatCurrency, formatDate, formatMillions } from '../../utils/formatters';
import { LINK } from './styles';

// One ledger entry, shown in the chart's popover: ID and type strip (inverted like TypeTag), amount, from → to,
// programme, date, and the running totals after this entry.
export const LedgerEntry: React.FC<{ event: LedgerEvent; onView?: () => void }> = ({ event, onView }) => {
  const { tx } = event;
  const isAlc = tx.type === 'Fund Allocation';
  return (
    <article className="border-[1.5px] border-ink flex flex-col bg-surface text-ink">
      <div
        className={`flex justify-between items-center gap-2 px-3 py-2 border-b-[1.5px] border-ink font-mono text-[11px] ${
          isAlc ? 'bg-surface text-ink' : 'bg-ink text-white'
        }`}
      >
        <span>{tx.id}</span>
        <span>{isAlc ? 'ALLOCATION' : 'DISTRIBUTION'}</span>
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        <span className="text-xl font-semibold tracking-[-0.02em]">{formatCurrency(tx.amount)}</span>
        <span className="text-[13px] text-text-2 max-w-[280px] break-words">{tx.from} → {tx.to}</span>
        <span className="text-[13px] font-semibold">{tx.programme}</span>
        <span className="text-[13px] text-text-2">{formatDate(tx.date)}</span>
        <span className="pt-2 border-t border-dashed border-border-control font-mono text-[11px] text-muted">
          Distributed RM {formatMillions(event.distributed)} · Ceiling RM {formatMillions(event.ceiling)}
        </span>
        {onView && (
          <button type="button" onClick={onView} className={`${LINK} self-start min-h-9`}>
            View details →
          </button>
        )}
      </div>
    </article>
  );
};
