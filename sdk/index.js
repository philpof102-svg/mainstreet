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
 *
 * Configure default headers (merged into every request). Useful so internal /
 * monitoring callers can exclude their own traffic from the public adoption
 * metric (/api/agent/usage):
 *   ms.configure({ headers: { 'x-ms-monitor': '1' } });
 */

const DEFAULT_ORIGIN = 'https://avisradar-production.up.railway.app';
let _origin = DEFAULT_ORIGIN;
let _headers = {};

function configure(opts) {
  if (opts?.origin) _origin = String(opts.origin).replace(/\/$/, '');
  // Default headers merged into every request (e.g. { 'x-ms-monitor': '1' } so
  // internal/monitoring traffic is excluded from /api/agent/usage). Pass
  // { headers: null } to clear.
  if (opts && 'headers' in opts) {
    _headers = opts.headers && typeof opts.headers === 'object' ? { ..._headers, ...opts.headers } : {};
  }
}

async function call(path, init) {
  if (typeof fetch !== 'function') throw new Error('fetch is not available — Node 18+ or polyfill required');
  const url = _origin + path;
  // Merge configured default headers under any per-call init.headers (per-call wins).
  const merged = (Object.keys(_headers).length || (init && init.headers))
    ? { ...init, headers: { ..._headers, ...(init && init.headers) } }
    : init;
  const r = await fetch(url, merged);
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
   * Convenience: returns the single best match for an intent.
   * Throws if no agent matches (lets you `await ms.pick(...)` straight into a call).
   * Pass options.allowWeak=true to accept noStrongMatch results.
   * @param {string|object} intent
   * @param {{ allowWeak?: boolean }} [options]
   */
  async pick(intent, options = {}) {
    const body = typeof intent === 'string' ? { intent, limit: 1 } : { ...intent, limit: 1 };
    const r = await this.match(body);
    if (!r.matches?.length) throw new Error(`pick: no agent matched "${body.intent}"`);
    if (r.noStrongMatch && !options.allowWeak) {
      throw new Error(`pick: only weak match for "${body.intent}" (top matches ${r.matches[0].matchScore}/${r.tokens.length} tokens). Pass {allowWeak:true} to accept.`);
    }
    return r.matches[0];
  },

  /**
   * Build the canonical message buyer agents must sign before posting a receipt.
   * Sign locally with viem `account.signMessage({ message })` then pass to `postReceipt`.
   *
   *   const message = ms.buildReceiptMessage({ buyerAddr, agentAddr, txHash, success: true });
   *   const signature = await account.signMessage({ message });
   *   await ms.postReceipt({ buyerAddr, agentAddr, txHash, success: true, message, signature });
   *
   * @param {{buyerAddr: string, agentAddr: string, txHash?: string, success: boolean, latencyMs?: number, rating?: number, comment?: string}} opts
   * @returns {string} canonical message
   */
  buildReceiptMessage(opts) {
    if (!opts?.buyerAddr || !opts?.agentAddr || opts.success == null) {
      throw new Error('buildReceiptMessage requires { buyerAddr, agentAddr, success }');
    }
    const lines = [
      'MainStreet receipt',
      'buyer: ' + opts.buyerAddr.toLowerCase(),
      'agent: ' + opts.agentAddr.toLowerCase(),
      'success: ' + (opts.success ? 'true' : 'false'),
    ];
    if (opts.txHash) lines.push('txHash: ' + opts.txHash);
    if (opts.latencyMs != null) lines.push('latencyMs: ' + opts.latencyMs);
    if (opts.rating != null) lines.push('rating: ' + opts.rating);
    if (opts.comment) lines.push('comment: ' + String(opts.comment).slice(0, 280));
    lines.push('timestamp=' + Date.now());
    return lines.join('\n');
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
