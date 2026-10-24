import React from 'react';
import { Check } from 'lucide-react';
import { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { TypeTag } from './TypeTag';
import { BTN_ROW, THEAD_ROW, TH } from './styles';

// Ledger table. Rows render in the order given (callers pass newest first).
// `full` is the history view: programme sub-line, and the whole row opens details.
export const DataTable: React.FC<{
  transactions: Transaction[];
  onView: (tx: Transaction) => void;
  full?: boolean;
  emptyMessage?: string;
}> = ({ transactions, onView, full, emptyMessage = 'No transactions recorded yet.' }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[980px] border-collapse">
      <thead>
        <tr className={THEAD_ROW}>
          <th scope="col" className={`${TH} pl-6`}>TRANSACTION ID</th>
          <th scope="col" className={TH}>TYPE</th>
          <th scope="col" className={TH}>FROM</th>
          <th scope="col" className={TH}>TO</th>
          <th scope="col" className={`${TH} text-right`}>AMOUNT</th>
          <th scope="col" className={TH}>DATE</th>
          <th scope="col" className={TH}>STATUS</th>
          <th scope="col" className={`${TH} pr-6 text-right`}>ACTION</th>
        </tr>
      </thead>
      <tbody>
        {transactions.length === 0 && (
          <tr>
            <td colSpan={8} className="px-6 py-8 text-center text-muted">{emptyMessage}</td>
          </tr>
        )}
        {transactions.map((tx) => (
          <tr
            key={tx.id}
            onClick={full ? () => onView(tx) : undefined}
            className={`border-b border-divider ${full ? 'cursor-pointer hover:bg-page' : ''}`}
          >
            <td className="py-3 pl-6 pr-3 font-mono text-xs whitespace-nowrap">{tx.id}</td>
            <td className="p-3"><TypeTag type={tx.type} /></td>
            <td className="p-3 max-w-[200px]" title={tx.from}>
              <div className="truncate">{tx.from}</div>
              {full && <div className="text-xs text-muted truncate">{tx.programme}</div>}
            </td>
            <td className="p-3 max-w-[220px] truncate" title={tx.to}>{tx.to}</td>
            <td className="p-3 text-right font-semibold whitespace-nowrap">{formatCurrency(tx.amount)}</td>
            <td className="p-3 font-mono text-xs text-text-2 whitespace-nowrap">{formatDate(tx.date)}</td>
            <td className="p-3">
              <span className="inline-flex items-center gap-1 text-[13px]">
                {tx.status === 'Committed' && <Check aria-hidden="true" size={12} strokeWidth={3} />}
                {tx.status}
              </span>
            </td>
            <td className="py-2 pl-3 pr-6 text-right">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(tx);
                }}
                aria-label={`Details for ${tx.id}`}
                className={BTN_ROW}
              >
                Details
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
