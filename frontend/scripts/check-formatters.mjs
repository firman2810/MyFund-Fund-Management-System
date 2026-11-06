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
  console.log('formatters + ledger OK');
} finally {
  await server.close();
}
