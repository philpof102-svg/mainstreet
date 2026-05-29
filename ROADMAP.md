# Mainstreet roadmap

Aspirational, not a commitment. Order indicates rough priority; items can slip or be cut.

## v0.1 — shipped 2026-05-29

- [x] Dual-subject scoring formula (agent + business)
- [x] ERC-8004-shaped payload builder
- [x] Public landing + agent-card
- [x] x402 paywall integration in upstream service
- [x] MAIN token contract scaffold
- [x] Test suite + CI

## v0.2 — in progress

- [x] MAIN token deployed onchain on Base (`0xb3f9760f...e93fe`), address pinned in README and Talent
- [x] Operator wallet added to Talent Protocol profile (Builder Score linkage)
- [x] Public leaderboard endpoint `/api/agent/leaderboard` (seed of 4 known agents)
- [x] Buyer-side example (`examples/x402-buyer.js`) — drop-in for orchestrators
- [ ] Liaison signed message: operator wallet attested by founder's main wallet
- [ ] Onchain attestation publisher: sign payload via EIP-712, submit to `ReputationRegistry`
- [ ] Daily cron scoring the top 100 Virtuals ACP agents → publish attestations
- [ ] First settled paid x402 query → indexation in x402 Bazaar + agentic.market

## v0.3 — score quality

- [ ] Read ERC-8004 `ReputationRegistry.giveFeedback` events directly via RPC
- [ ] Read Virtuals ACP escrow completion events
- [ ] Weight `successRate` by counter-party reputation (recursive trust)
- [ ] Calibration: backtest against known incidents (rugs, scams) — score should have predicted ≤ 30 in the week before incident
- [ ] Confidence interval alongside score (e.g., `score: 78 ± 8`)

## v0.4 — adoption

- [ ] Partner with one orchestrator agent (Butler or ChainLens) for native integration
- [ ] "Mainstreet verified" embed badge for agent landings
- [ ] SDK in TypeScript, Python, Go (just wrap `GET /score/:addr`)
- [ ] Subgraph indexer for community-built dashboards
- [ ] WebSocket feed for real-time score deltas

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
