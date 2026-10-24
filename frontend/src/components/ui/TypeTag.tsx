import React from 'react';
import { Transaction } from '../../types';

export const TypeTag: React.FC<{ type: Transaction['type'] }> = ({ type }) => (
  <span
    className={`inline-block px-2 py-0.5 border-[1.5px] border-ink font-mono text-[11px] ${
      type === 'Fund Allocation' ? 'bg-surface text-ink' : 'bg-ink text-white'
    }`}
  >
    {type.replace('Fund ', '').toUpperCase()}
  </span>
);
