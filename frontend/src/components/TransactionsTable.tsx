import React, { useState, useMemo } from 'react';
import { Transaction, User, UserRole } from '../types';
import { Search, X } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { DataTable } from './ui/DataTable';
import { CARD, INPUT, LABEL, LINK } from './ui/styles';


interface TransactionsTableProps {
  currentUser: User;
  currentRole: UserRole;
  transactions: Transaction[];
  onViewTransaction: (tx: Transaction) => void;
  onOpenReport?: () => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  currentUser,
  currentRole,
  transactions,
  onViewTransaction,
  onOpenReport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedAgency, setSelectedAgency] = useState<string>('ALL');

  // Unique agencies in transaction set
  const agencies = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.type === 'Fund Allocation') set.add(tx.to);
      if (tx.type === 'Fund Distribution') set.add(tx.from);
    });
    return Array.from(set);
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type filter
      if (selectedType !== 'ALL' && tx.type !== selectedType) {
        return false;
      }

      // Agency filter
      if (selectedAgency !== 'ALL') {
        const matchesFrom = tx.from.toLowerCase().includes(selectedAgency.toLowerCase());
        const matchesTo = tx.to.toLowerCase().includes(selectedAgency.toLowerCase());
        if (!matchesFrom && !matchesTo) return false;
      }

      // Search query (TX ID, hash, from, to, programme, description)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = tx.id.toLowerCase().includes(q);
        const matchesHash = tx.txHash.toLowerCase().includes(q);
        const matchesFrom = tx.from.toLowerCase().includes(q);
        const matchesTo = tx.to.toLowerCase().includes(q);
        const matchesProg = tx.programme.toLowerCase().includes(q);
        return matchesId || matchesHash || matchesFrom || matchesTo || matchesProg;
      }

      return true;
    });
  }, [transactions, selectedType, selectedAgency, searchQuery]);


  const filtered = selectedType !== 'ALL' || selectedAgency !== 'ALL' || searchQuery;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Transaction history"
        actions={currentRole === 'auditor' && onOpenReport && (
          <button type="button" onClick={onOpenReport} className={`${LINK} min-h-11`}>
            Monitoring report →
          </button>
        )}
      />

      {/* One card: filters, then the ledger table under its ink header rule */}
      <section aria-label="Transactions" className={CARD}>
        <div role="search" aria-label="Filter transactions" className="px-6 pt-5 pb-2 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label htmlFor="tx-search" className={LABEL}>SEARCH</label>
              <div className="relative">
                <Search aria-hidden="true" className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                <input
                  id="tx-search"
                  type="text"
                  placeholder="Transaction ID, programme, entity or hash"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${INPUT} pl-9 pr-11`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-0 top-0 w-11 h-11 flex items-center justify-center text-muted hover:text-ink cursor-pointer"
                  >
                    <X aria-hidden="true" className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="tx-type" className={LABEL}>TYPE</label>
              <select id="tx-type" value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className={INPUT}>
                <option value="ALL">All transaction types</option>
                <option value="Fund Allocation">Fund allocation only</option>
                <option value="Fund Distribution">Fund distribution only</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="tx-agency" className={LABEL}>ENTITY</label>
              <select id="tx-agency" value={selectedAgency} onChange={(e) => setSelectedAgency(e.target.value)} className={INPUT}>
                <option value="ALL">All participating entities</option>
                {agencies.map((agency) => (
                  <option key={agency} value={agency}>
                    {agency}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 min-h-11">
            <span className="font-mono text-xs text-muted">
              SHOWING {filteredTransactions.length} OF {transactions.length} LEDGER TRANSACTIONS
            </span>
            {filtered && (
              <button
                type="button"
                onClick={() => {
                  setSelectedType('ALL');
                  setSelectedAgency('ALL');
                  setSearchQuery('');
                }}
                className={`${LINK} min-h-11`}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <DataTable
          full
          transactions={filteredTransactions}
          onView={onViewTransaction}
          emptyMessage="No transactions matched your search or filter criteria."
        />
      </section>
    </div>
  );
};
