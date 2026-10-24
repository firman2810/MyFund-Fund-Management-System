// Self-check for the mock API's ledger rules (the reference the backend must match). Run: npm test
import { createServer } from 'vite';
import assert from 'node:assert';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'silent' });
try {
  const { mockApi: api } = await server.ssrLoadModule('/src/services/mockApi.ts');

  const user = (await api.login({ role: 'agency' })).user;
  const [alc] = await api.getAllocations();
  const before = alc.remainingAmount;

  const r = await api.createDistribution({ allocationId: alc.id, beneficiaryName: 'X', beneficiaryId: '', amount: 1000, description: '' });
  assert.equal(r.allocation.remainingAmount, before - 1000);
  assert.equal(r.distribution.agencyName, user.organization);
  assert.equal((await api.getAllocations())[0].remainingAmount, before - 1000);

  // Exactly the remaining balance is allowed; one more ringgit is not.
  await assert.rejects(api.createDistribution({ allocationId: alc.id, beneficiaryName: 'X', beneficiaryId: '', amount: before - 999, description: '' }));
  await assert.rejects(api.createDistribution({ allocationId: alc.id, beneficiaryName: 'X', beneficiaryId: '', amount: 0, description: '' }));

  // Switching role re-attributes new records (review finding 1).
  const ministry = (await api.login({ role: 'ministry' })).user;
  const a = await api.createAllocation({ programme: 'P', receivingAgency: 'A', amount: 5, description: '', supportingInfo: '', referenceNo: '' });
  assert.equal(a.allocation.allocatedBy, ministry.organization);
  assert.equal((await api.getTransactions())[0].txHash, a.allocation.blockchainRecord.txId);

  console.log('mock api OK');

  // Design-system formatters and chart running totals.
  const f = await server.ssrLoadModule('/src/utils/formatters.ts');
  assert.equal(f.formatMillions(9650000), '9.65M');
  assert.equal(f.formatMillions(32500000), '32.5M');
  assert.equal(f.formatDateShort('2026-03-02 09:40:00'), '02 MAR 09:40');
  assert.equal(f.shortTxId('TX-DST-2026-006'), 'DST-006');
  assert.equal(f.agencyCode('National Disaster Management Agency (NADMA)'), 'NADMA');

  const { ledgerEvents } = await server.ssrLoadModule('/src/utils/ledger.ts');
  const tx = (type, amount, date) => ({ id: date, type, amount, date });
  const ev = ledgerEvents([tx('Fund Distribution', 2, '2026-02-02'), tx('Fund Allocation', 10, '2026-02-01')]);
  assert.deepEqual(ev.map((e) => [e.ceiling, e.distributed]), [[10, 0], [10, 2]]);
  console.log('formatters + ledger OK');
} finally {
  await server.close();
}
