import { Allocation, Discrepancy, Distribution, Transaction } from '../types';

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
    // Equal timestamps fall back to the ID, so every view of the ledger lists ties the same way.
    .sort((a, b) => a.time - b.time || (a.tx.id < b.tx.id ? -1 : a.tx.id > b.tx.id ? 1 : 0))
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

export interface Quarter {
  label: string; // "Q2 2026"
  start: number; // first ms of the quarter, local time
  end: number; // last ms of the quarter
}

// Calendar quarters that contain at least one record, newest first.
export function quarterEnds(dates: string[]): Quarter[] {
  const quarters = new Map<string, Quarter>();
  for (const s of dates) {
    const d = new Date(s);
    if (isNaN(d.getTime())) continue;
    const y = d.getFullYear();
    const q = Math.floor(d.getMonth() / 3);
    const label = `Q${q + 1} ${y}`;
    if (!quarters.has(label)) {
      quarters.set(label, { label, start: new Date(y, q * 3, 1).getTime(), end: new Date(y, q * 3 + 3, 1).getTime() - 1 });
    }
  }
  return [...quarters.values()].sort((a, b) => b.end - a.end);
}

// Each allocation dated on or before `end`, with what had been distributed from it by then. No `end` = now.
export function positionAsAt<A extends Pick<Allocation, 'id' | 'amount' | 'allocatedDate'>>(
  allocations: A[],
  distributions: Pick<Distribution, 'allocationId' | 'amount' | 'distributedDate'>[],
  end?: number,
): { allocation: A; distributed: number; remaining: number }[] {
  const by = (date: string) => end === undefined || new Date(date).getTime() <= end;
  const distributed = new Map<string, number>();
  for (const d of distributions) {
    if (by(d.distributedDate)) distributed.set(d.allocationId, (distributed.get(d.allocationId) ?? 0) + d.amount);
  }
  return allocations
    .filter((a) => by(a.allocatedDate))
    .map((allocation) => {
      const sum = distributed.get(allocation.id) ?? 0;
      return { allocation, distributed: sum, remaining: allocation.amount - sum };
    });
}
