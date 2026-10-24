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
} from '../types';
import { mockApi } from './mockApi';

// '/api' is proxied to Spring Boot by vite.config.ts in dev.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
// Mock by default in dev only, so a production build never silently ships fake data.
const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? String(import.meta.env.DEV)) === 'true';

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

const httpApi = {
  login: (req: LoginRequest) => post<AuthResponse>('/auth/login', req),
  register: (req: RegisterRequest) => post<AuthResponse>('/auth/register', req),
  getAllocations: () => request<Allocation[]>('/allocations'),
  getDistributions: () => request<Distribution[]>('/distributions'),
  getTransactions: () => request<Transaction[]>('/transactions'),
  createAllocation: (req: CreateAllocationRequest) => post<AllocationResult>('/allocations', req),
  createDistribution: (req: CreateDistributionRequest) => post<DistributionResult>('/distributions', req),
};

const impl: typeof httpApi = USE_MOCK ? mockApi : httpApi;

async function authenticate(pending: Promise<AuthResponse>) {
  const res = await pending;
  token = res.token;
  return res.user;
}

export const api = {
  ...impl,
  isMock: USE_MOCK,
  login: (req: LoginRequest) => authenticate(impl.login(req)),
  register: (req: RegisterRequest) => authenticate(impl.register(req)),
  logout: () => {
    token = null;
  },
};
