import React from 'react';
import { Allocation } from '../../types';
import { formatMillions, agencyCode } from '../../utils/formatters';

const UNIT = 50000; // one square = RM 50,000

// shortcut: one span per square, fine up to a few thousand squares (~RM 100M per programme); switch to SVG/canvas beyond that.
export const UnitBars: React.FC<{ allocations: Allocation[] }> = ({ allocations }) => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-wrap gap-5 text-xs text-text-2">
      <span className="flex items-center gap-2"><span aria-hidden="true" className="w-2.5 h-2.5 bg-distributed" />Distributed</span>
      <span className="flex items-center gap-2"><span aria-hidden="true" className="w-2.5 h-2.5 bg-remaining" />Remaining</span>
      <span className="font-mono text-[11px] text-muted ml-auto self-center">1 SQUARE = RM 50,000</span>
    </div>
    <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-x-5 gap-y-6 border-t border-border pt-3.5 items-end">
      {allocations.map((alc) => {
        const total = Math.round(alc.amount / UNIT);
        const dist = Math.min(total, Math.round(alc.distributedAmount / UNIT));
        const remaining = alc.amount - alc.distributedAmount;
        const pct = alc.amount > 0 ? Math.round((alc.distributedAmount / alc.amount) * 100) : 0;
        return (
          <figure key={alc.id} className="m-0 flex flex-col justify-end gap-2.5">
            <div
              role="img"
              aria-label={`${alc.programme}: ${total - dist} of ${total} squares remaining, RM ${formatMillions(remaining)} of RM ${formatMillions(alc.amount)}`}
              className="grid grid-cols-[repeat(10,8px)] gap-0.5"
            >
              {/* remaining first so it sits on top; distributed fills from the bottom */}
              {Array.from({ length: total }, (_, i) => (
                <span key={i} className={`w-2 h-2 ${i < total - dist ? 'bg-remaining' : 'bg-distributed'}`} />
              ))}
            </div>
            <figcaption className="flex flex-col gap-0.5 border-t border-ink pt-2">
              <span className="font-display text-base font-semibold leading-[1.15] line-clamp-2" title={alc.programme}>
                {alc.programme}
              </span>
              <span className="font-mono text-[11px] text-muted">
                {agencyCode(alc.receivingAgency)} · {pct}% OUT
              </span>
              <span className="text-sm font-semibold text-remaining-text">RM {formatMillions(remaining)} left</span>
            </figcaption>
          </figure>
        );
      })}
    </div>
  </div>
);
