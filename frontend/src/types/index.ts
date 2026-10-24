export type UserRole = 'ministry' | 'agency' | 'auditor';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  organization: string;
  designation: string;
  department: string;
}

export interface BlockchainRecord {
  network: string;
  channel: string;
  chaincode: string;
  blockNumber: number;
  txId: string;
  ledgerStatus: 'COMMITTED_VALID' | 'COMMITTED_INVALID';
  endorsementPolicy: string;
  timestamp: string;
  payloadHash: string;
}

export interface Allocation {
  id: string;
  programme: string;
  receivingAgency: string;
  amount: number;
  distributedAmount: number;
  remainingAmount: number;
  description: string;
  supportingInfo: string;
  referenceNo: string;
  allocatedBy: string;
  allocatedDate: string;
  blockchainRecord: BlockchainRecord;
}

export interface Distribution {
  id: string;
  allocationId: string;
  programmeName: string;
  agencyName: string;
  beneficiaryName: string;
  beneficiaryId: string;
  amount: number;
  description: string;
  distributedDate: string;
  blockchainRecord: BlockchainRecord;
}

export interface Transaction {
  id: string;
  txHash: string;
  type: 'Fund Allocation' | 'Fund Distribution';
  from: string;
  to: string;
  amount: number;
  date: string;
  status: 'Committed' | 'Pending' | 'Rejected';
  programme: string;
  description: string;
  referenceNo: string;
  blockchainRecord: BlockchainRecord;
}

// ---- API contract (request/response bodies exchanged with the Spring Boot backend) ----

export interface LoginRequest {
  identifier: string;
  password: string;
  role: UserRole;
}

export interface RegisterRequest {
  id: string;
  name: string;
  role: UserRole;
  organization: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreateAllocationRequest {
  programme: string;
  receivingAgency: string;
  amount: number;
  description: string;
  supportingInfo: string;
  referenceNo: string;
}

export interface CreateDistributionRequest {
  allocationId: string;
  beneficiaryName: string;
  beneficiaryId: string;
  amount: number;
  description: string;
}

export interface AllocationResult {
  allocation: Allocation;
  transaction: Transaction;
}

export interface DistributionResult {
  distribution: Distribution;
  allocation: Allocation;
  transaction: Transaction;
}
