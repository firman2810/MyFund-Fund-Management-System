import {
  Allocation,
  AllocationResult,
  AuthResponse,
  CreateAllocationRequest,
  CreateDistributionRequest,
  Distribution,
  DistributionResult,
  LoginRequest,
  RegisterRequest,
  Transaction,
  VerificationResult,
} from '../types';

// '/api' is proxied to Spring Boot by vite.config.ts in dev.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

let token: string | null = null;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE_URL + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || `Request failed (${res.status})`);
  return body as T;
}

const post = <T>(path: string, data: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(data) });

async function authenticate(pending: Promise<AuthResponse>) {
  const res = await pending;
  token = res.token;
  return res.user;
}

export const api = {
  login: (req: LoginRequest) => authenticate(post<AuthResponse>('/auth/login', req)),
  register: (req: RegisterRequest) => authenticate(post<AuthResponse>('/auth/register', req)),
  logout: () => {
    token = null;
  },
  getAllocations: () => request<Allocation[]>('/allocations'),
  getDistributions: () => request<Distribution[]>('/distributions'),
  getTransactions: () => request<Transaction[]>('/transactions'),
  getVerification: () => request<VerificationResult>('/verification'),
  createAllocation: (req: CreateAllocationRequest) => post<AllocationResult>('/allocations', req),
  createDistribution: (req: CreateDistributionRequest) => post<DistributionResult>('/distributions', req),
};
