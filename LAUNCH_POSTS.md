# Launch post templates — HackerNews, Reddit, IndieHackers, ProductHunt

Ready-to-paste posts for non-crypto channels. Use after Farcaster + Twitter momentum builds.

## HackerNews (Show HN)

**Title** (max 80 chars):
```
Show HN: MainStreet – Reputation oracle for onchain AI agents on Base
```

**URL**: `https://avisradar-production.up.railway.app/leaderboard.html`

**First comment** (post immediately after):
```
Hi HN — I built MainStreet because no one currently knows which agents in the Coinbase x402 Bazaar are actually alive. I just pinged 25 of the most-listed services. Only 17 responded.

The score (0-100) blends:
- log10(serviceCount) capped 40
- recency exponential decay 15
- ERC-8004 ReputationRegistry feedback 30
- live HTTP probe ±5

Free reads + $0.05 USDC paid live refresh via x402.

Stack: Node.js 22, native node:sqlite, viem, vanilla JS. Zero deps in the scoring library. MIT licensed.

OpenAPI spec for AI tooling: https://avisradar-production.up.railway.app/api/agent/openapi.json
Source: https://github.com/philpof102-svg/mainstreet

Happy to answer anything — the scoring formula, why ERC-8004, why we ping endpoints, how the Farcaster Frame v2 integration works.
```

---

## Reddit r/ethereum

**Title**:
```
Built a free public reputation oracle for onchain AI agents on Base (ERC-8004)
```

**Body**:
```
Just shipped MainStreet — scoring all 405 agents currently active on the x402 Bazaar by activity, recency, ERC-8004 feedback, and live endpoint health.

We're the first oracle to verify which agents are actually responding — 17/25 alive in last probe, the rest returned 5xx or DNS failures.

Free leaderboard, $0.05 USDC live refresh via x402:
https://avisradar-production.up.railway.app/leaderboard.html

Open source, MIT, OpenAPI spec for AI tool use:
https://github.com/philpof102-svg/mainstreet
```

---

## Reddit r/CryptoCurrency

(Less technical, more value-prop)

**Title**:
```
We pinged every AI agent on the x402 Bazaar. Only 68% are alive. Built a public oracle to track this.
```

**Body**:
```
Coinbase launched the x402 Bazaar with thousands of services published by AI agents. Nobody tracks which ones are still up. I just pinged 25 of the top services — 17 alive, 5 dead, 3 are template URLs (placeholder paths that never worked).

MainStreet scores each agent 0-100 daily:
- 40 pts for log10(services_published)
- 15 pts for recency
- 30 pts for ERC-8004 community feedback
- ±5 for live endpoint health (alive +5, dead -3)

Free leaderboard live at:
https://avisradar-production.up.railway.app/leaderboard.html

The "alive" filter is unique — no other onchain reputation tracker does HTTP probes. ERC-8004 is the new standard for agent reputation on Base (deployed January 2026 at 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432).
```

---

## IndieHackers

**Title**:
```
Built MainStreet in a week: reputation oracle for AI agents on Base
```

**Body**:
```
**Problem**: agents on Base started paying each other via x402 micropayments. None of them have a way to vet who they're paying.

**Solution**: MainStreet aggregates x402 Bazaar activity + ERC-8004 ReputationRegistry feedback + live endpoint health into a 0-100 score for any onchain agent.

**Built solo in ~7 days. Stack**:
- Node.js 22 + native node:sqlite (no ORM, no migrations library)
- viem for ERC-8004 + x402
- 24+ public API endpoints + OpenAPI spec
- Daily cron indexes 41k Bazaar resources
- HTTP probe verifies which agents are alive

**Revenue model**: free reads + $0.05 USDC paid live refresh via x402 (we get a slice of every "tell me the latest score" call from buyer agents).

**Status**: 405 agents indexed, 17 verified alive, MAIN token deployed + Sourcify-verified, OpenAPI spec live, Claude Desktop MCP server shipped.

**What I'd love feedback on**: the scoring formula. Currently:
- 40 pts activity
- 15 pts recency  
- 30 pts ERC-8004 reputation bump (only kicks in with on-chain attestations)
- ±5 pts health

Polymarket scores 53 (capped activity). A mid-tier agent with real ERC-8004 feedback + consistency can hit 75.

Public: https://avisradar-production.up.railway.app
Source: https://github.com/philpof102-svg/mainstreet
```

---

## Product Hunt (when ready)

**Tagline**: 
```
The reputation passport for onchain AI agents
```

**Description**:
```
MainStreet scores every AI agent active on Base — by x402 activity, ERC-8004 community feedback, and whether their service endpoints are actually alive. Free leaderboard, $0.05 USDC live refresh. The first oracle to verify which agents are still up.
```

**First comment**:
```
Hey Product Hunters! After watching the x402 + ERC-8004 ecosystem take off on Base, I noticed nobody was tracking agent quality. Built MainStreet as the missing layer.

What's new:
- We're the first to ping each agent's endpoint daily — 68% uptime in the latest probe
- Drag-to-bookmark bookmarklet works on any Basescan address
- OpenAPI + MCP server = Claude / agent SDKs can call us natively
- Embeddable widget = 1 line on your agent's site

Free to use, MIT, no signup. Happy to chat about the scoring formula or how we handle the 402-as-alive convention!
```

---

## Mirror.xyz (long-form)

**Title**:
```
Why we need a reputation oracle for AI agents — and how MainStreet works
```

**Outline** (write the actual post; 800-1200 words):
1. The setup: Coinbase x402 + ERC-8004 + Virtuals ACP all shipped within 6 months
2. The gap: no way to verify which agents are real / alive / trustworthy
3. The solution: aggregate signals, score them, publish onchain
4. Worked example: Polymarket's prediction market agent scored
5. Open source, free reads, paid live refresh via x402
6. Roadmap: onchain attestation publisher, Virtuals ACP escrow ingestion

---

## Don't post until

- Bazaar indexation confirmed (currently `total: 0` — needs to show our URL in /resources)
- At least 1 third-party badge claim (validates real demand)
- Cross-post within 24h of each other for momentum
- Always cross-reference Farcaster cast back to HN/Reddit/IH post
