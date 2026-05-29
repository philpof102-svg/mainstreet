# Changelog

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
- `GET /api/agent/leaderboard` — public, free, cached 1h. Ranks the Mainstreet score for a seeded set of known onchain agents (Ethy AI, HeyElsa, Axelrod, Bankr at v0.1; full Virtuals enumeration in v0.3).
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
