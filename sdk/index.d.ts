// TypeScript declarations for the MainStreet SDK.

export interface ConfigureOpts {
  origin?: string;
}

export interface ScoreMetrics {
  successRate: number | null;
  jobCount: number | null;
  usdcVolume: number | null;
  daysSinceLastJob: number | null;
}

export interface Health {
  alive: boolean;
  status: number | null;
  probedAt: string | null;
}

export interface Price {
  amount: string;
  asset: string;
  network: string;
}

export interface ScoreResponse {
  agentAddress: string;
  score: number | null;
  metrics: ScoreMetrics;
  description: string | null;
  resourcePath: string | null;
  price: Price | null;
  health: Health | null;
  source: string;
  snapshotDate: string | null;
  billed: 'free' | 'paid';
}

export interface LeaderboardOpts {
  limit?: number;
  network?: 'base' | 'solana' | 'polygon' | 'all' | string;
  ecosystem?: string;
  sparkline?: boolean;
}

export interface AgentRow {
  payTo: string;
  description: string | null;
  score: number | null;
  metrics: ScoreMetrics;
  resourcePath: string | null;
  ecosystem: string;
  network: string;
  sparkline7d?: { snapshot_date: string; score: number | null }[];
}

export interface LeaderboardResponse {
  version: string;
  network: string;
  generatedAt: string;
  count: number;
  totalIndexed: number;
  networkBreakdown: Record<string, number>;
  results: AgentRow[];
}

export interface CompareResponse {
  version: string;
  a: any;
  b: any;
  winner: 'a' | 'b' | 'tie' | null;
  margin: number | null;
  recommendation: string;
}

export function configure(opts: ConfigureOpts): void;
export function origin(): string;
export function score(address: string, opts?: { live?: boolean }): Promise<ScoreResponse>;
export function leaderboard(opts?: LeaderboardOpts): Promise<LeaderboardResponse>;
export function compare(a: string, b: string): Promise<CompareResponse>;
export function movers(limit?: number): Promise<any>;
export function featured(): Promise<any>;
export function trending(limit?: number): Promise<any>;
export function search(query: string, limit?: number): Promise<any>;
export function recommend(forAddress: string, limit?: number): Promise<any>;
export function history(address: string, days?: number): Promise<any>;
export function healthSummary(): Promise<any>;
export function me(): Promise<any>;
export function badges(): Promise<any>;
export function random(network?: string): Promise<any>;
export function claimBadge(payload: { address: string; message: string; signature: string; displayName?: string; website?: string }): Promise<{ ok: true; address: string; badgeUrl: string; embed: string }>;
export function vet(address: string, opts?: { minScore?: number; requireAlive?: boolean }): Promise<ScoreResponse>;
