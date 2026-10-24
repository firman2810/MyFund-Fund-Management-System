import React from 'react';
import { Transaction } from '../../types';
import { ledgerEvents } from '../../utils/ledger';
import { formatDateShort, formatMillions, shortTxId } from '../../utils/formatters';

const W = 1270;
const H = 220;
const LEFT = 64;
const RIGHT = W - 8;
const TOP = 10;
const BASE = 196;
const GRID = 10_000_000; // gridline every RM 10M
const DAY = 86_400_000;

// Cumulative distributed vs allocation ceiling as step lines; the orange band between them is money still to distribute.
// shortcut: marker labels can overlap when many entries land on nearby dates; thin them out past ~15 entries.
export const StepChart: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const events = ledgerEvents(transactions);
  if (events.length === 0) return null;

  const last = events[events.length - 1];
  const t0 = events[0].time;
  const span = Math.max(last.time - t0, DAY);
  const t1 = last.time + span * 0.04; // a little room after the final step
  const yMax = Math.ceil((last.ceiling * 1.08) / GRID) * GRID || GRID;

  const x = (t: number) => LEFT + ((t - t0) / (t1 - t0)) * (RIGHT - LEFT);
  const y = (v: number) => BASE - (v / yMax) * (BASE - TOP);

  const stepPath = (key: 'distributed' | 'ceiling') =>
    `M${x(t0)} ${y(0)}` + events.map((e) => ` H${x(e.time)} V${y(e[key])}`).join('') + ` H${x(t1)}`;
  const close = ` V${y(0)} H${x(t0)} Z`;
  const step = stepPath('distributed');
  const alloc = stepPath('ceiling');

  const grid = Array.from({ length: yMax / GRID + 1 }, (_, i) => i * GRID);
  const ticks = Array.from({ length: 6 }, (_, i) => t0 + ((t1 - t0) * i) / 5);
  const day = (t: number) => formatDateShort(new Date(t).toISOString()).slice(0, 6);

  const first = events.find((e) => e.tx.type === 'Fund Distribution');
  const aria =
    `Cumulative distributions rise in steps to RM ${formatMillions(last.distributed)}` +
    (first ? ` from ${day(first.time)}` : '') +
    ` to ${day(last.time)}; allocation ceiling reaches RM ${formatMillions(last.ceiling)}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-5 text-xs text-text-2">
        <span className="flex items-center gap-2"><span aria-hidden="true" className="w-[18px] h-[3px] bg-distributed" />Cumulative distributed</span>
        <span className="flex items-center gap-2"><span aria-hidden="true" className="w-[18px] border-t-2 border-dashed border-ink" />Allocated ceiling</span>
        <span className="flex items-center gap-2"><span aria-hidden="true" className="w-3 h-3 bg-remaining opacity-25" />Remaining</span>
      </div>
      <svg role="img" aria-label={aria} viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto">
        <g fontFamily="Geist Mono, monospace" fontSize="11" fill="var(--text-muted)">
          {grid.map((v) => (
            <g key={v}>
              <line x1={LEFT} x2={W} y1={y(v)} y2={y(v)} stroke="var(--gridline)" />
              <text x="0" y={y(v) + 4}>{v ? `RM ${v / 1e6}M` : 'RM 0'}</text>
            </g>
          ))}
          {ticks.map((t, i) => (
            <text key={t} x={x(t)} y="218" textAnchor={i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'}>
              {day(t)}
            </text>
          ))}
        </g>
        <path d={alloc + close} fill="var(--remaining)" fillOpacity="0.2" />
        <path d={step + close} fill="var(--distributed-fill)" />
        <path d={alloc} fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="6 4" />
        <path d={step} fill="none" stroke="var(--distributed)" strokeWidth="2.5" />
        {events.map((e) => {
          const isAlc = e.tx.type === 'Fund Allocation';
          const my = y(isAlc ? e.ceiling : e.distributed);
          return (
            <g key={e.tx.id}>
              <title>{`${e.tx.id} · RM ${formatMillions(e.tx.amount)} · ${formatDateShort(e.tx.date)}`}</title>
              <rect
                x={x(e.time) - 5}
                y={my - 5}
                width="10"
                height="10"
                fill={isAlc ? 'var(--surface)' : 'var(--distributed)'}
                stroke={isAlc ? 'var(--ink)' : 'var(--distributed)'}
                strokeWidth="2"
              />
              <text x={x(e.time)} y={my - 12} textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="11" fill="var(--ink)">
                {shortTxId(e.tx.id)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
