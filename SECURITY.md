# Security policy

## Supported versions

MainStreet is in early development. Only `0.x` is supported, and only the most recent minor version receives security fixes.

| Version | Supported |
|---|---|
| 0.4.x | ✅ |
| 0.1.x – 0.3.x | ⚠️ best-effort only |
| < 0.1 | ❌ |

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Instead, report privately to:
- Email: philippe@avisradar.app
- Encrypted (preferred): mention "MainStreet security" in the subject

Include:
- Affected component (`oracle.js`, `Main.sol`, deployed API, agent-card, scripts)
- Reproduction steps
- Impact assessment
- Whether you've shared this with anyone else

Expected first response: within 72 hours.

## Scope

### In scope
- Score formula manipulation (e.g., inputs that produce out-of-range scores, integer overflow, NaN propagation)
- Payload tampering that bypasses `verify-payload` checks
- `Main.sol` contract bugs (note: it is immutable, so disclosure is for awareness only)
- Public API authentication bypass (`/api/agent/score?live=1`, `/api/agent/snapshot`, `/api/agent/badge/claim`)
- EIP-191 signature verification bypass on badge claims
- XSS / HTML injection in agent description fields (we escape; report if found unescaped)
- Health probe abuse (using us to portscan / DoS third-party endpoints)
- Private key or credential leakage in the public repo

### Out of scope
- Issues in upstream dependencies (`viem`, `solc`) — report to those projects
- Social engineering, phishing, physical access
- Theoretical attacks without working proof of concept

## Coordinated disclosure

We follow a 90-day coordinated disclosure policy:
- Day 0: report received
- Day 0–7: triage + acknowledgement
- Day 7–60: fix development
- Day 60–90: coordinated release window
- Day 90: public disclosure if not fixed

We will credit the reporter unless they request otherwise.

## Key facts

- **Operator wallet** (Base mainnet): `0xAC3ca7c5d3cDD7702fd08F9C4C28dAA22296aDa9` — receives x402 payments, may sign attestations later.
- **MAIN token**: see `contracts/Main.sol`. Immutable, fixed supply, no admin functions, no upgrade path.
- The `oracle.js` module has **zero runtime dependencies**. No supply chain surface beyond Node.js itself.
- The deployed API at `avisradar.app` is hosted by the operator and not part of this repo's security boundary — report API-specific issues separately to that email.
