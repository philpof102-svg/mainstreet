# Changelog

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
