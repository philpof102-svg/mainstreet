# Mainstreet roadmap

Aspirational, not a commitment. Order indicates rough priority; items can slip or be cut.

## v0.1 — shipped 2026-05-29

- [x] Dual-subject scoring formula (agent + business)
- [x] ERC-8004-shaped payload builder
- [x] Public landing + agent-card
- [x] x402 paywall integration in upstream service
- [x] MAIN token contract scaffold
- [x] Test suite + CI

## v0.2 — shipped 2026-05-30

- [x] MAIN token deployed + Sourcify-verified on Base
- [x] Talent Protocol Builder Score linkage
- [x] Public leaderboard endpoint
- [x] Buyer-side example
- [x] **5 settled paid x402 queries** (2026-05-30, 0.05 USDC each, buyer `0xa1Dd...678C`)

## v0.3 — score quality + product polish — shipped 2026-05-30

- [x] Activity-based scoring (log10 of jobCount) — works without ERC-8004 data
- [x] ERC-8004 enrichment via viem read of `getSummary`
- [x] Per-agent SSR profile pages `/agent/0x...` with dynamic og:image + Frame v2
- [x] Visual `/compare.html` head-to-head UI
- [x] `/categories/{ai|crypto|data|news|sports}` SSR landings
- [x] `/badges.html` Hall of Fame
- [x] `/stats.html` public KPI dashboard
- [x] Per-agent JSON card at `/agent/0x....json`

## v0.4 — health bonus + distribution — shipped 2026-05-30

- [x] **Service health probe**: HEAD-then-GET pings each `resource_path` daily (04h UTC). +5/-3/0 score bonus. Unique among agent oracles.
- [x] **Multi-network**: indexer scans all Bazaar networks (Base + Solana + Polygon + others). Leaderboard `?network=` filter.
- [x] **Discoverability**: `/.well-known/x402.json`, OpenAPI 3 spec, dynamic sitemap with top 100 agent permalinks
- [x] **Distribution**: Farcaster Frame v2 (leaderboard + per-agent), embed `<script>` widget, drag-to-bar bookmarklet, RSS feed, CSV export
- [x] **Cross-discovery**: `/api/agent/recommend?for=0x` returns similar agents by category + score band
- [x] **Engagement**: Telegram alert on each new agent + each badge claim
- [x] Tests: 20/20 pass — covers health bonus, bounds, sample confidence

## v0.5 — onchain attestations + real volume signals

- [ ] Onchain attestation publisher: EIP-712 sign + submit to `ReputationRegistry`
- [ ] Read Virtuals ACP escrow events for real USDC volume
- [ ] ERC-8004 `giveFeedback` event indexer (not just summary)
- [ ] Weight `successRate` by counter-party reputation (recursive trust)
- [ ] Confidence interval alongside score (e.g., `score: 78 ± 8`)

## v0.6 — adoption

- [ ] Partner with one orchestrator agent (ChainLens, Butler) for native integration
- [ ] SDK in TypeScript, Python, Go (wrap `GET /score/:addr`)
- [ ] Subgraph indexer for community-built dashboards
- [ ] WebSocket / Server-Sent Events feed for real-time score deltas
- [ ] Stripe-style developer dashboard for buyer agents (usage, cost, alerts)

## v1.0 — sustainability

- [ ] Operator wallet rotation procedure documented
- [ ] Two-signer attestation publisher (reduces single-key risk)
- [ ] Independent audit of `Main.sol` (already deployed, audit for record only)
- [ ] Funding model: x402 income covers Anthropic + Apify + Outscraper bills; surplus to LP
- [ ] Quarterly transparency report (number of attestations, revenue, top consumers)

## Explicitly out of scope

- Tokenizing the project further (no governance token, no veVOTE)
- Off-chain reputation pools or staking
- KYC of agents
- Generic identity layer — we only score, we don't authenticate

## Cancelled/Deferred

- ~~RWA business pivot as primary~~ — deferred to secondary product. Agent reputation market is real today, RWA underwriting cycles are quarters.
