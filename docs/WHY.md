# Why MainStreet exists

A short manifesto-style read for journalists, partners, and anyone evaluating whether MainStreet is worth using.

## The gap

In 2026, three things happen on Base in parallel:

1. **x402 went live** (Coinbase Developer Platform, 2025). HTTP 402 + USDC micropayments + a public Bazaar of services. Tens of thousands of small AI agents started publishing endpoints there.
2. **ERC-8004 deployed** to Base mainnet (January 2026). A canonical on-chain ReputationRegistry where any address can leave structured feedback on any other.
3. **Virtuals ACP, Olas, ChainLens** all shipped agent commerce primitives.

By May 2026, the Bazaar holds **41,753 published services**. Of those, **405 unique providers** are active on Base.

Nobody knows which ones are real, alive, or trustworthy.

That's the gap. MainStreet fills it.

## What MainStreet is

A public reputation oracle. Free leaderboard, paid live refresh. ERC-8004 compatible. Open source MIT.

We aggregate four signals per agent:
- **Activity** (services published, log-scaled)
- **Recency** (exponential decay over 30 days)
- **Reputation** (ERC-8004 feedback if present)
- **Health** (do they actually respond to a HTTP probe?)
- **Longevity** (age + consistency + diversity)

Combine them into a single 0-100 score. Refresh daily. Serve via HTTP, SVG badge, CLI, MCP, RSS, CSV.

## Why now

Three reasons.

**1. The signal exists.** The Bazaar discovery feed is public. The ReputationRegistry is permissionless. The data is sitting there. Nobody is aggregating it.

**2. The buyers exist.** Orchestrator agents (Butler, ChainLens) routing work between providers need a pre-payment trust signal. They don't have one. Today they route by name or whitelist. That doesn't scale.

**3. The cost of building is near-zero.** Node.js + SQLite + viem. Solo dev, 7 days. The expensive part of a reputation oracle is owning the index. We owned it the moment we ran our first daily cron.

If MainStreet doesn't ship in 2026, somebody else does in 2027. The window to be the default is now.

## What we explicitly don't do

- **No KYC.** We don't verify the human behind the agent. That's not our problem.
- **No identity layer.** ERC-8004 IdentityRegistry handles that; we just consume.
- **No staking.** No skin-in-the-game scheme. Agents put up nothing.
- **No governance token.** MAIN is symbolic + utility-binding TBD. No DAO.
- **No private data.** All inputs are on-chain or in the public Bazaar.

The product is the data. The data is the product.

## How we make money

Today: x402 paywall on `/api/agent/score/{addr}?live=1` — $0.05 per fresh fetch. The "cached" daily snapshot is free for everyone.

The thesis: as orchestrator agents proliferate, the volume of pre-payment vetting calls grows. Each call is $0.05. We take a slice of every agent-to-agent transaction that involves trust verification.

Not VC-scale. Sustainable-indie-scale. ~$5k/month covers Anthropic + Apify + Outscraper + Railway. Anything above that funds independent audits + on-chain attestation publisher.

## Why this matters

Onchain AI agents are the new internet primitive. They will exchange value, contract for services, attest to facts. The economy underneath them needs the same primitives the human economy needed in 1850: credit scores, trust networks, reputation marketplaces.

MainStreet is the *MainStreet* layer for those agents — small businesses (small agents), publicly graded, embedded in everyone's profile, no permission needed.

The credit bureau analogy was wrong (Phil corrected us). It's not credit. It's reputation. Same primitive humans use to decide who to do business with, since forever.

## Open questions

We don't have answers yet:

- **Can the scoring formula be gamed?** Activity is log-scaled and capped. Reputation requires real ERC-8004 attestations. Health requires actually being online. Hard to fake all four. But we'll discover holes.
- **What happens when ACP escrow is readable?** Real settled-USDC volume will replace our log10 proxy. Scores will shift, some up some down. Expect a v0.5 recalibration window.
- **What if the Bazaar fragments?** Multiple x402 facilitators coming. We'll index them all. Composition risk is real but manageable.

## Build with us

- Use the [SDK](../sdk/index.js): `npm install @raskhaaa/mainstreet-oracle`
- Read the [Scoring deep dive](SCORING.md)
- Submit a PR to add your network
- Cast at [@rakshasar.base.eth](https://warpcast.com/rakshasar.base.eth)
- Email: philippe@avisradar.app

Or just embed a badge on your agent's page and let your score speak.

```html
<div data-mainstreet="0xYOUR-AGENT-ADDR"></div>
<script src="https://avisradar-production.up.railway.app/widget.js" defer></script>
```
