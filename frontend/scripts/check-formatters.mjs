// Self-check for the design-system formatters and chart running totals. Run: npm test
// Contract rules (balances, overspend, ownership) are tested in smart-contract/chaincode and the backend.
import { createServer } from 'vite';
import assert from 'node:assert';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'silent' });
try {
  const f = await server.ssrLoadModule('/src/utils/formatters.ts');
  assert.equal(f.formatMillions(9650000), '9.65M');
  assert.equal(f.formatMillions(32500000), '32.5M');
  assert.equal(f.formatDateShort('2026-03-02 09:40:00'), '02 MAR 09:40');
  assert.equal(f.shortTxId('TX-DST-2026-006'), 'DST-006');
  assert.equal(f.agencyCode('National Disaster Management Agency (NADMA)'), 'NADMA');

  const { ledgerEvents, issuesByAllocation } = await server.ssrLoadModule('/src/utils/ledger.ts');
  const tx = (type, amount, date) => ({ id: date, type, amount, date });
  const ev = ledgerEvents([tx('Fund Distribution', 2, '2026-02-02'), tx('Fund Allocation', 10, '2026-02-01')]);
  assert.deepEqual(ev.map((e) => [e.ceiling, e.distributed]), [[10, 0], [10, 2]]);

  // A distribution's discrepancy counts against its allocation; one not on the ledger keeps its own id.
  const issues = issuesByAllocation(
    [{ recordId: 'ALC-1' }, { recordId: 'DST-1' }, { recordId: 'DST-9' }],
    [{ id: 'DST-1', allocationId: 'ALC-1' }]);
  assert.deepEqual([...issues], [['ALC-1', 2], ['DST-9', 1]]);
  assert.equal(f.formatDay(new Date(2026, 5, 30, 23, 59).getTime()), '30 Jun 2026');

  // Report "position as at": the demo seed's records (backend/src/main/resources/seed/demo-seed.json).
  const { quarterEnds, positionAsAt } = await server.ssrLoadModule('/src/utils/ledger.ts');
  const alcs = [
    { id: 'ALC-001', amount: 15000000, allocatedDate: '2026-01-14 09:30:00' },
    { id: 'ALC-002', amount: 8000000, allocatedDate: '2026-03-03 11:15:00' },
    { id: 'ALC-003', amount: 5500000, allocatedDate: '2026-04-21 14:00:00' },
    { id: 'ALC-004', amount: 4000000, allocatedDate: '2026-07-06 10:45:00' },
  ];
  const dsts = [
    ['ALC-001', 4500000, '2026-02-06 11:20:00'], ['ALC-001', 6750000, '2026-03-27 15:45:00'],
    ['ALC-002', 3200000, '2026-05-15 10:10:00'], ['ALC-002', 2400000, '2026-06-09 16:30:00'],
    ['ALC-003', 4200000, '2026-08-03 14:15:00'], ['ALC-004', 1800000, '2026-09-01 09:40:00'],
  ].map(([allocationId, amount, distributedDate]) => ({ allocationId, amount, distributedDate }));
  const quarters = quarterEnds([...alcs.map((a) => a.allocatedDate), ...dsts.map((d) => d.distributedDate)]);
  assert.deepEqual(quarters.map((q) => q.label), ['Q3 2026', 'Q2 2026', 'Q1 2026']);
  const q1 = quarters[2];
  assert.equal(f.formatDay(q1.end), '31 Mar 2026');
  assert.ok(q1.start === new Date(2026, 0, 1).getTime() && q1.end === new Date(2026, 3, 1).getTime() - 1);
  const pos = (end) => positionAsAt(alcs, dsts, end).map((r) => [r.allocation.id, r.distributed, r.remaining]);
  assert.deepEqual(pos(q1.end), [['ALC-001', 11250000, 3750000], ['ALC-002', 0, 8000000]]);
  assert.equal(pos().length, 4); // no end = current position
  assert.deepEqual(pos()[1], ['ALC-002', 5600000, 2400000]);

  // Pagination window: empty list, partial last page, out-of-range page clamped.
  const { pageRange } = await server.ssrLoadModule('/src/components/ui/Pagination.tsx');
  assert.deepEqual(pageRange(0, 10, 1), { page: 1, pages: 1, start: 0, end: 0 });
  assert.deepEqual(pageRange(64, 10, 7), { page: 7, pages: 7, start: 60, end: 64 });
  assert.deepEqual(pageRange(64, 10, 99), { page: 7, pages: 7, start: 60, end: 64 });
  assert.deepEqual(pageRange(64, 10, 0), { page: 1, pages: 7, start: 0, end: 10 });
  console.log('formatters + ledger + position + pagination OK');
} finally {
  await server.close();
}
