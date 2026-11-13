import React, { useEffect, useRef, useState } from 'react';
import { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Check } from 'lucide-react';
import { Modal } from './ui/Modal';
import { TypeTag } from './ui/TypeTag';
import { BTN_PRIMARY, BTN_ROW, EYEBROW, LINK } from './ui/styles';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

// Label beside value from sm; stacked on phones, where a 9rem label column would squeeze the TxID into 8-character lines.
const FACTS = 'm-0 grid grid-cols-1 gap-y-1 sm:grid-cols-[9rem_1fr] sm:gap-x-4 sm:gap-y-2';
const DT = 'font-mono text-[11px] text-muted tracking-[0.04em] not-first:mt-2 sm:not-first:mt-0';

// Body follows the Dashboard popover order (ui/LedgerEntry): amount → parties → programme → date, then the ledger proof.
// Labels appear only where a value is ambiguous on its own.
export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
}) => {
  const [copied, setCopied] = useState<string | null>(null); // 'txId' | 'hash' | 'err:txId' | 'err:hash'
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!transaction) return null;

  const copy = (text: string, key: string) => {
    const show = (state: string) => {
      setCopied(state);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(null), 2000);
    };
    // Report what actually happened: clipboard access can be refused (permissions, insecure context).
    navigator.clipboard.writeText(text).then(() => show(key), () => show(`err:${key}`));
  };
  const copyLabel = (key: string) => (copied === key ? 'Copied' : copied === `err:${key}` ? 'Copy failed' : 'Copy');
  const announced = copied?.startsWith('err:') ? 'Copy failed' : copied ? 'Copied to clipboard' : '';

  const rec = transaction.blockchainRecord;
  const isAlc = transaction.type === 'Fund Allocation';
  const showDescription = !!transaction.description && transaction.description !== transaction.programme;
  const committed = formatDate(rec.timestamp);

  return (
    <Modal
      titleId="modal-title"
      title="Transaction details"
      onClose={onClose}
      width="max-w-2xl"
      footer={<>
        <span />
        <button type="button" onClick={onClose} className={BTN_PRIMARY}>Close</button>
      </>}
    >
      <div className="px-6 py-5 flex flex-col gap-5">
        {/* 1. Lead: what moved, how much, between whom */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs">{transaction.id}</span>
              <TypeTag type={transaction.type} />
            </span>
            <span className="inline-flex items-center gap-1 text-[13px] text-ink">
              {transaction.status === 'Committed' && <Check aria-hidden="true" size={12} strokeWidth={3} />}
              {transaction.status}
            </span>
          </div>
          <span className="text-[30px] font-semibold tracking-[-0.02em] tabular-nums leading-tight">
            {formatCurrency(transaction.amount)}
          </span>
          <span className="text-[15px] text-ink [text-wrap:balance]">
            {transaction.from} → {transaction.to}
          </span>
        </div>

        {/* 2. Purpose */}
        <div className="border-t border-border pt-4 flex flex-col gap-1">
          <span className="text-base font-semibold leading-[1.3]">{transaction.programme}</span>
          {/* 15px lead size (DESIGN.md §3): this is prose, not a caption */}
          {showDescription && <p className="m-0 text-[15px] leading-[1.6] text-text-2 max-w-[62ch]">{transaction.description}</p>}
        </div>

        {/* 3. Facts. A distribution's reference is its own ID, so only allocations show one. The beneficiary ID
            stays inside "to" ("name (id)"): Transaction has no separate field for it. */}
        <dl className={FACTS}>
          <dt className={DT}>Date</dt>
          <dd className="m-0 text-[13px]">{formatDate(transaction.date)}</dd>
          {isAlc && transaction.referenceNo && (
            <>
              <dt className={DT}>Reference</dt>
              <dd className="m-0 text-[13px] font-mono break-all">{transaction.referenceNo}</dd>
            </>
          )}
        </dl>

        {/* 4. Ledger proof: visible; the constant plumbing is folded into Technical details */}
        <div className="border-t-[1.5px] border-ink pt-4 flex flex-col gap-3">
          <h3 id="tx-proof-h" className={`m-0 font-normal ${EYEBROW}`}>LEDGER PROOF</h3>
          <p className="m-0 text-[13px] text-text-2">
            Recorded in block #{rec.blockNumber}. Signed off by the {isAlc ? 'Ministry' : 'Agency'} and the Auditor.
            {committed !== formatDate(transaction.date) && <> Committed {committed}.</>}
          </p>
          <dl className={FACTS}>
            <dt className={DT}>Fabric TxID</dt>
            <dd className="m-0 flex items-start justify-between gap-3 min-w-0">
              <span className="font-mono text-xs break-all">{rec.txId}</span>
              <button type="button" onClick={() => copy(rec.txId, 'txId')} className={`${BTN_ROW} min-h-11 shrink-0`}>
                {copyLabel('txId')}
              </button>
            </dd>
          </dl>
          <span aria-live="polite" className="sr-only">{announced}</span>

          <details>
            <summary className={`${LINK} inline-flex items-center min-h-11 list-none [&::-webkit-details-marker]:hidden`}>
              Technical details
            </summary>
            <dl className={`${FACTS} pt-1`}>
              <dt className={DT}>Network</dt>
              <dd className="m-0 font-mono text-xs">{rec.network || 'Hyperledger Fabric'}</dd>
              <dt className={DT}>Channel</dt>
              <dd className="m-0 font-mono text-xs">{rec.channel}</dd>
              <dt className={DT}>Chaincode</dt>
              <dd className="m-0 font-mono text-xs">{rec.chaincode}</dd>
              <dt className={DT}>Endorsement policy</dt>
              <dd className="m-0 font-mono text-xs break-all">{rec.endorsementPolicy}</dd>
              <dt className={DT}>Ledger status</dt>
              <dd className="m-0 font-mono text-xs">{rec.ledgerStatus}</dd>
              <dt className={DT}>Payload hash</dt>
              <dd className="m-0 flex items-start justify-between gap-3 min-w-0">
                <span className="font-mono text-xs break-all">{rec.payloadHash}</span>
                <button type="button" onClick={() => copy(rec.payloadHash, 'hash')} className={`${BTN_ROW} min-h-11 shrink-0`}>
                  {copyLabel('hash')}
                </button>
              </dd>
            </dl>
          </details>
        </div>
      </div>
    </Modal>
  );
};
