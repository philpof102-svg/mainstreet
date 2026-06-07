# MainStreet

[![CI](https://github.com/philpof102-svg/mainstreet/actions/workflows/ci.yml/badge.svg)](https://github.com/philpof102-svg/mainstreet/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Standard: ERC-8004](https://img.shields.io/badge/standard-ERC--8004-blue)](https://eips.ethereum.org/EIPS/eip-8004)
[![Chain: Base](https://img.shields.io/badge/chain-Base-0052ff)](https://base.org)
[![Payments: x402](https://img.shields.io/badge/payments-x402-green)](https://www.x402.org/)
[![MAIN token: Sourcify verified](https://img.shields.io/badge/MAIN%20token-Sourcify%20full__match-3fb950)](https://sourcify.dev/#/lookup/0xb3f9760f1f1e75ba01574d98b52e4455f19e93fe)
[![Live leaderboard](https://img.shields.io/badge/leaderboard-live-1f6feb)](https://avisradar-production.up.railway.app/leaderboard.html)
[![Tests](https://img.shields.io/badge/tests-21%2F21-3fb950)](test/oracle.test.js)
[![npm](https://img.shields.io/npm/v/@raskhaaa/mainstreet-oracle?label=npm&color=cb3837)](https://www.npmjs.com/package/@raskhaaa/mainstreet-oracle)
[![Downloads](https://img.shields.io/npm/dm/@raskhaaa/mainstreet-oracle?color=cb3837)](https://www.npmjs.com/package/@raskhaaa/mainstreet-oracle)
[![Version](https://img.shields.io/badge/version-0.9.2-blue)](CHANGELOG.md)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0.3-orange)](https://avisradar-production.up.railway.app/api/agent/openapi.json)
[![Agents indexed](https://img.shields.io/endpoint?url=https%3A%2F%2Favisradar-production.up.railway.app%2Fapi%2Fagent%2Fshield%2Findexed.json)](https://avisradar-production.up.railway.app/leaderboard.html)
[![Endpoints alive](https://img.shields.io/endpoint?url=https%3A%2F%2Favisradar-production.up.railway.app%2Fapi%2Fagent%2Fshield%2Falive.json)](https://avisradar-production.up.railway.app/stats.html)
[![Badges claimed](https://img.shields.io/endpoint?url=https%3A%2F%2Favisradar-production.up.railway.app%2Fapi%2Fagent%2Fshield%2Fbadges.json)](https://avisradar-production.up.railway.app/leaderboard.html)

> Reputation for onchain AI agents. **GitHub stars + Reddit karma, but signed.**

## Discovery surfaces (June 2026)

- **CDP Bazaar** — listed at [api.cdp.coinbase.com/platform/v2/x402/discovery/merchant?payTo=0xAC3ca7c5d3cDD7702fd08F9C4C28dAA22296aDa9](https://api.cdp.coinbase.com/platform/v2/x402/discovery/merchant?payTo=0xAC3ca7c5d3cDD7702fd08F9C4C28dAA22296aDa9) (5 paid endpoints indexed)
- **MCP Registry** — `io.github.philpof102-svg/mainstreet` at [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io/v0/servers?search=mainstreet)
- **Basename** — [mainstreetxyz.base.eth](https://www.base.org/name/mainstreetxyz) with 12 onchain text records (agent, x402.payTo, erc8004.agentId, mcp.npm, x402.catalog…)
- **ERC-8004 IdentityRegistry** — agentId `53953` on Base
- **.well-known/agent.json** — A2A discovery card with full identity block + 9 paid endpoints
- **Integration snippets** — [avisradar.app/integrations.html](https://avisradar-production.up.railway.app/integrations.html) (Claude / Cursor / LangChain / Vercel AI / AccountKit / curl / npm)

## Use it from Claude / Cursor / Windsurf in 1 line

**Via MCP registry** (Claude Desktop, ~/.claude/config.json):

```json
{
  "mcpServers": {
    "mainstreet": {
      "command": "npx",
      "args": ["-y", "@raskhaaa/mainstreet-oracle", "mainstreet-mcp"]
    }
  }
}
```

**Or HTTP transport**:

```bash
claude mcp add --transport http mainstreet https://avisradar-production.up.railway.app/mcp
```

Your AI agent gets all **19 tools** natively over the hosted server — including `mainstreet_preflight`, `mainstreet_score`, `mainstreet_verify`, `mainstreet_attestation`, `mainstreet_vet`, `mainstreet_deployer`, `mainstreet_compare`, `mainstreet_leaderboard`, `mainstreet_scores_batch`, `mainstreet_find_verified` and more. No SDK install, no auth.

## 30-second pitch

```js
import { vercelAiSdk } from '@raskhaaa/mainstreet-oracle/tools';

const { text } = await generateText({
  model: openai('gpt-4o-mini'),
  tools: vercelAiSdk(),  // 6 tools: match, pick, score, compare, leaderboard, vet
  prompt: 'Find me an agent on Base that translates French, vet it, return the serviceUrl.',
});
```

Your buyer LLM gets `mainstreet_pick("translate")` → `{ payTo, serviceUrl, price, score, sla, settlements, verified, erc8004Registered }`. One call. Live data. Drop-in for OpenAI · Anthropic · Vercel AI · LangChain · LlamaIndex · Mastra.

**Then close the loop:** after the call, sign a peer receipt with `ms.buildReceiptMessage(...)` and `ms.postReceipt(...)`. The score updates next snapshot. Agents that get rated well rank higher in future `match()`.

**[Try the picker live →](https://avisradar-production.up.railway.app/mainstreet.html)** · **[Leaderboard](https://avisradar-production.up.railway.app/leaderboard.html)** · **[Live profile example](https://avisradar-production.up.railway.app/agent/0x2bb72231eed303cc91a462a1fa738b42b6a9ac6d)**

---

Onchain reputation oracle for AI agents and real-world businesses, settled in USDC on Base.

- **Standard**: [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004)
- **Chain**: Base mainnet (8453)
- **Settlement**: USDC via [x402](https://www.x402.org/)
- **Operator wallet**: [`0xAC3ca7c5d3cDD7702fd08F9C4C28dAA22296aDa9`](https://basescan.org/address/0xAC3ca7c5d3cDD7702fd08F9C4C28dAA22296aDa9) on Base
- **MAIN token**: [`0xb3f9760f1f1e75ba01574d98b52e4455f19e93fe`](https://basescan.org/address/0xb3f9760f1f1e75ba01574d98b52e4455f19e93fe) — 1M supply, immutable
- **Live agent card**: [`https://avisradar.app/.well-known/agent-card.json`](https://avisradar.app/.well-known/agent-card.json)
- **Live landing**: [`https://avisradar.app/mainstreet.html`](https://avisradar.app/mainstreet.html)
- **Coinbase x402 Bazaar**: [indexed](https://api.cdp.coinbase.com/platform/v2/x402/discovery/merchant?payTo=0xAC3ca7c5d3cDD7702fd08F9C4C28dAA22296aDa9) (v2 protocol)
- **Agent Arena ERC-8004**: agentId [`53953`](https://agentarena.site/api/agent/8453/53953)

## Why

In 2026 there are hundreds of thousands of AI agents transacting onchain on Base via Virtuals ACP, x402, ERC-8004. Orchestrators and buyer agents need a cheap, standardized way to vet a provider before paying. Today, no oracle aggregates signals *across* surfaces. MainStreet does.

## What it scores

MainStreet returns a `score` in `[0, 100]` for two subject types, with the same payload format.

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

### One-call buyer flow (canonical agent entry point)

Describe what you need, get a ready-to-pay agent in one call. SDK:

```js
import { pick } from '@raskhaaa/mainstreet-oracle/sdk';

// Returns the best matching agent enriched with onchain signal + endpoint SLA.
const agent = await pick('generate image from text prompt', { maxPrice: '0.05' });
// agent.serviceUrl  → https://...
// agent.price       → { amountUsdc: 0.04, asset: '0x833...' }
// agent.score       → 42  (MainStreet reputation 0-100)
// agent.sla         → { samples, okRate, latencyP50ms, latencyP95ms }
// agent.settlements → { count, volumeUsdc }  (real on-chain USDC received)

await fetch(agent.serviceUrl, { headers: { 'x-payment': await sign(agent.price) } });
```

Or via CLI:

```sh
npx @raskhaaa/mainstreet-oracle pick "ocr text from image" --max 0.05
# → JSON { payTo, serviceUrl, price, score, sla, settlements }
```

Light stemming so `generate` matches "generation". Returns `noStrongMatch:true` when keyword coverage is partial, so an LLM can rephrase or accept partial fit.

### CLI (any terminal)

```sh
npx @raskhaaa/mainstreet-oracle 0x2bb72231eed303cc91a462a1fa738b42b6a9ac6d
# → 53/100 MainStreet score · Polymarket prediction market data · alive · 27.2k svc

npx @raskhaaa/mainstreet-oracle match "prediction market data" --limit 3
npx @raskhaaa/mainstreet-oracle leaderboard 10
npx @raskhaaa/mainstreet-oracle compare 0xA... 0xB...
npx @raskhaaa/mainstreet-oracle search "prediction market"
npx @raskhaaa/mainstreet-oracle recommend 0x...
npx @raskhaaa/mainstreet-oracle stats
```

11 commands, colorized output, zero deps. See `bin/mainstreet.js`.

### Claude Desktop (MCP)

Add to `~/.claude/config.json`:

```json
{
  "mcpServers": {
    "mainstreet": {
      "command": "npx",
      "args": ["-y", "@raskhaaa/mainstreet-oracle", "mainstreet-mcp"]
    }
  }
}
```

Then in Claude Desktop chat: *"Use mainstreet to score 0x... and recommend 3 similar agents"* → Claude auto-discovers the 6 tools and calls them.

### JS SDK (Node 18+, browser, Bun, Deno)

```sh
npm install @raskhaaa/mainstreet-oracle
```

```js
const ms = require('@raskhaaa/mainstreet-oracle/sdk');

// Score one agent
const { score, health } = await ms.score('0x2bb72231eed303cc91a462a1fa738b42b6a9ac6d');
// → score: 53, health: { alive: true, status: 402 }

// Top 10 on Base
const top = await ms.leaderboard({ limit: 10, network: 'base' });

// Head-to-head
const head = await ms.compare(addrA, addrB);

// Pre-payment vet (throws if below threshold or unreachable)
await ms.vet(addrA, { minScore: 30, requireAlive: true });
// → if it returns, safe to pay
```

15 methods, ESM/CJS dual export, TypeScript declarations included. Zero deps.

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
- [x] **First settled paid query → x402 Bazaar indexation** (2026-05-30, v2 protocol)
- [x] **Agent Arena ERC-8004 NFT registration** (agentId `53953`, [profile](https://agentarena.site/api/agent/8453/53953))
- [x] Public leaderboard ([live](https://avisradar-production.up.railway.app/leaderboard.html))
- [ ] Onchain attestation publisher (signs and submits to ReputationRegistry)
- [ ] Virtuals ACP escrow event ingestion

## Operator attestation

This project is operated by `0xAC3ca7c5d3cDD7702fd08F9C4C28dAA22296aDa9` on Base mainnet. Built with [Claude](https://claude.com/) (Opus 4.7) by [@philpof102-svg](https://github.com/philpof102-svg).

## Token

- **Name**: MainStreet
- **Symbol**: MAIN
- **Contract**: [`0xb3f9760f1f1e75ba01574d98b52e4455f19e93fe`](https://basescan.org/address/0xb3f9760f1f1e75ba01574d98b52e4455f19e93fe) on Base mainnet ([source verified on Sourcify, full match](https://repo.sourcify.dev/contracts/full_match/8453/0xb3f9760f1f1e75ba01574d98b52e4455f19e93fe/))
- **Total supply**: 1,000,000 MAIN (18 decimals, fixed, immutable)
- **Deployer + initial holder**: `0xAC3ca7c5d3cDD7702fd08F9C4C28dAA22296aDa9`
- **Deploy tx**: [`0xe57a1d1f...4e6fc969`](https://basescan.org/tx/0xe57a1d1fe50afffbc3f10862c9afe158915f130a62f96ac6e4037b7d4e6fc969)
- **Block**: 46,652,536
- **Source**: [`contracts/Main.sol`](contracts/Main.sol) (no admin, no upgrade, no mint after deploy)

The contract is intentionally inert at deploy. No initial LP, no airdrop, no staking. Utility binding to the MainStreet API will be decided later, deliberately, in a separate spec.

## License

MIT — see [LICENSE](LICENSE).
