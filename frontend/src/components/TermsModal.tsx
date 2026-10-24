import React from 'react';
import { Check } from 'lucide-react';
import { Modal } from './ui/Modal';
import { BTN_PRIMARY } from './ui/styles';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const H4 = 'm-0 mb-1 font-semibold text-[15px] text-ink';

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <Modal
      titleId="terms-title"
      title="Terms & conditions of portal access"
      onClose={onClose}
      footer={<>
        <span />
        <button type="button" onClick={onClose} className={BTN_PRIMARY}>I understand &amp; agree</button>
      </>}
    >
      <div className="p-6 flex flex-col gap-4 text-[13px] text-text-2 max-h-[70vh] overflow-y-auto leading-relaxed">
        <div className="p-3 border-[1.5px] border-ink text-ink flex items-start gap-2">
          <Check aria-hidden="true" size={14} strokeWidth={3} className="shrink-0 mt-1" />
          <p className="m-0">
            By accessing the MyFund / Public Fund Verification system, you acknowledge that all fund allocations and disbursements are recorded to an immutable Hyperledger Fabric ledger.
          </p>
        </div>

        <div>
          <h4 className={H4}>1. Authorized institutional use</h4>
          <p className="m-0">
            Access to this system is restricted to vetted personnel of the Federal Treasury, accredited executing agencies (such as NADMA, MRCS, KEMAS), and statutory audit authorities. Credentials must not be shared.
          </p>
        </div>

        <div>
          <h4 className={H4}>2. Cryptographic immutability</h4>
          <p className="m-0">
            Every transaction submitted through this portal requires cryptographic peer endorsement under defined multi-party policies. Once committed to a ledger block, records cannot be altered, forged, or deleted.
          </p>
        </div>

        <div>
          <h4 className={H4}>3. Accountability &amp; audit trail</h4>
          <p className="m-0">
            All allocation requests, beneficiary distributions, and approval timestamps are permanently preserved for statutory scrutiny by the National Audit Department.
          </p>
        </div>

        <div>
          <h4 className={H4}>4. Data protection &amp; beneficiary privacy</h4>
          <p className="m-0">
            Personal details of welfare recipients are handled strictly in compliance with applicable public data governance and statutory welfare regulations.
          </p>
        </div>
      </div>
    </Modal>
  );
};
