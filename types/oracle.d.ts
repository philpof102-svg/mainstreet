// TypeScript declarations for Mainstreet oracle.
// Lets TS consumers import the JS module with full type checking.

export type SubjectType = 'agent-onchain' | 'business-google';

export interface AgentMetrics {
  successRate: number | null;
  usdcVolume: number | null;
  daysSinceLastJob: number | null;
  jobCount?: number | null;
}

export interface BusinessMetrics {
  rating: number | null;
  reviewCount: number | null;
}

export interface AgentSnapshotInput extends AgentMetrics {
  subjectType?: 'agent-onchain';
  agentAddress?: string;
  agentId?: string;
  fetchedAt?: string;
}

export interface BusinessSnapshotInput extends BusinessMetrics {
  subjectType?: 'business-google';
  placeId: string;
  fetchedAt?: string;
}

export interface AttestationPayload {
  version: 'mainstreet-v1';
  chainId: 8453;
  subjectType: SubjectType;
  subject: string;
  score: number;
  timestamp: number;
  operator: string | null;
  nonce: number | null;
  agentMetrics?: AgentMetrics;
  businessMetrics?: BusinessMetrics;
}

export interface AttestationCtx {
  operatorAddress?: string;
  nonce?: number;
}

export interface AttestResult {
  payload: AttestationPayload;
  signature: string | null;
  ready: boolean;
  error?: string;
}

export interface Erc8004Registries {
  identityRegistry: string;
  reputationRegistry: string;
}

export const SUBJECT_TYPES: {
  BUSINESS_GOOGLE: 'business-google';
  AGENT_ONCHAIN: 'agent-onchain';
};

export const ORACLE_VERSION: 'mainstreet-v1';
export const BASE_MAINNET_CHAIN_ID: 8453;
export const ERC_8004_BASE: Erc8004Registries;

export function computeScoreBusiness(snapshot: BusinessMetrics): number;
export function computeScoreAgent(metrics: AgentMetrics): number;
export function computeScore(
  subject: (BusinessSnapshotInput | AgentSnapshotInput) & { subjectType?: SubjectType }
): number;
export function hashSubject(identifier: string): string;
export function buildAttestationPayload(
  snapshot: AgentSnapshotInput | BusinessSnapshotInput,
  ctx?: AttestationCtx
): AttestationPayload;
export function attest(
  snapshot: AgentSnapshotInput | BusinessSnapshotInput
): Promise<AttestResult>;
