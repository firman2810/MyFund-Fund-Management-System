import React, { useState } from 'react';
import { Allocation, Distribution, User, Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { api } from '../services/api';
import { AlertCircle, Check, X } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { Modal } from './ui/Modal';
import {
  BTN_PRIMARY, BTN_SECONDARY, BTN_ROW, CARD, H2, INPUT, LABEL, NOTICE_ERROR, NOTICE_OK, SECTION_HEAD, TH, THEAD_ROW,
} from './ui/styles';

interface FundDistributionProps {
  currentUser: User;
  allocations: Allocation[];
  distributions: Distribution[];
  onAddDistribution: (distribution: Distribution, updatedAllocation: Allocation, transaction: Transaction) => void;
  onViewTransactionDetails: (tx: Transaction) => void;
}

export const FundDistribution: React.FC<FundDistributionProps> = ({
  allocations,
  distributions,
  onAddDistribution,
  onViewTransactionDetails,
}) => {
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedAllocationId, setSelectedAllocationId] = useState<string>('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState('');
  const [successBanner, setSuccessBanner] = useState<{
    show: boolean;
    txId: string;
    blockNumber: number;
    beneficiary: string;
    amount: number;
  } | null>(null);

  // Filter allocations that have remaining balance
  const activeAllocations = allocations.filter((a) => a.remainingAmount > 0);
  const currentSelectedAllocation = allocations.find((a) => a.id === selectedAllocationId) || activeAllocations[0];

  const handleOpenRecord = (preselectedAllocationId?: string) => {
    if (preselectedAllocationId) {
      setSelectedAllocationId(preselectedAllocationId);
    } else if (activeAllocations.length > 0) {
      setSelectedAllocationId(activeAllocations[0].id);
    }
    setBeneficiaryName('');
    setBeneficiaryId('');
    setAmount('');
    setDescription('');
    setFormError('');
    setShowRecordModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!currentSelectedAllocation) {
      setFormError('Please select a valid Fund Allocation.');
      return;
    }

    if (!beneficiaryName.trim()) {
      setFormError('Please specify the Beneficiary Name or Entity.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid disbursement amount greater than 0.');
      return;
    }

    if (parsedAmount > currentSelectedAllocation.remainingAmount) {
      setFormError(
        `Disbursement amount (${formatCurrency(parsedAmount)}) exceeds available remaining allocation balance (${formatCurrency(currentSelectedAllocation.remainingAmount)}).`
      );
      return;
    }

    setIsSubmitting(true);
    setSubmissionStep('Endorsing peer transaction: AgencyMSP + AuditorMSP validation...');
    try {
      const { distribution, allocation, transaction } = await api.createDistribution({
        allocationId: currentSelectedAllocation.id,
        beneficiaryName: beneficiaryName.trim(),
        beneficiaryId: beneficiaryId.trim(),
        amount: parsedAmount,
        description: description.trim(),
      });
      onAddDistribution(distribution, allocation, transaction);

      setShowRecordModal(false);
      setSuccessBanner({
        show: true,
        txId: distribution.blockchainRecord.txId,
        blockNumber: distribution.blockchainRecord.blockNumber,
        beneficiary: distribution.beneficiaryName,
        amount: distribution.amount,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to record distribution.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeForm = () => setShowRecordModal(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Fund distribution to beneficiaries"
        actions={
          <button type="button" onClick={() => handleOpenRecord()} className={BTN_PRIMARY}>
            + Record distribution
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
                Distribution of <span className="font-semibold text-ink">{formatCurrency(successBanner.amount)}</span> to beneficiary <span className="font-semibold text-ink">{successBanner.beneficiary}</span> has been verified and committed to Hyperledger Fabric.
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

      {/* Section 1: Available Allocated Funds */}
      <section aria-labelledby="avail-h" className={CARD}>
        <div className={SECTION_HEAD}>
          <h2 id="avail-h" className={H2}>Allocated funds available for distribution</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className={THEAD_ROW}>
                <th scope="col" className={`${TH} pl-6`}>ALLOCATION ID</th>
                <th scope="col" className={TH}>PROGRAMME / PURPOSE</th>
                <th scope="col" className={TH}>RECEIVING AGENCY</th>
                <th scope="col" className={`${TH} text-right`}>ALLOCATED</th>
                <th scope="col" className={`${TH} text-right`}>DISTRIBUTED</th>
                <th scope="col" className={`${TH} text-right`}>REMAINING</th>
                <th scope="col" className={`${TH} pr-6 text-right`}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((item) => {
                const hasBalance = item.remainingAmount > 0;
                return (
                  <tr key={item.id} className="border-b border-divider">
                    <td className="py-3 pl-6 pr-3 font-mono text-xs whitespace-nowrap">{item.id}</td>
                    <td className="p-3 max-w-[260px]">
                      <div className="font-semibold truncate" title={item.programme}>{item.programme}</div>
                      <div className="font-mono text-[11px] text-muted">{item.referenceNo}</div>
                    </td>
                    <td className="p-3 max-w-[220px] truncate" title={item.receivingAgency}>{item.receivingAgency}</td>
                    <td className="p-3 text-right font-semibold whitespace-nowrap">{formatCurrency(item.amount)}</td>
                    <td className="p-3 text-right font-semibold whitespace-nowrap">{formatCurrency(item.distributedAmount)}</td>
                    <td className={`p-3 text-right font-semibold whitespace-nowrap ${hasBalance ? 'text-remaining-text' : 'text-muted'}`}>
                      {formatCurrency(item.remainingAmount)}
                    </td>
                    <td className="py-2 pl-3 pr-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenRecord(item.id)}
                        disabled={!hasBalance}
                        aria-label={`Disburse from ${item.id}`}
                        className={`${BTN_ROW} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        + Disburse
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Distribution Records Table */}
      <section aria-labelledby="dst-h" className={CARD}>
        <div className={SECTION_HEAD}>
          <h2 id="dst-h" className={H2}>Beneficiary distribution records</h2>
          <span className="font-mono text-xs text-text-2 flex items-center gap-1.5">
            <span aria-hidden="true" className="w-2 h-2 bg-distributed" />
            DISBURSED {formatCurrency(distributions.reduce((s, d) => s + d.amount, 0))}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className={THEAD_ROW}>
                <th scope="col" className={`${TH} pl-6`}>DISTRIBUTION ID</th>
                <th scope="col" className={TH}>BENEFICIARY</th>
                <th scope="col" className={TH}>PROGRAMME</th>
                <th scope="col" className={TH}>DISTRIBUTING AGENCY</th>
                <th scope="col" className={`${TH} text-right`}>AMOUNT</th>
                <th scope="col" className={TH}>DATE</th>
                <th scope="col" className={`${TH} pr-6 text-right`}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {distributions.map((dst) => (
                <tr key={dst.id} className="border-b border-divider">
                  <td className="py-3 pl-6 pr-3 font-mono text-xs whitespace-nowrap">{dst.id}</td>
                  <td className="p-3 max-w-[220px]">
                    <div className="font-semibold truncate" title={dst.beneficiaryName}>{dst.beneficiaryName}</div>
                    <div className="font-mono text-[11px] text-muted">{dst.beneficiaryId}</div>
                  </td>
                  <td className="p-3 max-w-[200px] truncate" title={dst.programmeName}>{dst.programmeName}</td>
                  <td className="p-3 max-w-[200px] truncate" title={dst.agencyName}>{dst.agencyName}</td>
                  <td className="p-3 text-right font-semibold whitespace-nowrap">{formatCurrency(dst.amount)}</td>
                  <td className="p-3 font-mono text-xs text-text-2 whitespace-nowrap">{formatDate(dst.distributedDate)}</td>
                  <td className="py-2 pl-3 pr-6 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        const matchingTx: Transaction = {
                          id: `TX-DST-${dst.id.replace('DST-', '')}`,
                          txHash: dst.blockchainRecord.txId,
                          type: 'Fund Distribution',
                          from: dst.agencyName,
                          to: `${dst.beneficiaryName} (${dst.beneficiaryId})`,
                          amount: dst.amount,
                          date: dst.distributedDate,
                          status: 'Committed',
                          programme: dst.programmeName,
                          description: dst.description,
                          referenceNo: dst.id,
                          blockchainRecord: dst.blockchainRecord,
                        };
                        onViewTransactionDetails(matchingTx);
                      }}
                      aria-label={`Inspect ${dst.id}`}
                      className={BTN_ROW}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* RECORD DISTRIBUTION MODAL */}
      {showRecordModal && (
        <Modal
          titleId="record-distribution-title"
          title="Record fund distribution"
          onClose={isSubmitting ? undefined : closeForm}
          width="max-w-2xl"
          footer={<>
            <span />
            <span className="flex flex-wrap gap-2">
              <button type="button" onClick={closeForm} disabled={isSubmitting} className={BTN_SECONDARY}>
                Cancel
              </button>
              {/* Lives in the modal footer, outside <form>, so it targets the form by id */}
              <button type="submit" form="record-distribution-form" disabled={isSubmitting} className={BTN_PRIMARY}>
                Submit &amp; commit distribution
              </button>
            </span>
          </>}
        >
          <form id="record-distribution-form" onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
            {formError && (
              <div role="alert" className={NOTICE_ERROR}>
                <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label htmlFor="dst-alloc" className={LABEL}>FUND ALLOCATION PROGRAMME *</label>
              <select
                id="dst-alloc"
                value={selectedAllocationId}
                onChange={(e) => setSelectedAllocationId(e.target.value)}
                disabled={isSubmitting}
                className={INPUT}
              >
                {allocations.map((alc) => (
                  <option key={alc.id} value={alc.id}>
                    {alc.programme} (Balance: {formatCurrency(alc.remainingAmount)})
                  </option>
                ))}
              </select>

              {currentSelectedAllocation && (
                <div className="mt-2 px-3 py-2 border border-border flex flex-wrap justify-between gap-2 font-mono text-xs text-text-2">
                  <span>CEILING {formatCurrency(currentSelectedAllocation.amount)}</span>
                  <span className="text-remaining-text">LEFT {formatCurrency(currentSelectedAllocation.remainingAmount)}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="dst-name" className={LABEL}>BENEFICIARY ENTITY / NAME *</label>
                <input
                  id="dst-name"
                  type="text"
                  required
                  placeholder="e.g. Hulu Langat Flood Relief Committee"
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  disabled={isSubmitting}
                  className={INPUT}
                />
              </div>

              <div>
                <label htmlFor="dst-id" className={LABEL}>BENEFICIARY ID / REG NO.</label>
                <input
                  id="dst-id"
                  type="text"
                  placeholder="e.g. NGO-SEL-2026-092"
                  value={beneficiaryId}
                  onChange={(e) => setBeneficiaryId(e.target.value)}
                  disabled={isSubmitting}
                  className={`${INPUT} font-mono`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="dst-amount" className={LABEL}>DISTRIBUTION AMOUNT (MYR) *</label>
              <div className="relative">
                <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted font-semibold">RM</span>
                <input
                  id="dst-amount"
                  type="number"
                  min="100"
                  step="100"
                  max={currentSelectedAllocation ? currentSelectedAllocation.remainingAmount : undefined}
                  required
                  placeholder="250000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isSubmitting}
                  className={`${INPUT} pl-10 font-mono`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="dst-desc" className={LABEL}>DESCRIPTION / PURPOSE OF DISTRIBUTION *</label>
              <textarea
                id="dst-desc"
                rows={3}
                required
                placeholder="Specify goods, vouchers, or direct financial support provided to the beneficiary..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                className={`${INPUT} py-2`}
              />
            </div>

            {isSubmitting && (
              <div role="status" className="p-3 border border-border-control bg-page flex flex-col gap-1">
                <span className="font-semibold text-[13px]">Hyperledger Fabric endorsement &amp; commit</span>
                <span className="font-mono text-[11px] text-text-2">{submissionStep}</span>
              </div>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
};
