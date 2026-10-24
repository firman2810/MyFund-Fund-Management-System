import React from 'react';
import { Check } from 'lucide-react';

export interface Kpi {
  label: string;
  value: React.ReactNode;
  caption?: string;
  swatch?: 'distributed' | 'remaining';
  check?: boolean; // ink check icon before the caption ("committed")
}

export const KpiStrip: React.FC<{ items: Kpi[] }> = ({ items }) => (
  <section
    aria-label="Key figures"
    className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-px bg-border border border-border"
  >
    {items.map((k) => (
      <div key={k.label} className="bg-surface px-5 py-[18px] flex flex-col gap-1.5">
        <span className="font-mono text-[11px] text-muted flex items-center gap-1.5">
          {k.swatch && (
            <span aria-hidden="true" className={`w-2 h-2 ${k.swatch === 'remaining' ? 'bg-remaining' : 'bg-distributed'}`} />
          )}
          {k.label}
        </span>
        <span
          className={`text-[30px] font-semibold tracking-[-0.02em] leading-tight ${
            k.swatch === 'remaining' ? 'text-remaining-text' : ''
          }`}
        >
          {k.value}
        </span>
        {k.caption && (
          <span className={`text-xs flex items-center gap-1 ${k.check ? 'text-ink' : 'text-muted'}`}>
            {k.check && <Check aria-hidden="true" size={12} strokeWidth={3} />}
            {k.caption}
          </span>
        )}
      </div>
    ))}
  </section>
);
