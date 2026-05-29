# Mainstreet API reference

Live base URL: `https://avisradar.app`

## `GET /api/agent/score/:agentAddress`

Returns a reputation score for an onchain AI agent.

**Path**
- `agentAddress` — 40-hex Ethereum address, with `0x` prefix.

**Auth** — one of:
- x402 USDC paywall on Base mainnet. Max recommended payment: `$0.05`.
- `X-Agent-Key: <key>` header (private partners).

**Response (200)**

```json
{
  "agentAddress": "0xabc...",
  "fetchedAt": "2026-05-30T00:00:00.000Z",
  "score": 78,
  "metrics": {
    "successRate": 0.99,
    "jobCount": 500,
    "usdcVolume": 50000,
    "daysSinceLastJob": 0
  },
  "sources": ["x402-merchant-discovery"],
  "degraded": false,
  "attestation": {
    "version": "mainstreet-v1",
    "chainId": 8453,
    "subjectType": "agent-onchain",
    "subject": "0xkeccak256hashedaddress...",
    "score": 78,
    "timestamp": 1780090821,
    "agentMetrics": { ... }
  },
  "meta": {
    "cacheTTL": "1h",
    "priceUSD": "0.05",
    "billedVia": "x402"
  },
  "cached": false
}
```

**Errors**
- `400` — invalid address format
- `401` — missing/invalid auth (api-key mode)
- `402` — x402 payment required (x402 mode)
- `500` — upstream data source failure

**Notes**
- Cache TTL: `1h`. Cached responses include `"cached": true`.
- When all data sources are unavailable, response has `"degraded": true` and `"score": null` instead of guessing.

---

## `GET /api/agent/snapshot/:placeId`

Returns a reputation snapshot for a real-world local business identified by its Google Place ID. Secondary product — designed for RWA underwriting agents.

**Path**
- `placeId` — Google Place ID, format `ChIJ...`.

**Query**
- `competitors` — comma-separated up to 3 Place IDs (optional).

**Response (200)**

```json
{
  "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
  "fetchedAt": "2026-05-30T00:00:00.000Z",
  "business": {
    "name": "Chez Léon",
    "rating": 4.2,
    "reviewCount": 1530,
    "recentReviews": [...]
  },
  "competitors": [...],
  "insights": {
    "summary": "...",
    "sentiment": { "score": 0.3, "label": "positive" },
    "alertLevel": "watch"
  },
  "meta": { ... },
  "cached": false
}
```

**Errors**
- `400` — invalid placeId format
- `401/402` — same as `/score`
- `500` — upstream Apify/Outscraper failure

**Notes**
- Cache TTL: `24h`. Reviews refresh once a day.

---

## `GET /api/agent/health`

Capability discovery. Public, no auth.

```json
{
  "service": "mainstreet-agent-api",
  "version": "0.2.0",
  "endpoints": [...],
  "x402": { "enabled": true },
  "erc8004": {
    "reputationRegistry": "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
    "chain": "eip155:8453"
  },
  "docs": "https://avisradar.app/mainstreet.html",
  "agentCard": "https://avisradar.app/.well-known/agent-card.json"
}
```

---

## `GET /.well-known/agent-card.json`

ERC-8004 identity card. Public, no auth.

Lists Mainstreet's skills, pricing, operator address, and the canonical ERC-8004 registries the project uses.

---

## Pricing summary

| Endpoint | Price | Cache |
|---|---|---|
| `/score/:agentAddress` | $0.05 USDC | 1h |
| `/snapshot/:placeId` | $0.10 USDC | 24h |
| `/health`, `/.well-known/agent-card.json` | free | n/a |

All settled via x402 facilitator on Base mainnet. Coinbase facilitator fee: 0% on USDC.
