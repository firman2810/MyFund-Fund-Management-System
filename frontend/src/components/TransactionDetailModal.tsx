import React, { useState } from 'react';
import { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Check, Copy } from 'lucide-react';
import { Modal } from './ui/Modal';
import { TypeTag } from './ui/TypeTag';
import { BTN_PRIMARY, EYEBROW, LINK } from './ui/styles';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

// One cell of a hairline field grid.
const Field: React.FC<{ label: string; wide?: boolean; children: React.ReactNode }> = ({ label, wide, children }) => (
  <div className={`bg-surface px-4 py-3 flex flex-col gap-1 min-w-0 ${wide ? 'sm:col-span-2' : ''}`}>
    <dt className="font-mono text-[11px] text-muted">{label}</dt>
    <dd className="m-0 min-w-0 break-words">{children}</dd>
  </div>
);

const FIELD_GRID = 'm-0 grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border';

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!transaction) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const rec = transaction.blockchainRecord;

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
      <div className="p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
        {/* SECTION 1: Normal Transaction Information */}
        <section aria-labelledby="tx-info-h" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h4 id="tx-info-h" className={`m-0 font-normal ${EYEBROW}`}>GENERAL TRANSACTION INFORMATION</h4>
            <span className="inline-flex items-center gap-1 text-[13px]">
              {transaction.status === 'Committed' && <Check aria-hidden="true" size={12} strokeWidth={3} />}
              {transaction.status}
            </span>
          </div>

          <dl className={FIELD_GRID}>
            <Field label="TRANSACTION ID"><span className="font-mono text-xs">{transaction.id}</span></Field>
            <Field label="TYPE"><TypeTag type={transaction.type} /></Field>
            <Field label="FROM (DISBURSING ENTITY)"><span className="font-semibold">{transaction.from}</span></Field>
            <Field label="TO (RECIPIENT / BENEFICIARY)"><span className="font-semibold">{transaction.to}</span></Field>
            <Field label="AMOUNT">
              <span className="text-xl font-semibold tracking-[-0.02em]">{formatCurrency(transaction.amount)}</span>
            </Field>
            <Field label="DATE & TIMESTAMP"><span className="font-mono text-xs">{formatDate(transaction.date)}</span></Field>
            <Field label="PROGRAMME / PURPOSE" wide><span className="font-semibold">{transaction.programme}</span></Field>
            {transaction.description && (
              <Field label="DESCRIPTION & SCOPE" wide>
                <span className="text-[13px] text-text-2">{transaction.description}</span>
              </Field>
            )}
            {transaction.referenceNo && (
              <Field label="SUPPORTING REFERENCE NO." wide>
                <span className="font-mono text-xs">{transaction.referenceNo}</span>
              </Field>
            )}
          </dl>
        </section>

        {/* SECTION 2: Secondary Section: Blockchain Record */}
        <section aria-labelledby="tx-chain-h" className="flex flex-col gap-3">
          <h4 id="tx-chain-h" className={`m-0 font-normal ${EYEBROW}`}>BLOCKCHAIN RECORD</h4>

          <dl className={FIELD_GRID}>
            <Field label="NETWORK">{rec.network || 'Hyperledger Fabric'}</Field>
            <Field label="CHANNEL"><span className="font-mono text-xs">{rec.channel}</span></Field>
            <Field label="CHAINCODE"><span className="font-mono text-xs">{rec.chaincode}</span></Field>
            <Field label="BLOCK NUMBER"><span className="font-mono text-xs">#{rec.blockNumber}</span></Field>
            <Field label="TRANSACTION ID (FABRIC TXID)" wide>
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-[11px] break-all">{rec.txId}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(rec.txId, 'txId')}
                  aria-label="Copy Fabric transaction ID"
                  className={`${LINK} inline-flex items-center gap-1 shrink-0 min-h-9`}
                >
                  {copiedKey === 'txId' ? (
                    <><Check aria-hidden="true" size={12} strokeWidth={3} /><span>Copied</span></>
                  ) : (
                    <><Copy aria-hidden="true" className="w-3 h-3" /><span>Copy TxID</span></>
                  )}
                </button>
              </div>
            </Field>
            <Field label="LEDGER STATUS"><span className="font-mono text-xs">{rec.ledgerStatus}</span></Field>
            <Field label="ENDORSEMENT POLICY"><span className="font-mono text-xs">{rec.endorsementPolicy}</span></Field>
          </dl>
        </section>
      </div>
    </Modal>
  );
};
