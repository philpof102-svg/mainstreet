// TypeScript declarations for the MainStreet SDK.

export interface ConfigureOpts {
  origin?: string;
}

export interface SettlementStats {
  count: number;
  volumeUsdc: number;
}

export interface SlaStats {
  samples: number;
  okRate: number | null;
  latencyP50ms: number | null;
  latencyP95ms: number | null;
  avgLatencyMs: number | null;
  note: string | null;
}

export interface ScoreMetrics {
  successRate: number | null;
  jobCount: number | null;
  usdcVolume: number | null;
  daysSinceLastJob: number | null;
  /** Real on-chain USDC settlements aggregated for this address (when available). */
  settlements?: SettlementStats | null;
  /** Endpoint SLA samples (health probe latency + ok rate). */
  sla?: SlaStats | null;
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

export interface TagEntry { tag: string; count: number; }
export interface TagsResponse { version: string; count: number; tags: TagEntry[]; }
export interface TaggedAgent {
  payTo: string;
  description: string | null;
  score: number | null;
  jobCount: number | null;
  tags: string[];
}
export interface TaggedResponse { version: string; tag: string; count: number; results: TaggedAgent[]; }

export interface WebhookSubscribeOpts {
  subscriberAddr: string;
  watchAddr: string;
  webhookUrl: string;
  thresholdDelta?: number;
}
export interface WebhookSubscribeResponse { version: string; ok: boolean; message: string; checkUrl: string; }
export interface WebhookSubscription {
  id: number;
  watch_addr: string;
  webhook_url: string;
  threshold_delta: number;
  last_score: number | null;
  last_notified_at: string | null;
  paid_until: string | null;
  created_at: string;
}
export interface WebhookListResponse { version: string; count: number; subscriptions: WebhookSubscription[]; }

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
export function tags(): Promise<TagsResponse>;
export function tagged(tag: string, limit?: number): Promise<TaggedResponse>;
export function subscribeWebhook(opts: WebhookSubscribeOpts): Promise<WebhookSubscribeResponse>;
export function listWebhooks(subscriberAddr: string): Promise<WebhookListResponse>;

export interface MatchOpts {
  intent: string;
  maxPrice?: string | number;
  minScore?: number;
  limit?: number;
}
export interface MatchEntry {
  payTo: string;
  score: number | null;
  matchScore: number;
  description: string | null;
  serviceUrl: string | null;
  price: { amountRaw: string; amountUsdc: number; asset: string } | null;
  jobCount: number | null;
  successRate: number | null;
  settlements: SettlementStats | null;
  sla: SlaStats | null;
  callExample: string;
  verify: string;
}
export interface MatchResponse {
  version: string;
  intent: string;
  tokens: string[];
  stems: string[];
  filters: { minScore: number; maxPrice: number | null; limit: number };
  count: number;
  matches: MatchEntry[];
  noStrongMatch: boolean;
  note: string | null;
}
export function match(opts: MatchOpts | string): Promise<MatchResponse>;
export function pick(opts: MatchOpts | string, options?: { allowWeak?: boolean }): Promise<MatchEntry>;

export interface ReceiptInput {
  buyerAddr: string;
  agentAddr: string;
  txHash: string;
  success: boolean;
  message: string;
  signature: string;
  latencyMs?: number;
  rating?: number;
  comment?: string;
}
export function postReceipt(input: ReceiptInput): Promise<{ ok: true; id: number }>;
export function receipts(forAddress: string, limit?: number): Promise<any>;

export interface WatchInput {
  subscriberAddr: string;
  watchAddr: string;
  message: string;
  signature: string;
}
export function addWatch(input: WatchInput): Promise<{ ok: true }>;
export function watchlist(subscriberAddr: string): Promise<{ count: number; addresses: string[] }>;
