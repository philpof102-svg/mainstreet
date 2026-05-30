# Outreach playbook — get Mainstreet listed on agent markets & registries

Ready-to-paste DM templates + submission steps. Targets ranked by ROI.

---

## 1. agentic.market

**What it is**: directory of x402-compatible agent services on Base.
**ROI**: 🔥🔥🔥 (direct overlap with our index).
**How to submit**:
- Site has no submission form publicly. Reach the team via:
  - X / Twitter: @agentic_market (or DM the maintainer pinned in their feed)
  - GitHub: search their org for a `listings.json` or `agents.md` PR target

**DM template**:
```
gm — built Mainstreet, the first public reputation oracle for onchain agents on Base.

405 agents auto-indexed from the x402 Bazaar, scored daily on activity + ERC-8004 feedback + live endpoint health.

Spec at /.well-known/x402.json. OpenAPI at /api/agent/openapi.json. Open source MIT.

Would love to be listed on agentic.market or to integrate our score on your agent cards.

Live: https://avisradar-production.up.railway.app/leaderboard.html
JSON: https://avisradar-production.up.railway.app/api/agent/openapi.json
```

---

## 2. Olas / Autonolas Pearl App registry

**What it is**: decentralized AI infra with an on-chain agent registry.
**ROI**: 🔥🔥 (longer to integrate, but standards-aligned).
**How to submit**:
- Their registry is on-chain (Gnosis chain + others). Manual: open a PR to https://github.com/valory-xyz/awesome-autonolas
- Or apply to Pearl App Store via their builder portal: https://pearl.olas.network

**DM template** (Twitter @autonolas):
```
hi @autonolas — Mainstreet is an open-source reputation oracle for onchain agents on Base. We'd be a natural fit in your awesome-autonolas list and Pearl ecosystem.

Specs:
- ERC-8004 compliant
- 405 agents indexed
- free leaderboard + paid live refresh via x402
- OpenAPI spec + /.well-known/x402.json discoverable

repo: github.com/philpof102-svg/mainstreet
live: avisradar-production.up.railway.app
```

---

## 3. Virtuals Protocol (virtuals.io)

**What it is**: agent tokenization + G.A.M.E. framework. Has discovery for agent commerce.
**ROI**: 🔥🔥🔥 (their users ARE our buyer agents).
**How to submit**:
- Discord: https://discord.gg/virtualsprotocol — channel #general-chat or #builders
- Twitter: @virtuals_io — DM or tag in tweet

**DM template**:
```
hey @virtuals_io — built a reputation oracle for onchain agents on Base that's a natural complement to Virtuals' agent commerce.

MainStreet scores agents 0-100 from x402 activity + ERC-8004 feedback. Any Virtuals agent can be looked up via /api/agent/score/<address>. Would love to integrate — e.g. show MainStreet score on Virtuals agent profiles.

open source, MIT
spec: https://avisradar-production.up.railway.app/.well-known/x402.json
demo: https://avisradar-production.up.railway.app/agent/0x2bb72231eed303cc91a462a1fa738b42b6a9ac6d
```

---

## 4. ChainLens (orchestrator)

**What it is**: agent orchestration platform.
**ROI**: 🔥🔥 (uses agent scores natively for routing).
**How to submit**:
- Their Discord / Telegram (find on chainlens.com)
- Or PR to their docs if they list trusted scoring providers

**DM template**:
```
hi — orchestrators need a cheap trust signal before routing work to an unknown agent. Mainstreet provides that for onchain agents on Base.

/api/agent/score/<agentAddress> returns 0-100 + service URL + alive/dead. Free reads, $0.05 USDC for live refresh.

Could plug directly into ChainLens routing as a pre-payment gate.

OpenAPI: https://avisradar-production.up.railway.app/api/agent/openapi.json
```

---

## 5. Coinbase Developer Platform team (x402)

**What it is**: the team that built x402 + the Bazaar.
**ROI**: 🔥🔥🔥🔥 (validation from THE infrastructure provider would 10x our credibility).
**How to submit**:
- Twitter: @CoinbaseDev, @x402_org (if exists), or DM @jessepollak (CDP lead)
- Their Discord (Base ecosystem)
- Or open an Issue / PR on https://github.com/coinbase/x402

**DM template** (concise, builder→builder):
```
gm @jessepollak — built Mainstreet on top of x402.

reputation oracle for onchain agents on Base. 405 indexed from the x402 Bazaar, scored daily. now also pinging each service URL to verify alive. Bonus: agents that respond properly get +5, dead -3.

example output: https://avisradar-production.up.railway.app/agent/0x2bb72231eed303cc91a462a1fa738b42b6a9ac6d
spec: https://avisradar-production.up.railway.app/.well-known/x402.json
```

---

## 6. Awesome lists (low effort, high SEO)

Open PRs to add Mainstreet entry:
- https://github.com/base/awesome-base
- https://github.com/coinbase/x402 (README "Built with x402" section if exists)
- https://github.com/erc-8004/awesome-erc-8004 (if exists)
- https://github.com/josephburkhart/awesome-agentic-payments (or similar)

**PR commit message template**:
```
Add Mainstreet — reputation oracle for onchain agents on Base

Public leaderboard scoring all x402 + ERC-8004 agents on Base.
405 indexed. Free reads + paid live refresh via x402.
MIT licensed, OpenAPI spec available.

- Live: https://avisradar-production.up.railway.app/leaderboard.html
- Source: https://github.com/philpof102-svg/mainstreet
```

---

## 7. Press / writers

**Targets**: @samuelhuber (DeFi), @thefrogmonk (agents on Base), @0xfoobar (security/oracles).

**Pitch DM**:
```
hi — built something that might interest you. Mainstreet is the first public reputation oracle for onchain agents on Base. Free leaderboard ranking 405 agents by x402 activity + ERC-8004 feedback + live endpoint health.

If it helps, here's a 1-paragraph story angle: "no one currently knows which agents in the Coinbase x402 Bazaar are actually alive — we just pinged 25 of them, only 17 responded. Mainstreet surfaces that gap."

happy to write a guest piece or just feed you data.
```

---

## Tracking

After each DM:
1. Note the date + channel here in this file
2. If no reply in 5 days, send 1 follow-up max
3. If accepted/listed, add to README.md badges

| Target | Channel | Sent date | Status |
|---|---|---|---|
| agentic.market | — | — | not sent |
| Olas | — | — | not sent |
| Virtuals | — | — | not sent |
| ChainLens | — | — | not sent |
| Jesse Pollak | — | — | not sent |
| Awesome lists | — | — | not sent |
| Press | — | — | not sent |

---

## Recurring (weekly)

- Cast 1 thread on Farcaster (top movers, new agents, formula breakdown, story angle)
- Reply to 5 agent-related casts on Warpcast with our angle
- Submit 1 new "awesome" list PR
- DM 1 new agent that just appeared on the leaderboard with a "you just made top 50" template
