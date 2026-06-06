# Changelog

## [0.9.2] — 2026-06-07 — configure({ headers }) for default request headers

### Added
- **`configure({ headers })`** — default headers merged into every SDK request (per-call headers still override). Primary use: internal/monitoring callers set `configure({ headers: { 'x-ms-monitor': '1' } })` so their own traffic is excluded from the public adoption metric at `/api/agent/usage`. Pass `{ headers: null }` to clear. No behavior change for existing callers (no headers sent unless configured).

## [0.9.1] — 2026-06-05 — Fix search clients for new API response shape

### Fixed
- **`search` clients broke on the new `/api/agent/search` response shape.** The endpoint now returns `{ total, results: [{ type, address, description, resource }] }` (was `{ count, results: [{ score, payTo, jobCount, tags }] }`). The CLI `search` command and `examples/search.js` crashed with `Cannot read properties of undefined (reading 'slice')` on the removed `payTo` field. Updated all three consumers (`bin/mainstreet.js`, `examples/search.js`, `examples/sdk-quickstart.js`) to read `total`/`address`, with a fallback to the legacy `count`/`payTo` fields for older mirrors.

## [0.8.3] — 2026-06-02 — full discovery network + 4 new MCP tools

### Added — MCP server (4 new tools, now 10 total)
- `mainstreet_catalog` — list all free + paid endpoints with prices
- `mainstreet_audit_info` — URL + x402 instructions for premium $0.25 audit
- `mainstreet_revenue` — live oracle revenue (transparency)
- `mainstreet_agents_of_interest` — curated shortlist with filters

### Added — CLI
- `mainstreet audit <addr>` — show premium endpoint info
- `mainstreet catalog` — print all endpoints

### Added — registry presence
- MCP Registry official listing (`io.github.philpof102-svg/mainstreet`)
- `mcpName` field in package.json

### Added — discovery surfaces (server-side)
- CDP Bazaar: 5 paid endpoints listed
- Basename `mainstreetxyz.base.eth` with 12 onchain text records (agent, x402.payTo, erc8004.agentId, mcp.npm, x402.catalog, etc.)
- Reverse-ENS: operator wallet `0xAC3c...` → `mainstreetxyz.base.eth`
- `/.well-known/agent.json`, `x402.json`, `ai-plugin.json`, `funding.json`, `security.txt`
- `/integrations.html`, `/embed.html`, `/llms.txt`, `/opensearch.xml`, PWA `/manifest.json`
- `/api/agent/catalog`, `/api/agent/bazaar-scored`, `/api/agent/top-buyers`, `/api/agent/agents-of-interest`, `/api/agent/revenue`, `/api/agent/match`
- Per-address shield SVG endpoint + iframeable widget per agent

## [0.7.6] — 2026-06-01 — MCP server live (no SDK install needed)

MainStreet is now a hosted MCP server. Any Claude / Cursor / ChatGPT user can add the 6 tools natively in one command:

```bash
claude mcp add --transport http mainstreet https://avisradar-production.up.railway.app/mcp
```

No npm install. No keys. No setup. Same 6 tools (`mainstreet_match`, `_pick`, `_score`, `_compare`, `_leaderboard`, `_vet`) wired to live Base reputation data, available natively in any MCP-capable AI client. The npm SDK still works for buyer LLMs that prefer code-level integration.

README now leads with the MCP install line.

## [0.7.5] — 2026-06-01 — README hero + live demo link

### Updated
- README pitch is now a 30-second 5-line code example pointing to the LLM tool flow + peer-receipt loop.
- Surface live demo (https://avisradar-production.up.railway.app/mainstreet-demo.html), per-agent profile URLs, and leaderboard from the top.

No code changes.

## [0.7.4] — 2026-06-01 — buildReceiptMessage marker fix

### Fixed
`buildReceiptMessage` was emitting "MainStreet peer receipt" but the server's anti-replay marker check expects "mainstreet receipt" as a substring. Now emits "MainStreet receipt" — verified end-to-end with EIP-191 signature round-trip on prod.

## [0.7.3] — 2026-06-01 — Peer-receipt rating loop wired into scoring

### Fixed (logic bug)
Buyer-signed receipts posted via `POST /api/agent/receipt` were stored but NEVER affected agent scores — the "agents-rate-agents" loop was half-built. Now wired into `buildMetrics`: receipts feed `successRate` as a fallback when ERC-8004 onchain attestations are absent.

### Added
- **`buildReceiptMessage({buyerAddr, agentAddr, txHash, success, ...})`** — canonical message helper for buyer agents. Sign with viem/ethers locally, post via `postReceipt`.
- `metrics.peerReceipts` field on `/score` and `/match` results (count, successRate, avgRating, lastReceiptAt).
- New scoring source: `mainstreet-peer-receipts` shows up in `sources[]` when receipts exist for an agent.

### Why this matters
This is the core "GitHub stars + Reddit karma for AI agents" loop, finally closed. A buyer LLM that uses an agent → POSTs a signed receipt → the agent's score updates next snapshot (24h). Onchain when there's an ERC-8004 attestation, off-chain peer-signed otherwise.

## [0.7.2] — 2026-06-01 — onlyRegistered / onlyVerified filters

### Added
- `match({ onlyRegistered: true })` — restrict to ERC-8004-registered agents (onchain identity).
- `match({ onlyVerified: true })` — restrict to MainStreet badge claimants.
- New result field `erc8004Registered: boolean` on every match.

LLM buyer agents can now route 100% of traffic to onchain-verified agents — directly creating the incentive for operators to register.

## [0.7.1] — 2026-06-01 — Examples for every major LLM framework

### Added
- `examples/openai-tools.js` — full tool-calling loop with `openai()` adapter.
- `examples/anthropic-tools.js` — full tool-use loop with Claude.
- `examples/llamaindex-tool.js` — LlamaIndex `FunctionTool` wrapper.
- `examples/vercel-ai-sdk.js` — refactored to one-line `vercelAiSdk()`.
- `examples/langchain-tool.js` — refactored to one-line `langchain()` wrapper.

Drop-in PR templates for upstream integrations live in `UPSTREAM_PRS.md`
(Bazaar/x402, LangChain community tools, LlamaIndex, Vercel AI examples,
ERC-8004 ecosystem registry).

## [0.7.0] — 2026-06-01 — LLM tool definitions

### Added — `@raskhaaa/mainstreet-oracle/tools`
One import, six LLM-ready tools, every major framework supported.

```js
import { openai, anthropic, vercelAiSdk, langchain, mastra } from '@raskhaaa/mainstreet-oracle/tools';
```

- **6 tools** out of the box: `mainstreet_match`, `mainstreet_pick`, `mainstreet_score`, `mainstreet_compare`, `mainstreet_leaderboard`, `mainstreet_vet`. Each ships with JSON Schema, description, and `execute()` bound to the live API.
- **Adapter for every framework**:
  - `openai()` → OpenAI Chat Completions / Assistants v2 tools array.
  - `anthropic()` → Anthropic Claude tools (`{name, description, input_schema}`).
  - `vercelAiSdk()` → Vercel AI SDK `tools` record (drop-in).
  - `langchain()` → DynamicStructuredTool-compatible specs.
  - `mastra()` → Mastra `createTool()` shape.
  - `specs()` → bare JSON Schema dump for anything else.
- **`execute(name, args)`** — direct exec by tool name for frameworks that route by string.
- Full TypeScript types in `tools.d.ts`.

### Why this matters
LLM buyer agents (built with LangChain, Vercel AI, Mastra, raw OpenAI tools) can now discover, vet, and pick onchain agents on Base **in their normal tool-calling loop** — no MainStreet-specific glue code. `mainstreet_pick("translate French to English")` → `{payTo, serviceUrl, price, score, sla}` → x402 call.

## [0.6.3] — 2026-06-01 — pick() one-call buyer flow

### Added
- **`ms.pick(intent)`** — one-call buyer flow. Returns the single best `MatchEntry` directly. Throws on no match. Throws on weak match unless `{allowWeak:true}`. Lets you `const a = await ms.pick('image gen'); fetch(a.serviceUrl, ...)`.
- **`mainstreet pick <intent>`** CLI command. Outputs a clean JSON `{payTo, serviceUrl, price, score, sla, settlements}` ready to pipe into another tool.
- **`mainstreet match`** now shows settlements + SLA p50/okRate per result, and prints `⚠ weak match` when `noStrongMatch`.
- `SlaStats.note` typed (e.g. "few samples — wait for more probes").

### Server-side (live)
- SLA shape strictly unified across `/score`, `/match`, `/leaderboard`: `{samples, okRate, latencyP50ms, latencyP95ms, avgLatencyMs, note}`.
- Health probe now runs every 6h (4/10/16/22 UTC) instead of daily — 4x SLA samples in 24h → meaningful p50/p95 the same day.

## [0.6.2] — 2026-06-01 — TypeScript types complete, /match enriched

### Added
- TypeScript declarations for `match`, `postReceipt`, `receipts`, `addWatch`, `watchlist` (previously runtime-only).
- `SlaStats` interface — `samples`, `okRate`, `avgLatencyMs` from health probe rolling window.
- `MatchEntry` now declares `settlements` + `sla` per result (server enriches each match with on-chain volume + latency in 1 call).
- `match()` signature accepts `string | MatchOpts`.

### Server-side (live now)
- `/api/agent/match` includes `settlements` + `sla` per result — LLM clients can compare candidates on real on-chain activity + endpoint latency without a follow-up call.
- Light stemming on `/match` intent tokens (`generate` → `generat` matches "generation"; `image` → `imag` matches "images"). Stripped suffixes: `ation, tion, ing, ies, ied, ed, er, es, s, e`.
- `/match` ordering: matchScore DESC first, then score (relevance > popularity).
- `noStrongMatch: true` + explanatory `note` when top result matches less than full intent token count.

## [0.5.0] — 2026-05-31 — Tags, webhooks, on-chain settlements

### Added — discovery & alerts
- **`tags()` + `tagged(tag, limit)`** SDK methods + `tags` / `tagged <tag>` CLI commands. Browse the 815-agent ecosystem by capability (top tag: `x402` × 11, followed by `agent`, `crypto`, `trading`).
- **`subscribeWebhook(opts)` + `listWebhooks(addr)`** SDK methods. Subscribe to score-change alerts via webhook URL — daily diff cron POSTs when score crosses `thresholdDelta`. 30-day grace period free; future renewals via x402. HMAC-signed deliveries (`X-MainStreet-Signature`). SSRF-protected (private IPs blocked, no redirects).
- **`metrics.settlements`** field in `/score` + `/leaderboard` + `/compare` + `/agent/0x….json` responses. Real on-chain USDC `Transfer` events to indexed agents are now aggregated by an indexer cron every 6h. Includes `count` + `volumeUsdc`.

### Added — server infrastructure (upstream)
- `mainstreet_settlements`, `mainstreet_erc8004_feedback`, `mainstreet_webhook_subs`, `mainstreet_watchlist`, `mainstreet_scan_cursor` tables.
- Scheduler crons: settlement indexer (q6h), ERC-8004 feedback indexer (03h30 UTC), watchlist Telegram alerts (05h UTC), webhook delivery (05h10 UTC).
- `/api/agent/status` now exposes all 8 mainstreet crons with `lastRun` + `schedule`.

### Fixed
- Webhook URL validation rejects private/loopback/metadata IPs + `.internal`/`.local`/`.railway.app` domains. `maxRedirects:0` prevents SSRF via redirect.
- Settlement indexer filters `to_addr` at RPC level (was pulling millions of USDC transfers per scan).
- ERC-8004 indexer correctly stores `agentId` as integer string (was treating uint256 topic as 20-byte address — bogus data).
- Score color thresholds unified across all surfaces: 0–19 red, 20–39 amber, 40+ green (was 50/25 inconsistent; <20 was grey indistinguishable from "no data").
- Network alias handling: `?network=base` and `?network=eip155:8453` now return the same results (624 Base agents, not split 405+219).
- `/api/agent/search` escapes SQL `LIKE` wildcards (`%`, `_`).
- `/categories/:slug` shows the active category in hero title + activates the matching filter chip (was visually identical to bare leaderboard).
- og:title / og:description / RSS feed titles truncate at word boundary (no mid-word "Bazaar v2 i" cuts).
- Pricing unified to $0.05 USDC across all paywalls, env vars, docs, and Agent Arena profile (was inconsistent $0.05/$0.10 split).
- 25+ smaller UX/data integrity fixes — see git log on `claude/add-extra-features-vw7rO`.

### Operations
- **Coinbase x402 Bazaar**: indexed since 2026-05-30, single resource (`/score/:address`), price 50000 (=$0.05 USDC), v2 protocol.
- **Agent Arena**: ERC-8004 NFT minted as agentId 53953 on Base. Profile lists 3 services with v0.5.0 pricing.
- **Telegram bot** (Phil-only): `/watch 0x... [threshold]`, `/unwatch 0x...`, `/watchlist` — daily 05h UTC diff alerts.

## [0.4.1] — 2026-05-30 — Developer surface

### Added — devtools
- **JS SDK** at `sdk/index.js` (CJS) + `sdk/index.mjs` (ESM) + `sdk/index.d.ts` (TypeScript declarations). 15 typed methods covering all endpoints. `vet()` helper gates buyer-agent payment on minScore + alive + has-serviceUrl. Zero deps (native fetch). 14/14 unit tests pass.
- **CLI** at `bin/mainstreet.js`. 10 commands (score, leaderboard, compare, search, recommend, history, stats, movers, featured, me). Colorized output. Address-shortcut: `mainstreet 0x...` runs score by default.
- **MCP server** at `scripts/mcp-server.js`. Native JSON-RPC over stdio, MCP protocol 2024-11-05. Claude Desktop / Claude Code can attach via `npx @raskhaaa/mainstreet-oracle mainstreet-mcp` and get 6 tools (score, leaderboard, compare, search, recommend, history).
- `examples/sdk-quickstart.js` — 5-step buyer-agent demo flow.
- `examples/recommend.js`, `examples/movers.js`, `examples/search.js`, `examples/compare.js`, `examples/stats.js`, `examples/health-aware-buyer.js`.

### Added — scoring v3 (longevity)
- New 5th component: **longevity & diversity** (max 10 pts), composed of:
  - Age bonus: +1/+2/+3 at 7/14/30 days since first indexed
  - Consistency: +1/+2/+3 at 5/10/21 distinct days seen in last 30
  - Diversity: +2/+4 at 2/5 Bazaar tags
- Activity cap reduced 45 → 40 to make room
- Recency cap reduced 20 → 15 to make room
- Reward profile shifts: polished newcomers with ERC-8004 attestations + consistency can outscore pure-volume agents
- 21/21 oracle tests pass

### Added — endpoints (upstream)
- `GET /api/agent/random` — pick a random indexed agent (optional `?network=`)
- `GET /api/agent/trending?limit=` — 7-day score-delta gainers
- `GET /api/agent/shield/:metric.json` — shields.io-compatible live badges (indexed, alive, badges, scored, version)
- `GET /agent/{0x...}.json` — ERC-8004 schema-tagged per-agent card (CORS *)

### Added — SEO + discovery
- FAQPage JSON-LD schema (6 Q/A) on landing — unlocks Google rich results
- `scripts/mainstreet-indexnow-ping.js` — push 14 URLs to IndexNow (Bing/Yandex/Seznam) for non-Google search engines
- README adds 3 live shields.io badges (Agents indexed, Endpoints alive, Badges claimed) auto-updating from `/api/agent/shield/*.json`

### Added — content for launch
- `WARPCAST.md` — 4 launch cast variations + reply templates (English)
- `WARPCAST_FOLLOWUPS.md` — 4 self-reply templates with timing playbook
- `OUTREACH.md` — DM templates for agentic.market, Olas, Virtuals, ChainLens, Coinbase x402 team, awesome lists, press
- `LAUNCH_POSTS.md` — 5 ready-to-paste posts for HackerNews (Show HN), Reddit r/ethereum + r/CryptoCurrency, IndieHackers, ProductHunt, Mirror outline
- `docs/SCORING.md` — full deep-dive on the 5-component formula with worked examples + adversarial considerations
- `docs/HEALTH_PROBE.md` — how we verify endpoints alive, polite-scanning rules, opt-out
- `docs/EMBED.md` — 5 ways to surface (widget, SVG badge, JSON card, bookmarklet, Farcaster Frame)
- `docs/INTEGRATIONS.md` — 11 ready-to-paste recipes (buyer agents, orchestrators, Claude SDK tool use, marketplaces, RSS, CSV, Frame, agent-card embed)
- `docs/ECOSYSTEM-SCAN-2026-05-30.md` — analytical breakdown of all 41,753 Bazaar resources

### Brand
- Single canonical spelling: **MainStreet** (PascalCase, no space)
- Brand wordmark fixed: inline-flex was treating `Main` and `<span>Street</span>` as separate flex items with 10px gap. Wrapped in single span so it renders tight without space.

### Live distribution surface (production)
- 7 pages all branded: `/mainstreet.html`, `/leaderboard.html`, `/agent.html` (+ SSR `/agent/0x...`), `/compare.html`, `/badges.html`, `/stats.html`, `/proof.html`
- 5 SSR category landings (`/categories/{ai,crypto,data,news,sports}`) + `/categories/` hub
- 1 embed widget (`/widget.js`) + 1 bookmarklet on landing
- 24 API endpoints + OpenAPI 3.0.3 spec + `/.well-known/x402.json` + `/.well-known/agent-card.json`

### Infrastructure
- Cron `0 10 * * * UTC` — boot-phase aggressive settle (3 settlements/day) auto-stops after `MAINSTREET_BOOT_PHASE_UNTIL` date
- 7 internal crons total (daily indexer + scorer, alerter q6h, weekly settle, health probe, boot-phase, social DRY, etc.)

### Operational
- 4 real x402 settlements completed (2026-05-30) to seed Bazaar indexation
- Public repo passed 50 commits — currently 61

## [0.4.0] — 2026-05-30 — Production polish + scoring v2

### Scoring engine
- **Health bonus**: `+5` if the agent's `resource_path` was pinged alive in the last 24h, `-3` if dead, `0` if unprobed. New 4th component on top of activity/recency/reputation. **Unique among all known agent rankings** — no other oracle verifies which x402 services are actually responsive.
- `computeActivityScore` activity cap reduced 50 → 45 to leave room for the health component (total still 0-100, clamped).
- Score is now bounded explicitly with `Math.max(0, Math.min(100, ...))` to defend against extreme inputs.
- Tests extended to 20 cases covering bounds, sample confidence, health bonus.

### Upstream — distribution surface (live on `avisradar-production.up.railway.app`)
- **Per-agent permalinks**: `/agent/0x...` server-rendered with per-agent og:title + og:image (1200x628 SVG share card). Every agent is now Google-indexable + shareable.
- **Visual /compare.html**: side-by-side head-to-head UI. Pick 2 agents, see winner + recommendation. Powered by `/api/agent/compare`.
- **Selection of the Week**: algorithmic picks (trending, newcomer, volume leader, hidden gem) refreshed hourly.
- **Hall of Fame** `/badges.html`: lists all claimed badges. Empty state with claim CTA.
- **Categories**: 5 SSR landings (/categories/{ai,crypto,data,news,sports}) + `/categories/` hub.
- **/stats.html**: KPI dashboard with networks breakdown, score distribution, alive/dead ratio, top categories.
- **Bookmarklet**: drag-to-bar JS bookmarklet detects 0x address on any Basescan page and opens its MainStreet profile.
- **Embed widget** `public/widget.js`: 1-line `<script>` tag any agent site can embed to display a live score badge.

### Discovery
- `/.well-known/x402.json` — standard service descriptor with 3 priced endpoints + 15 free endpoints + discoveryHints. Crawled by external agent indexers.
- `/api/agent/openapi.json` — full OpenAPI 3.0.3 spec (16 paths). Auto-discoverable by Claude / ChatGPT / agent SDKs.
- `/agent/0x....json` — per-agent ERC-8004 schema-tagged card (CORS *).
- Dynamic `sitemap.xml` including top 100 agent permalinks.
- Farcaster Frame v2 on `/agent/0x` + `/frame/leaderboard` for interactive Warpcast casts.

### Multi-network
- Indexer + cron + bootstrap now scan ALL networks in the x402 Bazaar (not just Base). Solana, Polygon, Stellar, Worldchain visible.
- Leaderboard `?network=base|solana|all|polygon|...` filter with `normalizeNetwork` helper.

### New endpoints (upstream)
- `GET /api/agent/compare?a=&b=` — head-to-head with winner + margin + recommendation
- `GET /api/agent/movers` — daily top gainers / losers by score delta
- `GET /api/agent/featured` — Selection of the Week (4 algorithmic picks)
- `GET /api/agent/search?q=` — SQL LIKE search across description/address/tags
- `GET /api/agent/recommend?for=0x` — similar agents (category + score band)
- `GET /api/agent/history/:addr?days=` — daily time series
- `GET /api/agent/health-summary` — alive/dead aggregate + top 10 alive
- `GET /api/agent/badges` — Hall of Fame backing data
- `GET /api/agent/feed.rss` — newcomers + movers RSS
- `GET /api/agent/leaderboard.csv` — full snapshot CSV export
- `GET /api/agent/og.png?addr=0x` — per-agent share image
- `POST /api/agent/badge/claim` — EIP-191 verified badge claim → SVG embed

### Infrastructure
- Cron `0 4 * * * UTC` — daily service health probe (HEAD with GET fallback, 5s timeout, polite UA with opt-out).
- Cron `0 */6 * * * UTC` — new-agent Telegram alerter for first-seen diff.
- Cron `0 9 * * 1 UTC` — weekly auto-settlement (TEST_BUYER → operator $0.05) to maintain Bazaar indexation.
- 5 SQLite tables (bazaar_index, leaderboard_history, badges, seen_agents, service_health).
- Self-healing bootstrap re-populates DB at boot if empty.

## [0.1.6] — 2026-05-30

### Added
- **MAIN.sol verified on Sourcify** (`full_match` level). Sources publicly inspectable at https://repo.sourcify.dev/contracts/full_match/8453/0xb3f9760f1f1e75ba01574d98b52e4455f19e93fe/ — Basescan will mirror automatically within minutes.
- `contracts/Main.compiled.json` and `contracts/Main.metadata.json` pinned for deterministic reverify.
- `GET /api/agent/status` (upstream) — live infra snapshot: x402 init state, operator, token. Public, no auth.

### Changed
- `compile.js`: emits metadata.json with `useLiteralContent: true, bytecodeHash: ipfs` — required for Sourcify verification.
- `leaderboard`: Bazaar query fixed (`payTo` not `address`); seeded agents now include real Bazaar-active sellers (OttoAI, Onesource).

## [0.1.5] — 2026-05-30

### Live in production
- **First real x402 settlement**: 0.05 USDC paid by buyer `0xa1Dd5a2526D49626Ed7b9BF3bC16e61B205D678C` to operator `0xAC3ca7c5d3cDD7702fd08F9C4C28dAA22296aDa9` for a `/api/agent/score` call. CDP facilitator settled successfully and is now indexing the service in the x402 Bazaar.
- Service is becoming discoverable via `agentic.market` (auto-feed from Bazaar).

### Fixed
- Route key patterns in `paywallMiddleware` must use Next.js `[name]` syntax (not Express `:name`) — x402-express's `computeRoutePatterns` only converts square brackets to `[^/]+` regex. Without the fix, the paywall was silently bypassed.
- Route keys must be relative to the Express router mount point (e.g. `GET /score/[agentAddress]`, not `GET /api/agent/score/[agentAddress]`).
- Score endpoint had `requireAgentAuth` but no paywall middleware mounted — fixed.

### Lessons
- The CDP facilitator rejects self-payments with `self_send_not_allowed`. Use a separate buyer wallet for end-to-end tests. The upstream repo includes a one-shot buyer wallet generator.

## [0.1.4] — 2026-05-30

### Added
- `GET /api/agent/leaderboard` — public, free, cached 1h. Ranks the MainStreet score for a seeded set of known onchain agents (Ethy AI, HeyElsa, Axelrod, Bankr at v0.1; full Virtuals enumeration in v0.3).
- `benchmark/score-perf.js` — perf benchmark: business 15M ops/s, agent 8M ops/s, payload build 350k ops/s (with SHA-256 hash).
- `mainstreet-status.bat` (upstream) — Windows monitoring snapshot: prod health, wallet balance, MAIN supply, test suite, cron schedule, backlog.

### Resolved
- Earlier x402 facilitator 401 was a SDK regression in `@x402/* v2.x`, not a credentials issue. Direct CDP probe confirms key is valid. Workaround: pin to v1 packages (`@coinbase/x402` 1.0.1, `x402-express` 1.x). See `scripts/probe-cdp-facilitator.js` (upstream) for the diagnostic tool.

## [0.1.3] — 2026-05-30

### Deployed onchain
- **MAIN token live on Base mainnet** at `0xb3f9760f1f1e75ba01574d98b52e4455f19e93fe` (block 46,652,536, gas 382,341). 1M supply minted to operator wallet. Immutable.

### Added
- `contracts/Main.deployed.json` — pinned deploy metadata (tx hash, block, deployer).
- `agent-card.json` populated with operator + token info (was `null` previously).

## [0.1.2] — 2026-05-30

### Added
- TypeScript declarations (`types/oracle.d.ts`) — full type coverage for all exported functions and types.
- `npm run test` / `leaderboard` / `verify` scripts in `package.json`.
- `SECURITY.md` — vulnerability reporting policy + 90-day coordinated disclosure.
- `ROADMAP.md` — v0.1 through v1.0 milestones with explicit out-of-scope.
- `docs/API.md` — full HTTP API reference.
- `CONTRIBUTING.md` — local dev + PR guidelines.
- `.github/workflows/ci.yml` — runs tests + examples on every push.
- `examples/score-leaderboard.js` — demo with top agents (Ethy AI, HeyElsa, Axelrod).
- `examples/verify-payload.js` — consumer-side validator with tamper detection.
- README badges (CI, License, ERC-8004, Base, x402).

### Changed
- `package.json` declares published `files` whitelist for clean `npm publish` later.

## [0.1.1] — 2026-05-30

### Fixed
- `computeScoreAgent` used `||` for nullish defaults, treating legitimate `daysSinceLastJob = 0` (active today) as missing and defaulting it to `365` (full decay). Switched to `??`. Active-vs-ghost agents now score with the expected ~20-point gap. Discovered by the test suite.

### Added
- Test suite (`test/oracle.test.js`) — 15 cases covering both subject types, payload structure, registry constants, boundary conditions, and random fuzz.
- `scripts/compile.js` — compiles `contracts/Main.sol` via solc into reusable JSON artifact.
- `scripts/deploy-token.js` — deploys MAIN via viem from the operator wallet, no Remix required. Checks gas balance before attempting, exits with funding instructions otherwise.
- `contracts/Main.compiled.json` — pre-compiled artifact, lets consumers deploy without solc installed.

## [0.1.0] — 2026-05-29

### Added
- Initial release.
- `oracle.js` — dual-subject scoring (agent-onchain + business-google), ERC-8004-shaped payload.
- `contracts/Main.sol` — immutable ERC-20 MAIN token (1M supply, no admin, no upgrade).
- `index.html` — landing page, agent-first pitch.
- `.well-known/agent-card.json` — ERC-8004 identity card.
- `SPEC.md` — full design spec.
- `DISTRIBUTION.md` — go-to-market playbook (x402 Bazaar, agentic.market, Virtuals ACP).
- `contracts/DEPLOY.md` — Remix-based deploy instructions (alternative to scripted deploy).
- MIT license.
