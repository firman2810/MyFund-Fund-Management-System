-- Spread the demo events across Jan–Sep 2026 so charts stay balanced as new data lands in October.
-- Same chronological order as V2 (block numbers still increase with time); matches frontend mockData.ts.

UPDATE allocations SET allocated_at = '2026-03-03 11:15:00+08', ledger_timestamp = '2026-03-03T03:15:22Z'
WHERE id = 'ALC-2026-002';
UPDATE allocations SET allocated_at = '2026-04-21 14:00:00+08', ledger_timestamp = '2026-04-21T06:00:45Z',
    supporting_info = 'Health Partnership Accord MOH/NGO/2026-Q2; MOF Special Project Sub-allocation.'
WHERE id = 'ALC-2026-003';
UPDATE allocations SET allocated_at = '2026-07-06 10:45:00+08', ledger_timestamp = '2026-07-06T02:45:10Z'
WHERE id = 'ALC-2026-004';

UPDATE distributions SET distributed_at = '2026-02-06 11:20:00+08', ledger_timestamp = '2026-02-06T03:20:30Z'
WHERE id = 'DST-2026-001';
UPDATE distributions SET distributed_at = '2026-03-27 15:45:00+08', ledger_timestamp = '2026-03-27T07:45:15Z'
WHERE id = 'DST-2026-002';
UPDATE distributions SET distributed_at = '2026-05-15 10:10:00+08', ledger_timestamp = '2026-05-15T02:10:05Z'
WHERE id = 'DST-2026-003';
UPDATE distributions SET distributed_at = '2026-06-09 16:30:00+08', ledger_timestamp = '2026-06-09T08:30:40Z'
WHERE id = 'DST-2026-004';
UPDATE distributions SET distributed_at = '2026-08-03 14:15:00+08', ledger_timestamp = '2026-08-03T06:15:55Z'
WHERE id = 'DST-2026-005';
UPDATE distributions SET distributed_at = '2026-09-01 09:40:00+08', ledger_timestamp = '2026-09-01T01:40:18Z'
WHERE id = 'DST-2026-006';
