import React, { useState } from 'react';
import { Allocation, User, Transaction } from '../types';
import { AVAILABLE_AGENCIES } from '../data/mockData';
import { formatCurrency, formatDate } from '../utils/formatters';
import { api } from '../services/api';
import { AlertCircle, Check, X } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { Modal } from './ui/Modal';
import {
  BTN_PRIMARY, BTN_SECONDARY, BTN_ROW, CARD, H2, INPUT, LABEL, NOTICE_ERROR, NOTICE_OK, SECTION_HEAD, TH, THEAD_ROW,
} from './ui/styles';

interface FundAllocationProps {
  currentUser: User;
  allocations: Allocation[];
  onAddAllocation: (allocation: Allocation, transaction: Transaction) => void;
  onViewTransactionDetails: (tx: Transaction) => void;
}

export const FundAllocation: React.FC<FundAllocationProps> = ({
  allocations,
  onAddAllocation,
  onViewTransactionDetails,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<string>('');
  const [successBanner, setSuccessBanner] = useState<{
    show: boolean;
    txId: string;
    blockNumber: number;
    programme: string;
    amount: number;
  } | null>(null);

  // Form State
  const [programme, setProgramme] = useState('');
  const [receivingAgency, setReceivingAgency] = useState(AVAILABLE_AGENCIES[0]);
  const [customAgency, setCustomAgency] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [supportingInfo, setSupportingInfo] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [formError, setFormError] = useState('');

  const targetAgency = receivingAgency === 'Other' ? customAgency : receivingAgency;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const parsedAmount = parseFloat(amount);
    if (!programme.trim()) {
      setFormError('Please enter a Programme or Purpose name.');
      return;
    }
    if (!targetAgency.trim()) {
      setFormError('Please specify the receiving Agency or NGO.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid allocation amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionStep('Submitting transaction proposal to Hyperledger Fabric endorsing peers...');
    try {
      const { allocation, transaction } = await api.createAllocation({
        programme: programme.trim(),
        receivingAgency: targetAgency.trim(),
        amount: parsedAmount,
        description: description.trim(),
        supportingInfo: supportingInfo.trim(),
        referenceNo: referenceNo.trim(),
      });
      onAddAllocation(allocation, transaction);

      setShowCreateModal(false);
      setSuccessBanner({
        show: true,
        txId: allocation.blockchainRecord.txId,
        blockNumber: allocation.blockchainRecord.blockNumber,
        programme: allocation.programme,
        amount: allocation.amount,
      });

      // Reset form
      setProgramme('');
      setAmount('');
      setDescription('');
      setSupportingInfo('');
      setReferenceNo('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to record allocation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);
  const closeForm = () => setShowCreateModal(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Government fund allocations"
        actions={
          <button
            type="button"
            onClick={() => {
              setSuccessBanner(null);
              setShowCreateModal(true);
            }}
            className={BTN_PRIMARY}
          >
            + Create fund allocation
          </button>
        }
      />

      {/* Success Notification Banner */}
      {successBanner && (
        <div role="status" className={NOTICE_OK}>
          <div className="flex items-start gap-3">
            <Check aria-hidden="true" size={16} strokeWidth={3} className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="font-semibold">Transaction validated and recorded.</span>
              <span className="text-[13px] text-text-2">
                The fund allocation for <span className="font-semibold text-ink">{successBanner.programme}</span> ({formatCurrency(successBanner.amount)}) has been endorsed and committed to the Hyperledger Fabric ledger.
              </span>            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            aria-label="Dismiss notice"
            className="w-11 h-11 shrink-0 flex items-center justify-center text-muted hover:text-ink cursor-pointer"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Allocation Records Table */}
      <section aria-labelledby="alc-h" className={CARD}>
        <div className={SECTION_HEAD}>
          <h2 id="alc-h" className={H2}>Official allocation records</h2>
          <span className="font-mono text-xs text-text-2">TOTAL {formatCurrency(totalAllocated)}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] border-collapse">
            <thead>
              <tr className={THEAD_ROW}>
                <th scope="col" className={`${TH} pl-6`}>ALLOCATION ID</th>
                <th scope="col" className={TH}>PROGRAMME / PURPOSE</th>
                <th scope="col" className={TH}>RECEIVING AGENCY / NGO</th>
                <th scope="col" className={`${TH} text-right`}>ALLOCATED</th>
                <th scope="col" className={`${TH} text-right`}>DISTRIBUTED</th>
                <th scope="col" className={`${TH} text-right`}>REMAINING</th>
                <th scope="col" className={TH}>DATE</th>
                <th scope="col" className={`${TH} pr-6 text-right`}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((item) => {
                const distPct = Math.round((item.distributedAmount / item.amount) * 100);
                return (
                  <tr key={item.id} className="border-b border-divider">
                    <td className="py-3 pl-6 pr-3 font-mono text-xs whitespace-nowrap">{item.id}</td>
                    <td className="p-3 max-w-[240px]">
                      <div className="font-semibold truncate" title={item.programme}>{item.programme}</div>
                      <div className="font-mono text-[11px] text-muted">{item.referenceNo}</div>
                    </td>
                    <td className="p-3 max-w-[220px] truncate" title={item.receivingAgency}>{item.receivingAgency}</td>
                    <td className="p-3 text-right font-semibold whitespace-nowrap">{formatCurrency(item.amount)}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="font-semibold">{formatCurrency(item.distributedAmount)}</div>
                      <div className="font-mono text-[11px] text-muted">{distPct}% OUT</div>
                    </td>
                    {/* Orange only while money is still waiting; a fully distributed row goes quiet. */}
                    <td className={`p-3 text-right font-semibold whitespace-nowrap ${item.remainingAmount > 0 ? 'text-remaining-text' : 'text-muted'}`}>
                      {formatCurrency(item.remainingAmount)}
                    </td>
                    <td className="p-3 font-mono text-xs text-text-2 whitespace-nowrap">{formatDate(item.allocatedDate)}</td>
                    <td className="py-2 pl-3 pr-6 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          const matchingTx: Transaction = {
                            id: `TX-ALC-${item.id.replace('ALC-', '')}`,
                            txHash: item.blockchainRecord.txId,
                            type: 'Fund Allocation',
                            from: item.allocatedBy,
                            to: item.receivingAgency,
                            amount: item.amount,
                            date: item.allocatedDate,
                            status: 'Committed',
                            programme: item.programme,
                            description: item.description,
                            referenceNo: item.referenceNo,
                            blockchainRecord: item.blockchainRecord,
                          };
                          onViewTransactionDetails(matchingTx);
                        }}
                        aria-label={`Inspect ${item.id}`}
                        className={BTN_ROW}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* CREATE FUND ALLOCATION MODAL */}
      {showCreateModal && (
        <Modal
          titleId="create-allocation-title"
          title="Create fund allocation"
          onClose={isSubmitting ? undefined : closeForm}
          width="max-w-2xl"
          footer={<>
            <span />
            <span className="flex flex-wrap gap-2">
              <button type="button" onClick={closeForm} disabled={isSubmitting} className={BTN_SECONDARY}>
                Cancel
              </button>
              {/* Lives in the modal footer, outside <form>, so it targets the form by id */}
              <button type="submit" form="create-allocation-form" disabled={isSubmitting} className={BTN_PRIMARY}>
                Submit &amp; commit to Fabric
              </button>
            </span>
          </>}
        >
          <form id="create-allocation-form" onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
            {formError && (
              <div role="alert" className={NOTICE_ERROR}>
                <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label htmlFor="alc-programme" className={LABEL}>PROGRAMME / PURPOSE *</label>
              <input
                id="alc-programme"
                type="text"
                required
                placeholder="e.g. National Monsoon Flood Relief Fund 2026"
                value={programme}
                onChange={(e) => setProgramme(e.target.value)}
                disabled={isSubmitting}
                className={INPUT}
              />
            </div>

            <div>
              <label htmlFor="alc-agency" className={LABEL}>RECEIVING AGENCY OR NGO *</label>
              <select
                id="alc-agency"
                value={receivingAgency}
                onChange={(e) => setReceivingAgency(e.target.value)}
                disabled={isSubmitting}
                className={INPUT}
              >
                {AVAILABLE_AGENCIES.map((agency) => (
                  <option key={agency} value={agency}>
                    {agency}
                  </option>
                ))}
                <option value="Other">Other (specify manually)</option>
              </select>

              {receivingAgency === 'Other' && (
                <input
                  type="text"
                  required
                  aria-label="Agency or NGO legal title"
                  placeholder="Enter full agency or NGO legal title"
                  value={customAgency}
                  onChange={(e) => setCustomAgency(e.target.value)}
                  disabled={isSubmitting}
                  className={`${INPUT} mt-2`}
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="alc-amount" className={LABEL}>AMOUNT (MYR) *</label>
                <div className="relative">
                  <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted font-semibold">RM</span>
                  <input
                    id="alc-amount"
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    placeholder="5000000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isSubmitting}
                    className={`${INPUT} pl-10 font-mono`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="alc-ref" className={LABEL}>WARRANT REFERENCE NO.</label>
                <input
                  id="alc-ref"
                  type="text"
                  placeholder="e.g. MOF/WAR/2026/0104"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  disabled={isSubmitting}
                  className={`${INPUT} font-mono`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="alc-desc" className={LABEL}>DESCRIPTION</label>
              <textarea
                id="alc-desc"
                rows={2}
                placeholder="Detail the mandatory scope, allocation parameters, and terms of utilization..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                className={`${INPUT} py-2`}
              />
            </div>

            <div>
              <label htmlFor="alc-support" className={LABEL}>SUPPORTING INFORMATION</label>
              <input
                id="alc-support"
                type="text"
                placeholder="e.g. Cabinet Approval Memo CAB/2026/42, National Budget Annex 3"
                value={supportingInfo}
                onChange={(e) => setSupportingInfo(e.target.value)}
                disabled={isSubmitting}
                className={INPUT}
              />
            </div>

            {isSubmitting && (
              <div role="status" className="p-3 border border-border-control bg-page flex flex-col gap-1">
                <span className="font-semibold text-[13px]">Hyperledger Fabric endorsement in progress</span>
                <span className="font-mono text-[11px] text-text-2">{submissionStep}</span>
              </div>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
};
