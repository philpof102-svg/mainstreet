# Contributing to MainStreet

Thanks for your interest. MainStreet is small and intentionally minimal.

## Scope

This repo contains:
- `oracle.js` — the scoring formula and ERC-8004 payload builder
- `contracts/Main.sol` — the MAIN ERC-20 token
- `index.html` — the landing page
- `.well-known/agent-card.json` — the ERC-8004 identity card
- `scripts/` — compile and deploy
- `test/` — unit tests
- Docs (README, SPEC, DISTRIBUTION, CHANGELOG)

This repo does NOT contain:
- The data sources that feed the score (those live in the upstream AvisRadar pipeline).
- The HTTP API (`/api/agent/score`, `/api/agent/snapshot`) — also upstream.
- Any private keys or credentials.

## Local development

```bash
git clone https://github.com/philpof102-svg/mainstreet
cd mainstreet
node --test test/oracle.test.js
node examples/basic-usage.js
```

No npm install required for tests or examples — `oracle.js` uses only `node:crypto`.

## Running the deploy script

```bash
npm i viem dotenv
node scripts/compile.js          # produces contracts/Main.compiled.json
node scripts/deploy-token.js     # deploys MAIN from the operator wallet in .env
```

You need `MAINSTREET_OPERATOR_PRIVATE_KEY` in `.env` and ~0.0003 ETH on Base for gas.

## Pull requests

- Keep changes focused. Score formula changes need a CHANGELOG entry, updated tests, and a calibration note in README.
- Tests must pass: `node --test test/oracle.test.js`.
- No new runtime dependencies on `oracle.js` — it stays zero-dep.
- Solidity changes to `Main.sol` after deploy are not possible (the contract is immutable). Don't open PRs for that.

## Out of scope

- Adding a second token, vesting, or DAO logic.
- Adding scoring inputs that aren't observable onchain or in public APIs.
- Wrapping the oracle in a framework. Stay close to plain JS.

## License

By contributing, you agree your contributions are licensed under the MIT License.
