# Base ecosystem — agent registries map (2026-05-30)

Where else MainStreet (or any agent) should be listed beyond the x402 Bazaar, in priority order.

## Tier 1 — direct overlap

### 1. Coinbase x402 Bazaar
- **What**: Official CDP discovery layer for x402-payable services. ~41,753 resources indexed, ~405 unique Base providers.
- **How to get listed**: Settle at least one x402 payment through `@coinbase/x402` facilitator with `discoverable: true` in `routeConfig.config` (NOT top-level — silent drop is the v1.2 footgun). Resource URL gets indexed within 10min of settlement; quality ranking recomputes every 6h.
- **API**: `GET https://api.cdp.coinbase.com/platform/v2/x402/discovery/merchant?payTo=<addr>` + `GET .../discovery/resources?limit=&offset=` 
- **Status for MainStreet**: in progress after the routeConfig.config fix (commit `6e82830`).

### 2. agentic.market
- **What**: Curated directory of x402-compatible services. Auto-feeds from Bazaar but adds editorial review + categorization.
- **How**: No public submission form. DM the maintainers on X / Farcaster, link to `/.well-known/x402.json`.
- **Status**: not contacted yet.

### 3. ERC-8004 ReputationRegistry
- **What**: On-chain reputation primitive. Anyone can call `giveFeedback(targetId, value, tag1, tag2)` to attach a score to any registered agent.
- **Contract**: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` on Base mainnet.
- **How**: Register your agent in IdentityRegistry first (`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`). Then call `giveFeedback` from a wallet you control. Cost: gas only.
- **Discovery**: Other agents read `getSummary(agentId)` — MainStreet does this in `reputation-reader.js`.

## Tier 2 — agent commerce surfaces

### 4. Virtuals Protocol
- **What**: Agent commerce + tokenization platform on Base. G.A.M.E. framework for agents to negotiate. Users pay agents in $VIRTUAL.
- **Audience**: their users ARE buyer agents — perfect customer fit.
- **How**: Discord #builders or DM @virtuals_io on X. Pitch integrating MainStreet score on agent profiles.

### 5. Olas / Autonolas Pearl App store
- **What**: Decentralized AI infrastructure. Pearl is their consumer-facing app store for autonomous agents.
- **How**: Build a Pearl-compatible service spec OR PR to `github.com/valory-xyz/awesome-autonolas`. Pearl App registration involves an on-chain NFT mint (~$50).
- **ROI**: medium — niche audience but very technical.

### 6. ChainLens
- **What**: Agent orchestration platform. Routes work between providers based on capability + trust.
- **How**: They publish docs at chainlens.com. PR their public registry of trusted scoring providers if such exists, otherwise DM on Discord.
- **ROI**: high — exactly the kind of platform that NEEDS our score as a gate.

### 7. Talent Protocol Builder Score
- **What**: Onchain proof-of-build for individual developers (and now their projects). Computes a Builder Score 0-100.
- **How**: Phil already created a Talent project for MainStreet (id `121d4ff5-...`). Add MAIN token + operator wallet to bump score.
- **Status**: ✅ done.

## Tier 3 — wallets + consumer surfaces

### 8. Coinbase Wallet (in-wallet agent discovery)
- **What**: Pre-installed wallet on iOS/Android. Recent versions expose Mini Apps + agent surfaces.
- **How**: Apply via their builder portal (`base.dev/wallet`) if they accept third-party agent listings.
- **ROI**: massive (millions of users) but high effort.

### 9. Base App (https://base.app)
- **What**: Consumer app for Base ecosystem. Browses dApps + agents.
- **How**: Submit at `apps.base.org/submit` or similar.

### 10. Farcaster Mini Apps + Frames
- **What**: Already shipped — `/api/agent/frame/leaderboard` works as Frame v2 + per-agent profile as preview embed.
- **Status**: ✅ live. Cast the URL on Warpcast = native discovery.

## Tier 4 — developer-side surfaces

### 11. npm registry (@raskhaaa/mainstreet-oracle package)
- **Status**: ✅ published-ready (package.json filled, version 0.4.0, bin + types + sdk exports configured). Phil to `npm publish` when ready.

### 12. PyPI mirror (Python SDK)
- **What**: Not built yet. Easy port of the JS SDK once we have demand signal.

### 13. Awesome lists
- `github.com/base/awesome-base` — submit PR
- `github.com/coinbase/x402` — submit PR to a "Built with x402" README section if/when added
- `github.com/erc-8004/awesome-erc-8004` — if exists, submit PR

### 14. Claude Desktop MCP registry
- **What**: Anthropic doesn't have an official MCP server marketplace yet, but community lists exist.
- **Status**: MainStreet MCP server is shipped at `scripts/mcp-server.js` + bin `mainstreet-mcp`. Submit to `github.com/punkpeye/awesome-mcp-servers` when ready.

### 15. ChatGPT GPT Store
- **What**: OpenAI's GPT marketplace. Required Action manifest + Privacy Policy URL.
- **How**: Build a GPT wrapper around our OpenAPI spec. ~1 day of work.

## Tier 5 — content / press

### 16. HackerNews Show HN
- Best for technical audience. See `LAUNCH_POSTS.md` for the ready-to-paste post.

### 17. Reddit r/ethereum, r/CryptoCurrency, r/onchain
- See `LAUNCH_POSTS.md`.

### 18. Mirror.xyz
- Outline in `LAUNCH_POSTS.md` for long-form post.

### 19. Crypto Twitter (X)
- Different audience from Farcaster. Worth a parallel thread.

## What MainStreet has done so far

| Channel | Status | Date |
|---|---|---|
| x402 Bazaar | ⏳ post-fix indexing pending | 2026-05-30 |
| ERC-8004 publisher | 📝 planned v0.5 | — |
| agentic.market | ❌ not contacted | — |
| Virtuals | ❌ not contacted | — |
| Olas | ❌ not contacted | — |
| ChainLens | ❌ not contacted | — |
| Talent Builder Score | ✅ active | 2026-05-29 |
| Farcaster | ✅ first cast posted | 2026-05-30 |
| Frame v2 | ✅ live | 2026-05-30 |
| Awesome lists | ❌ not submitted | — |
| HN / Reddit / IH | 📝 drafts ready | — |
| npm package | ✅ ready to publish | — |
| MCP server | ✅ shipped | 2026-05-30 |

## Next 5 concrete moves

1. Confirm Bazaar indexation after the routeConfig fix (10-60 min from commit `6e82830`)
2. PR `github.com/base/awesome-base` — quick win
3. DM @jesse.base.eth via Warpcast thread (already cast — reply with proof when indexed)
4. Discord introduction in Virtuals + ChainLens communities
5. Publish npm package (`npm publish` from `D:/Users/VolKov/veilleIA/mainstreet/`)
