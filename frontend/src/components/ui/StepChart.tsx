import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Transaction } from '../../types';
import { ledgerEvents } from '../../utils/ledger';
import { agencyCode, formatCurrency, formatDateShort, formatDay, formatMillions, shortTxId } from '../../utils/formatters';
import { LedgerEntry } from './LedgerEntry';

const H = 220;
const LEFT = 64;
const TOP = 10;
const BASE = 196;
const GRID = 10_000_000; // gridline every RM 10M
const DAY = 86_400_000;
const MIN_W = 640; // narrower wrappers scroll sideways instead of squeezing the chart
const LABEL_GAP = 56; // px between marker labels
const TIP_W = 300;
const CLOSE_DELAY = 100; // ms, so the pointer can travel from a marker into the popover (WCAG 1.4.13)

// Which marker labels to draw, given their x positions in order: keep the first, drop any within `minGap` of the last
// one drawn, and always draw the last (dropping its close neighbour instead).
export function visibleLabels(xs: number[], minGap: number): boolean[] {
  const keep = xs.map(() => false);
  let lastKept = -1;
  xs.forEach((x, i) => {
    if (lastKept < 0 || x - xs[lastKept] >= minGap) {
      keep[i] = true;
      lastKept = i;
    }
  });
  const end = xs.length - 1;
  if (end > 0 && !keep[end]) {
    if (xs[end] - xs[lastKept] < minGap) keep[lastKept] = false;
    keep[end] = true;
  }
  return keep;
}

// Cumulative distributed vs allocation ceiling as step lines; the orange band between them is money still to distribute.
// Drawn 1:1 at the wrapper's pixel width so all text stays 11px. Every marker opens a popover (hover, focus, tap).
// shortcut: marker labels are thinned to one per 56px (the last always drawn); the markers and popover still cover every event.
export const StepChart: React.FC<{ transactions: Transaction[]; onView?: (tx: Transaction) => void }> = ({ transactions, onView }) => {
  const wrap = useRef<HTMLDivElement>(null); // positioning context for the popover; does not scroll
  const scroller = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const markers = useRef<(SVGGElement | null)[]>([]);
  const closeTimer = useRef<number | undefined>(undefined);
  const pinnedRef = useRef(false);
  const tipId = useId();

  const [boxW, setBoxW] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [roving, setRoving] = useState<number | null>(null); // the marker that holds the group's single Tab stop
  const [below, setBelow] = useState(false);

  const events = ledgerEvents(transactions);
  const hasEvents = events.length > 0;

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    setBoxW(el.clientWidth);
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasEvents]);

  const open = (i: number) => {
    window.clearTimeout(closeTimer.current);
    setActive(i);
  };
  const close = () => {
    window.clearTimeout(closeTimer.current);
    pinnedRef.current = false;
    setActive(null);
  };
  const closeSoon = () => {
    if (pinnedRef.current) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setActive(null), CLOSE_DELAY);
  };

  // A tap pins the popover; a tap anywhere outside the chart closes it.
  useEffect(() => {
    if (active === null) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [active]);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const W = Math.max(MIN_W, boxW || 1270);
  const RIGHT = W - 8;
  const last = events[events.length - 1];
  const t0 = events[0]?.time ?? 0;
  const span = last ? Math.max(last.time - t0, DAY) : DAY;
  const t1 = (last?.time ?? 0) + span * 0.04; // a little room after the final step
  const yMax = last ? Math.ceil((last.ceiling * 1.08) / GRID) * GRID || GRID : GRID;

  const x = (t: number) => LEFT + ((t - t0) / (t1 - t0)) * (RIGHT - LEFT);
  const y = (v: number) => BASE - (v / yMax) * (BASE - TOP);
  const markerY = (i: number) => y(events[i].tx.type === 'Fund Allocation' ? events[i].ceiling : events[i].distributed);

  // Flip the popover below the marker when there isn't room above it in the viewport.
  useLayoutEffect(() => {
    if (active === null || !tip.current || !wrap.current) return;
    const top = wrap.current.getBoundingClientRect().top + markerY(active);
    setBelow(top - tip.current.offsetHeight - 16 < 0);
  }, [active, boxW]);

  if (!hasEvents) return null;

  const stepPath = (key: 'distributed' | 'ceiling') =>
    `M${x(t0)} ${y(0)}` + events.map((e) => ` H${x(e.time)} V${y(e[key])}`).join('') + ` H${x(t1)}`;
  const closePath = ` V${y(0)} H${x(t0)} Z`;
  const step = stepPath('distributed');
  const alloc = stepPath('ceiling');

  const grid = Array.from({ length: yMax / GRID + 1 }, (_, i) => i * GRID);
  const ticks = Array.from({ length: 6 }, (_, i) => t0 + ((t1 - t0) * i) / 5);
  const day = (t: number) => formatDateShort(new Date(t).toISOString()).slice(0, 6);
  const showLabel = visibleLabels(events.map((e) => x(e.time)), LABEL_GAP);
  const tabStop = Math.min(roving ?? events.length - 1, events.length - 1);

  const first = events.find((e) => e.tx.type === 'Fund Distribution');
  const aria =
    `Cumulative distributions rise in steps to RM ${formatMillions(last.distributed)}` +
    (first ? ` from ${day(first.time)}` : '') +
    ` to ${day(last.time)}; allocation ceiling reaches RM ${formatMillions(last.ceiling)}`;

  const moveTo = (i: number) => {
    setRoving(i);
    markers.current[i]?.focus();
  };
  const onKey = (i: number) => (e: React.KeyboardEvent) => {
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: events.length - 1 }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      moveTo(Math.max(0, Math.min(events.length - 1, to)));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onView?.(events[i].tx);
    } else if (e.key === 'Escape') {
      close();
    }
  };
  // Leaving a marker or the popover closes it, unless focus moved between the two.
  const onBlur = (e: React.FocusEvent) => {
    setFocused(null);
    const to = e.relatedTarget as Node | null;
    if (!to || !wrap.current?.contains(to)) closeSoon();
  };

  // Pointer → nearest marker within 16px. Clustered markers' hit areas overlap, so DOM hit-testing would always
  // pick the one drawn last instead of the one under the pointer.
  const nearest = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    let best = -1;
    let bestD = 16 * 16;
    events.forEach((ev, i) => {
      const d = (x(ev.time) - px) ** 2 + (markerY(i) - py) ** 2;
      if (d <= bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  };

  const activeX = active !== null ? x(events[active].time) : 0;
  const tipWidth = Math.min(TIP_W, boxW || TIP_W);
  const tipLeft = Math.max(0, Math.min(activeX - scrollX - tipWidth / 2, (boxW || W) - tipWidth));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-5 text-xs text-text-2">
        <span className="flex items-center gap-2"><span aria-hidden="true" className="w-[18px] h-[3px] bg-distributed" />Cumulative distributed</span>
        <span className="flex items-center gap-2"><span aria-hidden="true" className="w-[18px] border-t-2 border-dashed border-ink" />Allocated ceiling</span>
        <span className="flex items-center gap-2"><span aria-hidden="true" className="w-3 h-3 bg-remaining opacity-20" />Remaining</span>
      </div>
      <div ref={wrap} className="relative">
        <div ref={scroller} className="overflow-x-auto" onScroll={(e) => setScrollX(e.currentTarget.scrollLeft)}>
          <svg
            role="group"
            aria-label={aria}
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            className="block"
            onMouseMove={(e) => {
              const i = nearest(e);
              if (i >= 0) open(i);
              else closeSoon();
            }}
            onMouseLeave={closeSoon}
            onClick={(e) => {
              // A tap (or click) pins the popover until a tap outside the chart.
              const i = nearest(e);
              if (i < 0) return;
              pinnedRef.current = true;
              open(i);
            }}
          >
            <g aria-hidden="true" fontFamily="Geist Mono, monospace" fontSize="11" fill="var(--text-muted)">
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
            <g aria-hidden="true">
              <path d={alloc + closePath} fill="var(--remaining)" fillOpacity="0.2" />
              <path d={step + closePath} fill="var(--distributed-fill)" />
              <path d={alloc} fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="6 4" />
              <path d={step} fill="none" stroke="var(--distributed)" strokeWidth="2.5" />
              {active !== null && <line x1={activeX} x2={activeX} y1={markerY(active)} y2={BASE} stroke="var(--ink)" strokeWidth="1" />}
            </g>
            {events.map((e, i) => {
              const isAlc = e.tx.type === 'Fund Allocation';
              const mx = x(e.time);
              const my = markerY(i);
              return (
                <g
                  key={e.tx.id}
                  ref={(el) => { markers.current[i] = el; }}
                  role="button"
                  tabIndex={i === tabStop ? 0 : -1}
                  aria-label={`${e.tx.id}, ${isAlc ? 'allocation' : 'distribution'}, ${formatCurrency(e.tx.amount)}, ${formatDay(e.tx.date)}, ${agencyCode(e.tx.from)} to ${e.tx.to}`}
                  aria-describedby={active === i ? tipId : undefined}
                  className="cursor-pointer outline-none"
                  onFocus={() => {
                    setFocused(i);
                    setRoving(i);
                    open(i);
                  }}
                  onBlur={onBlur}
                  onKeyDown={onKey(i)}
                >
                  <rect x={mx - 12} y={my - 12} width="24" height="24" fill="transparent" />
                  {focused === i && <rect x={mx - 9} y={my - 9} width="18" height="18" fill="none" stroke="var(--ink)" strokeWidth="2" />}
                  <rect
                    x={mx - 5}
                    y={my - 5}
                    width="10"
                    height="10"
                    fill={isAlc ? 'var(--surface)' : 'var(--distributed)'}
                    stroke={isAlc ? 'var(--ink)' : 'var(--distributed)'}
                    strokeWidth="2"
                  />
                  {showLabel[i] && (
                    <text x={mx} y={my - 14} textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="11" fill="var(--ink)" aria-hidden="true">
                      {shortTxId(e.tx.id)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        {active !== null && (
          <div
            ref={tip}
            id={tipId}
            role="tooltip"
            className="absolute z-10"
            style={{
              width: tipWidth,
              left: tipLeft,
              // Above: anchor 16px over the marker and lift by the popover's own height.
              ...(below ? { top: markerY(active) + 16 } : { top: markerY(active) - 16, transform: 'translateY(-100%)' }),
            }}
            onMouseEnter={() => open(active)}
            onMouseLeave={closeSoon}
            onBlur={onBlur}
            onKeyDown={(e) => e.key === 'Escape' && close()}
          >
            <LedgerEntry event={events[active]} onView={onView && (() => onView(events[active].tx))} />
          </div>
        )}
      </div>
    </div>
  );
};
