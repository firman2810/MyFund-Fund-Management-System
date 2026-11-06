-- Fabric is now the source of truth. These tables become its Postgres copy: rewritten after each commit and
-- refilled by ChainSeeder when the chain is empty. The fake block counter goes; block numbers come from Fabric.
TRUNCATE distributions, allocations;
DROP SEQUENCE ledger_block_seq;
