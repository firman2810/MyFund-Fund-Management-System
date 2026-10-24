import { Transaction } from '../types';

export interface LedgerEvent {
  tx: Transaction;
  time: number;
  distributed: number; // cumulative distributed after this entry
  ceiling: number; // cumulative allocated after this entry
}

// Running totals per ledger entry, oldest first.
export function ledgerEvents(transactions: Transaction[]): LedgerEvent[] {
  let distributed = 0;
  let ceiling = 0;
  return transactions
    .map((tx) => ({ tx, time: new Date(tx.date).getTime() }))
    .sort((a, b) => a.time - b.time)
    .map(({ tx, time }) => {
      if (tx.type === 'Fund Allocation') ceiling += tx.amount;
      else distributed += tx.amount;
      return { tx, time, distributed, ceiling };
    });
}
