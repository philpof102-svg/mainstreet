# Mainstreet — ERC-8004 reputation attestations on Base

> *Wall Street meets Main Street: we score the local businesses Wall Street wants to lend to.*

**Status** : design + scaffold. Activation gated by dedicated wallet provisioning.

Mainstreet is a spin-off product of AvisRadar. AvisRadar produces the underlying Google review data; Mainstreet is the on-chain delivery layer for that data, targeted at DeFi RWA lenders and agent buyers.

## Why this exists

Real-world asset (RWA) lending protocols on Base (Goldfinch, Centrifuge, Maple, etc) lend USDC to physical businesses. Their underwriting agents need a **verifiable, machine-readable** signal of business reputation — currently they manually scrape Google or rely on opaque private data.

AvisRadar already produces this data daily for our paying customers. Mainstreet publishes aggregate scores on-chain as ERC-8004 attestations, becoming a **reputation oracle** that any agent or smart contract can consume permissionlessly.

## Economic model

| Reader | Endpoint | Pricing |
|---|---|---|
| Anyone | `GET /api/agent/leaderboard` | **free** (24h cache) |
| Anyone | `GET /api/agent/score/{addr}` | **free** (24h cache snapshot) |
| Anyone | `GET /api/agent/score/{addr}?live=1` | **$0.05 USDC** via x402 (fresh fetch + ERC-8004 re-read) |
| Anyone | `GET /api/agent/snapshot/{placeId}` (business) | **$0.10 USDC** via x402 |
| Smart contract | direct read of ERC-8004 ReputationRegistry | gas only — public good |
| Agent owner | `POST /api/agent/badge/claim` (EIP-191 sig) | **free** — embeddable SVG with live score |

The moat is the **aggregation pipeline** (Bazaar + ERC-8004 + planned ACP), the **score formula**, and the **distribution surface** (public leaderboard + embeddable badges). Reads are public goods, fresh deltas and write-flows are paywalled.

## Live endpoints (Base mainnet)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/agent/score/{address}` | none | Cached score 0-100. Add `?live=1` for fresh fetch via x402 ($0.05). |
| GET | `/api/agent/snapshot/{placeId}` | x402 ($0.10) | Google review snapshot + up to 3 competitors. |
| GET | `/api/agent/leaderboard` | none | Top agents ranked by activity. Supports `?ecosystem=&limit=&sparkline=1`. ETag-cacheable. |
| GET | `/api/agent/badge/{addr}.svg` | none | Embeddable SVG with live score. |
| POST | `/api/agent/badge/claim` | EIP-191 sig | Claim a badge for your agent address (24h anti-replay). |
| GET | `/api/agent/me` | none | Proof of life: operator, MAIN token, ERC-8004 registries, repos, metrics. |
| GET | `/api/agent/status` | none | x402 init state + cache TTLs. |
| GET | `/api/agent/health` | none | Capability discovery (list of endpoints with auth/price). |

## Architecture

```
┌──────────────────────────────────────────────┐
│ AvisRadar pipeline (existing, daily cron)    │
│  → fetchReviews(placeId)                     │
│  → analyze() produces structured data        │
└────────────────┬─────────────────────────────┘
                 │
                 ▼ (new)
┌──────────────────────────────────────────────┐
│ Reputation Oracle Publisher                  │
│  → compute(score, hash, timestamp)           │
│  → sign with OPERATOR_PRIVATE_KEY            │
│  → submit to ERC-8004 ReputationRegistry     │
│     on Base mainnet                          │
└────────────────┬─────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────┐
│ On-chain                                     │
│  ReputationRegistry @ 0x...                  │
│  attestation(placeIdHash) → {score, ts, sig} │
└──────────────────────────────────────────────┘
```

## ERC-8004 mapping

ERC-8004 defines three registries: Identity, Reputation, Validation. We use:

- **IdentityRegistry** : AvisRadar registers ONCE as agent `0xAvisRadar...` with metadata pointing to `https://avisradar.app/.well-known/agent-card.json`.
- **ReputationRegistry** : we publish attestations *about other agents/entities*. Each attestation = `(subject=keccak256(placeId), score, timestamp, signature)`.
- **ValidationRegistry** : skipped for v1.

## Score formulas (v1) — dual subjectType

Mainstreet scores two distinct subject categories with the same 0-100 output range and same ERC-8004 payload structure, so on-chain consumers can compare scores meaningfully across categories.

### `business-google` (subjectType)

```
score = round(
  (rating / 5) * 60                          // 0-60: stars
  + clamp(log10(reviewCount), 0, 4) * 10     // 0-40: volume
, 0, 100)
```

### `agent-onchain` (subjectType)

```
sampleConfidence = min(1, jobCount / 10)     // dampens score for <10 jobs

score = round(
    successRate * 50 * sampleConfidence      // 0-50: success rate, weighted by sample
  + min(30, log10(usdcVolume) * 6)           // 0-30: volume in USDC processed
  + max(0, 20 * exp(-daysSinceLastJob / 15)) // 0-20: recency decay (~15-day half-life)
, 0, 100)
```

Inputs come from observable onchain activity: ERC-8004 ReputationRegistry feedback events, x402 settlement events on the CDP facilitator, Virtuals ACP escrow completion events.

### Calibration examples

| Subject | Score |
|---|---|
| Mature high-rated commerce (4.5★, 2k reviews) | 87 |
| Newbie commerce (5★, 3 reviews) | 65 |
| Top agent (Ethy-like, 99% success, 500 jobs, $50k vol, active today) | 78 |
| Mid agent (85% success, 50 jobs, $3k vol, 3d ago) | 80 |
| Newbie agent (100% success, 2 jobs, $50 vol, today) | 20 |
| Ghost agent (90% success, 100 jobs, $10k vol, dormant 60d) | 69 |

## Files in this scaffold

| File | Status | Purpose |
|---|---|---|
| `src/mainstreet/oracle.js` | scaffold | Score compute + payload signing |
| `src/mainstreet/publisher.js` | not yet | Submits signed payload to ERC-8004 registry contract |
| `contracts/ReputationRegistry.sol` | not yet | Minimal ERC-8004 registry, Base mainnet |
| `public/.well-known/agent-card.json` | not yet | Agent identity metadata (per ERC-8004) |

## Activation prerequisites

1. **Dedicated Mainstreet Operator wallet** on Base mainnet, funded with ~$5 ETH for gas.
   - MUST NOT be the founder's main wallet (airdrop / personal funds exposure).
   - Created via `npx awal auth login operator@mainstreet.app` (Coinbase CDP managed) **or** a fresh EOA whose private key is stored in Railway env (`OPERATOR_PRIVATE_KEY`).
2. ERC-8004 registry contract address on Base (use the canonical deployment when available, else deploy our own minimal registry).
3. `agent-card.json` published at `https://avisradar.app/.well-known/agent-card.json`.

## Risk notes (read before activating)

- **Attestation immutability** : once published, an attestation cannot be retracted. Bug in score formula = on-chain artifact forever.
- **Gas exposure** : at 100 attestations/day × ~50k gas × $0.001/gas-unit on Base ≈ $5/day max. Cap with a daily attestation limit.
- **Signature replay** : include `chainId` + `nonce` in the signed payload. The scaffold does this.
- **Subject identification** : we hash `placeId` (not store it raw on-chain) for privacy and to keep gas low.

## Next concrete steps (when wallet is ready)

1. Deploy or identify ERC-8004 registry on Base mainnet.
2. Publish `agent-card.json`.
3. Register AvisRadar in IdentityRegistry (one-shot tx).
4. Enable daily publisher job — start with our 2 existing paying customers (consent first).
5. List the oracle on agentic.market with read URL.
