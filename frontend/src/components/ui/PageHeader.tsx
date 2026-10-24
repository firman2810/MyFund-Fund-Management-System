import React from 'react';

// Serif H1 -> optional standfirst, actions on the right, closed by a 4px ink rule.
export const PageHeader: React.FC<{
  title: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, lead, actions }) => (
  <section className="flex flex-wrap items-end justify-between gap-5 border-b-4 border-ink pb-5">
    <div className="flex flex-col gap-1.5 flex-[1_1_520px] min-w-0">
      <h1 className="m-0 font-display font-normal text-[clamp(30px,4vw,44px)] leading-[1.1] tracking-[-0.01em]">{title}</h1>
      {lead && <p className="m-0 text-[15px] text-text-2 max-w-[62ch]">{lead}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </section>
);
