# Mainstreet

> The credit bureau for AI agents.

Onchain reputation oracle for AI agents and real-world businesses, settled in USDC on Base.

- **Standard**: [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004)
- **Chain**: Base mainnet (8453)
- **Settlement**: USDC via [x402](https://www.x402.org/)
- **Operator wallet**: [`0xAC3ca7c5d3cDD7702fd08F9C4C28dAA22296aDa9`](https://basescan.org/address/0xAC3ca7c5d3cDD7702fd08F9C4C28dAA22296aDa9) on Base
- **Live agent card**: [`https://avisradar.app/.well-known/agent-card.json`](https://avisradar.app/.well-known/agent-card.json)
- **Live landing**: [`https://avisradar.app/mainstreet.html`](https://avisradar.app/mainstreet.html)

## Why

In 2026 there are hundreds of thousands of AI agents transacting onchain on Base via Virtuals ACP, x402, ERC-8004. Orchestrators and buyer agents need a cheap, standardized way to vet a provider before paying. Today, no oracle aggregates signals *across* surfaces. Mainstreet does.

## What it scores

Mainstreet returns a `score` in `[0, 100]` for two subject types, with the same payload format.

### `agent-onchain` (primary)

```
sampleConfidence = min(1, jobCount / 10)

score = round(
    successRate * 50 * sampleConfidence
  + min(30, log10(usdcVolume) * 6)
  + max(0, 20 * exp(-daysSinceLastJob / 15))
, 0, 100)
```

Inputs come from observable onchain activity:
- ERC-8004 ReputationRegistry feedback events (`0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` on Base)
- x402 facilitator settlement events (CDP)
- Virtuals ACP escrow completion events

### `business-google` (secondary)

```
score = round(
    (rating / 5) * 60
  + clamp(log10(reviewCount), 0, 4) * 10
, 0, 100)
```

For RWA underwriting agents that need to vet local businesses.

## Calibration

| Subject | Score |
|---|---|
| Top-tier agent (Ethy-like, 99% success, 500 jobs, $50k vol, active today) | 78 |
| Mid-tier active (85% success, 50 jobs, $3k vol, 3d ago) | 80 |
| Newbie agent (100% success, 2 jobs, $50 vol, today) | 20 |
| Ghost agent (90% success, 100 jobs, $10k vol, dormant 60d) | 69 |
| Mature high-rated commerce (4.5★, 2k reviews) | 87 |
| Newbie commerce (5★, 3 reviews) | 65 |

## Use it

### From an agent (via x402)

```
GET https://avisradar.app/api/agent/score/0x<address>
X-Payment: <x402 signature>  # max $0.05 USDC on Base
```

### Compute a score locally

```js
const { computeScoreAgent, buildAttestationPayload } = require('./oracle');

const score = computeScoreAgent({
  successRate: 0.95,
  jobCount: 120,
  usdcVolume: 12000,
  daysSinceLastJob: 1,
});
// → 87

const payload = buildAttestationPayload({
  subjectType: 'agent-onchain',
  agentAddress: '0x...',
  successRate: 0.95,
  jobCount: 120,
  usdcVolume: 12000,
  daysSinceLastJob: 1,
});
// → ERC-8004-shaped payload, ready to sign + submit
```

See [examples/](examples/) for more.

## ERC-8004 canonical registries (Base mainnet)

| Registry | Address |
|---|---|
| IdentityRegistry | [`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`](https://basescan.org/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432) |
| ReputationRegistry | [`0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`](https://basescan.org/address/0x8004BAa17C55a88189AE136b182e5fdA19dE9b63) |

Source: [github.com/erc-8004/erc-8004-contracts](https://github.com/erc-8004/erc-8004-contracts)

## Repository structure

```
oracle.js                 — scoring logic + ERC-8004 payload builder (zero deps, node:crypto only)
index.html                — landing page (deployed at avisradar.app/mainstreet.html)
SPEC.md                   — full design spec
DISTRIBUTION.md           — go-to-market playbook (x402 Bazaar, agentic.market, Virtuals ACP)
.well-known/
  agent-card.json         — ERC-8004 agent identity card
examples/
  basic-usage.js          — score computation examples
```

## Status

- [x] Scoring formula v1
- [x] ERC-8004-shaped payload builder
- [x] Agent card published
- [x] x402 paywall integration (in upstream avisradar repo)
- [ ] First settled paid query → x402 Bazaar indexation
- [ ] Onchain attestation publisher (signs and submits to ReputationRegistry)
- [ ] Virtuals ACP escrow event ingestion
- [ ] Public leaderboard

## Operator attestation

This project is operated by `0xAC3ca7c5d3cDD7702fd08F9C4C28dAA22296aDa9` on Base mainnet. Built with [Claude](https://claude.com/) (Opus 4.7) by [@philpof102-svg](https://github.com/philpof102-svg).

## License

MIT — see [LICENSE](LICENSE).
