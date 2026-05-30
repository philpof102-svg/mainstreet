# Mainstreet — Base x402 ecosystem scan (2026-05-30)

First full scan of the Coinbase Developer Platform x402 Bazaar after indexing all 41 753 resources.

## Headline numbers

| Metric | Value |
|---|---|
| Total resources in Bazaar (all networks) | 41 753 |
| Unique payTo on Base mainnet (eip155:8453) | **405** |
| Resources concentrated under top-1 (Polymarket) | 27 195 (65%) |
| Agents with ≥10 services | 88 (the real business cohort) |
| Agents with exactly 1 service | 163 (hobby / early adopter pool) |
| Price p50 / p90 USDC | $0.02 / $0.50 |

## Category mix (rough keyword classification)

| Category | Count | % |
|---|---|---|
| AI / agents | 114 | 28% |
| Crypto / DeFi | 101 | 25% |
| Data / stats | 26 | 6% |
| News | 19 | 5% |
| API / generic | 20 | 5% |
| Sports | 9 | 2% |
| Gaming | 2 | <1% |
| Other | 114 | 28% |

## Strategic read

1. **Our ICP is real and addressable.** 114 agents on Base self-identify as AI/agents. These are exactly the buyer agents who need a vetting signal before paying another agent. They are not a hypothetical 2027 market.

2. **The discovery layer is winner-takes-most.** Polymarket alone holds 65% of total resources. The remaining 404 agents share the long tail. A leaderboard that surfaces the long tail by **quality** rather than **volume** is non-obvious value.

3. **Pricing fit.** Median service price is $0.02. Our /score?live=1 at $0.05 sits in the premium-but-reasonable band — defensible since it aggregates 3 sources (x402 facilitator + ERC-8004 + planned ACP).

4. **Early adopter pool is bigger than the business pool.** 163 single-service agents > 88 multi-service agents. Onboarding a hobby agent to claim a badge is easier (low stakes, no enterprise risk).

5. **No direct competitor found.** 0x24FAcafEB has 90 services including one called "Register an AI agent and create a reputation profile" — but it's a generic data-tools wallet (ClinVar, news, MLB), the "register" line is one product among 89 unrelated ones. **Mainstreet appears to be the first public reputation oracle on Base.**

## Implications for next 30 days

- **Outreach** : prioritize the 88 multi-service agents (business cohort) for /badge/claim invitations. The 163 single-service ones get a self-serve flow via /leaderboard.html SEO.
- **Pricing** : keep $0.05 for /score?live=1. Consider bundle ($0.50 for 20 scores) when buyer agents start querying systematically.
- **Distribution** : Polymarket's dominance proves the indexer works for high-volume producers. To beat Mainstreet's own 0-indexation problem, run the weekly settlement cron + cluster ≥5 paid hits in a single day to trigger the discovery threshold.
- **Moat** : ERC-8004 is on-chain, anyone can read it. Our moat is the **aggregation pipeline** (Bazaar + ERC-8004 + soon ACP escrow), the **score formula**, and the **distribution surface** (leaderboard + badges).
