/**
 * MainStreet SDK — JS client for the MainStreet reputation oracle.
 *
 * Zero deps (uses native fetch — Node 18+, browsers, Bun, Deno).
 * Same module works in CJS and ESM via index.js + index.mjs (mjs re-exports this).
 *
 * Quick start:
 *   const ms = require('@raskhaaa/mainstreet-oracle/sdk');
 *   const { score, alive } = await ms.score('0x2bb72231eed303cc91a462a1fa738b42b6a9ac6d');
 *   // → { score: 53, alive: true, description: 'Polymarket prediction market data and AI signals', ... }
 *
 *   const top = await ms.leaderboard({ limit: 10, network: 'base' });
 *   const head = await ms.compare(addrA, addrB);
 *   const same = await ms.recommend(addrA);
 *
 * Configure base URL:
 *   ms.configure({ origin: 'https://your-mirror.example' });
 */

const DEFAULT_ORIGIN = 'https://avisradar-production.up.railway.app';
let _origin = DEFAULT_ORIGIN;

function configure(opts) {
  if (opts?.origin) _origin = String(opts.origin).replace(/\/$/, '');
}

async function call(path, init) {
  if (typeof fetch !== 'function') throw new Error('fetch is not available — Node 18+ or polyfill required');
  const url = _origin + path;
  const r = await fetch(url, init);
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    const err = new Error(`MainStreet API ${r.status}: ${text.slice(0, 120)}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

function requireAddr(addr) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr || '')) throw new Error('invalid address: expected 0x + 40 hex chars');
  return addr.toLowerCase();
}

const sdk = {
  configure,
  origin: () => _origin,

  /**
   * GET /api/agent/score/{address}
   * @param {string} address — 0x + 40 hex
   * @param {{live?: boolean}} [opts]
   * @returns {Promise<{score, metrics, health, resourcePath, ...}>}
   */
  async score(address, opts) {
    const addr = requireAddr(address);
    const live = opts?.live ? '?live=1' : '';
    return call(`/api/agent/score/${addr}${live}`);
  },

  /**
   * GET /api/agent/leaderboard
   * @param {{limit?: number, network?: string, ecosystem?: string, sparkline?: boolean}} [opts]
   */
  async leaderboard(opts = {}) {
    const params = new URLSearchParams();
    if (opts.limit != null) params.set('limit', String(opts.limit));
    if (opts.network) params.set('network', opts.network);
    if (opts.ecosystem) params.set('ecosystem', opts.ecosystem);
    if (opts.sparkline) params.set('sparkline', '1');
    const q = params.toString();
    return call('/api/agent/leaderboard' + (q ? '?' + q : ''));
  },

  /** GET /api/agent/compare?a=&b= */
  async compare(a, b) {
    return call(`/api/agent/compare?a=${requireAddr(a)}&b=${requireAddr(b)}`);
  },

  /** GET /api/agent/movers?limit= */
  async movers(limit = 5) {
    return call('/api/agent/movers?limit=' + limit);
  },

  /** GET /api/agent/featured — Selection of the Week */
  async featured() {
    return call('/api/agent/featured');
  },

  /** GET /api/agent/trending?limit= — 7d gainers */
  async trending(limit = 10) {
    return call('/api/agent/trending?limit=' + limit);
  },

  /** GET /api/agent/search?q=&limit= */
  async search(query, limit = 10) {
    if (!query || query.length < 2) throw new Error('query must be at least 2 chars');
    return call('/api/agent/search?q=' + encodeURIComponent(query) + '&limit=' + limit);
  },

  /** GET /api/agent/recommend?for=&limit= */
  async recommend(forAddress, limit = 5) {
    return call('/api/agent/recommend?for=' + requireAddr(forAddress) + '&limit=' + limit);
  },

  /** GET /api/agent/history/{address}?days= */
  async history(address, days = 30) {
    return call(`/api/agent/history/${requireAddr(address)}?days=${days}`);
  },

  /** GET /api/agent/health-summary */
  async healthSummary() {
    return call('/api/agent/health-summary');
  },

  /** GET /api/agent/me */
  async me() {
    return call('/api/agent/me');
  },

  /** GET /api/agent/badges */
  async badges() {
    return call('/api/agent/badges');
  },

  /** GET /api/agent/random?network= */
  async random(network) {
    return call('/api/agent/random' + (network ? '?network=' + network : ''));
  },

  /**
   * POST /api/agent/badge/claim
   * @param {{address: string, message: string, signature: string, displayName?: string, website?: string}} payload
   */
  async claimBadge(payload) {
    if (!payload?.address || !payload?.message || !payload?.signature) {
      throw new Error('claimBadge requires { address, message, signature }');
    }
    return call('/api/agent/badge/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Helper: vet an agent against threshold + alive gate before paying.
   * Throws if it fails any gate.
   */
  async vet(address, { minScore = 30, requireAlive = true } = {}) {
    const d = await this.score(address);
    if (d.score == null || d.score < minScore) throw new Error(`score ${d.score} < ${minScore}`);
    if (requireAlive && d.health && d.health.alive === false) throw new Error('endpoint unreachable');
    if (!d.resourcePath) throw new Error('no service URL published');
    return d; // safe to use
  },

  /** GET /api/agent/tags — top 100 tags across all indexed agents */
  async tags() { return call('/api/agent/tags'); },

  /** GET /api/agent/tags/:tag — agents matching a tag */
  async tagged(tag, limit = 50) {
    if (!tag || typeof tag !== 'string') throw new Error('tag must be a non-empty string');
    return call(`/api/agent/tags/${encodeURIComponent(tag)}?limit=${limit}`);
  },

  /**
   * POST /api/agent/webhook/subscribe — subscribe to score-change alerts
   * @param {{subscriberAddr: string, watchAddr: string, webhookUrl: string, thresholdDelta?: number}} opts
   */
  async subscribeWebhook(opts) {
    if (!opts?.subscriberAddr || !opts?.watchAddr || !opts?.webhookUrl) {
      throw new Error('subscribeWebhook requires { subscriberAddr, watchAddr, webhookUrl }');
    }
    return call('/api/agent/webhook/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
  },

  /** GET /api/agent/webhook/list?for=0x... — list webhook subscriptions */
  async listWebhooks(subscriberAddr) {
    if (!subscriberAddr) throw new Error('subscriberAddr required');
    return call(`/api/agent/webhook/list?for=${encodeURIComponent(subscriberAddr)}`);
  },

  /**
   * POST /api/agent/match — intent-based agent routing in 1 call
   * @param {string|object} intent — plain text OR { intent, maxPrice?, minScore?, limit? }
   */
  async match(intent) {
    const body = typeof intent === 'string' ? { intent } : intent;
    if (!body?.intent) throw new Error('match requires { intent } or a string');
    return call('/api/agent/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  /**
   * POST /api/agent/receipt — post buyer-signed feedback after settlement.
   * @param {object} payload — { buyerAddr, agentAddr, success, message, signature, ...optional }
   */
  async postReceipt(payload) {
    if (!payload?.buyerAddr || !payload?.agentAddr || payload.success == null || !payload.message || !payload.signature) {
      throw new Error('postReceipt requires { buyerAddr, agentAddr, success, message, signature }');
    }
    return call('/api/agent/receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  /** GET /api/agent/receipts?for=0x... — public receipt feed for an agent */
  async receipts(agentAddress) {
    return call('/api/agent/receipts?for=' + requireAddr(agentAddress));
  },

  /**
   * POST /api/agent/watchlist — wallet-signed watchlist entry
   * @param {object} payload — { subscriberAddr, watchAddr, label?, thresholdDelta?, message, signature }
   */
  async addWatch(payload) {
    if (!payload?.subscriberAddr || !payload?.watchAddr || !payload?.message || !payload?.signature) {
      throw new Error('addWatch requires { subscriberAddr, watchAddr, message, signature }');
    }
    return call('/api/agent/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  /** GET /api/agent/watchlist?for=0x... — list watched agents */
  async watchlist(subscriberAddr) {
    return call('/api/agent/watchlist?for=' + requireAddr(subscriberAddr));
  },
};

module.exports = sdk;
module.exports.default = sdk;
