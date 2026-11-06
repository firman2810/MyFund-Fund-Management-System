import { Discrepancy, Distribution, Transaction } from '../types';

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

// Verification discrepancies per allocation row; a distribution's discrepancy counts against its allocation.
export function issuesByAllocation(
  discrepancies: Pick<Discrepancy, 'recordId'>[],
  distributions: Pick<Distribution, 'id' | 'allocationId'>[],
): Map<string, number> {
  const parent = new Map(distributions.map((d) => [d.id, d.allocationId]));
  const issues = new Map<string, number>();
  for (const { recordId } of discrepancies) {
    const id = parent.get(recordId) ?? recordId;
    issues.set(id, (issues.get(id) ?? 0) + 1);
  }
  return issues;
}
