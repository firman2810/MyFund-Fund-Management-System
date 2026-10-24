import {
  Allocation,
  AllocationResult,
  AuthResponse,
  BlockchainRecord,
  CreateAllocationRequest,
  CreateDistributionRequest,
  Distribution,
  DistributionResult,
  LoginRequest,
  RegisterRequest,
  Transaction,
  User,
} from '../types';
import {
  MOCK_USERS,
  INITIAL_ALLOCATIONS,
  INITIAL_DISTRIBUTIONS,
  buildInitialTransactions,
} from '../data/mockData';
import { formatCurrency, generateTxHash } from '../utils/formatters';

// In-memory stand-in for the Spring Boot API so the UI runs without a backend (VITE_USE_MOCK=true).
const allocations: Allocation[] = [...INITIAL_ALLOCATIONS];
const distributions: Distribution[] = [...INITIAL_DISTRIBUTIONS];
const transactions: Transaction[] = buildInitialTransactions(allocations, distributions);
let currentUser: User = MOCK_USERS.ministry;

const delay = <T>(value: T, ms = 300) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

const nowLocal = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

function fabricRecord(blockNumber: number, endorsementPolicy: string): BlockchainRecord {
  return {
    network: 'Hyperledger Fabric v2.5 LTS',
    channel: 'myfund-channel',
    chaincode: 'fund_cc:v1.2',
    blockNumber,
    txId: generateTxHash(),
    ledgerStatus: 'COMMITTED_VALID',
    endorsementPolicy,
    timestamp: new Date().toISOString(),
    payloadHash: `sha256:${generateTxHash()}`,
  };
}

function signIn(user: User): Promise<AuthResponse> {
  currentUser = user;
  return delay({ token: `mock-token-${user.id}`, user }, 280);
}

export const mockApi = {
  login: (req: LoginRequest) => signIn(MOCK_USERS[req.role]),

  register: (req: RegisterRequest) =>
    signIn({
      id: req.id,
      name: req.name,
      role: req.role,
      organization: req.organization,
      designation:
        req.role === 'ministry'
          ? 'Ministry Allocation Officer'
          : req.role === 'agency'
            ? 'Authorized Disbursing Officer'
            : 'Statutory Compliance Auditor',
      department: req.organization,
    }),

  getAllocations: () => delay([...allocations]),
  getDistributions: () => delay([...distributions]),
  getTransactions: () => delay([...transactions]),

  createAllocation(req: CreateAllocationRequest): Promise<AllocationResult> {
    const id = `ALC-2026-0${allocations.length + 5}`;
    const referenceNo = req.referenceNo || `MOF/WAR/2026/0${100 + allocations.length}`;
    const date = nowLocal();
    const allocation: Allocation = {
      id,
      programme: req.programme,
      receivingAgency: req.receivingAgency,
      amount: req.amount,
      distributedAmount: 0,
      remainingAmount: req.amount,
      description: req.description || 'Official ministerial fund allocation approved under national treasury warrants.',
      supportingInfo: req.supportingInfo || `Ministry Allocation Warrant Ref: ${referenceNo}`,
      referenceNo,
      allocatedBy: currentUser.organization || 'Ministry of Finance & Treasury',
      allocatedDate: date,
      blockchainRecord: fabricRecord(160 + allocations.length * 2, "AND('MinistryMSP.peer', 'AuditorMSP.peer')"),
    };
    const transaction: Transaction = {
      id: `TX-ALC-${id.replace('ALC-', '')}`,
      txHash: allocation.blockchainRecord.txId,
      type: 'Fund Allocation',
      from: allocation.allocatedBy,
      to: allocation.receivingAgency,
      amount: allocation.amount,
      date,
      status: 'Committed',
      programme: allocation.programme,
      description: allocation.description,
      referenceNo,
      blockchainRecord: allocation.blockchainRecord,
    };
    allocations.unshift(allocation);
    transactions.unshift(transaction);
    return delay({ allocation, transaction }, 1200);
  },

  async createDistribution(req: CreateDistributionRequest): Promise<DistributionResult> {
    const index = allocations.findIndex((a) => a.id === req.allocationId);
    const source = allocations[index];
    if (!source) throw new Error('Allocation not found.');
    if (req.amount <= 0 || req.amount > source.remainingAmount) {
      throw new Error(`Amount exceeds remaining allocation balance (${formatCurrency(source.remainingAmount)}).`);
    }

    const id = `DST-2026-0${distributions.length + 7}`;
    const date = nowLocal();
    const distribution: Distribution = {
      id,
      allocationId: source.id,
      programmeName: source.programme,
      agencyName: currentUser.organization || source.receivingAgency,
      beneficiaryName: req.beneficiaryName,
      beneficiaryId: req.beneficiaryId || `BEN-2026-00${distributions.length + 10}`,
      amount: req.amount,
      description: req.description || 'Direct beneficiary distribution under approved ministry allocation.',
      distributedDate: date,
      blockchainRecord: fabricRecord(175 + distributions.length * 2, "AND('AgencyMSP.peer', 'AuditorMSP.peer')"),
    };
    const allocation: Allocation = {
      ...source,
      distributedAmount: source.distributedAmount + req.amount,
      remainingAmount: source.remainingAmount - req.amount,
    };
    const transaction: Transaction = {
      id: `TX-DST-${id.replace('DST-', '')}`,
      txHash: distribution.blockchainRecord.txId,
      type: 'Fund Distribution',
      from: distribution.agencyName,
      to: `${distribution.beneficiaryName} (${distribution.beneficiaryId})`,
      amount: distribution.amount,
      date,
      status: 'Committed',
      programme: distribution.programmeName,
      description: distribution.description,
      referenceNo: id,
      blockchainRecord: distribution.blockchainRecord,
    };
    allocations[index] = allocation;
    distributions.unshift(distribution);
    transactions.unshift(transaction);
    return delay({ distribution, allocation, transaction }, 1200);
  },
};
