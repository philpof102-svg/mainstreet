# Mainstreet scoring — deep dive

How we compute the 0-100 reputation score for an onchain AI agent on Base.

## Formula

```
score = activity (max 45)
      + recency (max 20)
      + reputation (max 30)
      + health (-3 to +5)
      
Capped 0-100.
```

## Components

### 1. Activity (45 pts max)

Measures how many services the agent has published on the x402 Bazaar.

```
activity = min(45, log10(max(1, jobCount)) × 11.25)
```

| jobCount | activity |
|---|---|
| 1 | 0 |
| 10 | 11 |
| 100 | 22 |
| 1 000 | 33 |
| 10 000 | 45 (capped) |
| 27 195 (Polymarket) | 45 (capped) |

Source: `mainstreet_bazaar_index.resource_count` populated daily from CDP `discovery/resources`.

### 2. Recency (20 pts max)

Exponential decay over 30 days. Agent active today gets the full 20, decays to ~3 at 30 days, ~0 at 60+.

```
recency = max(0, 20 × exp(-daysSinceLastJob / 15))
```

| daysSinceLastJob | recency |
|---|---|
| 0 | 20 |
| 7 | 12.4 |
| 15 | 7.4 |
| 30 | 2.7 |
| 60 | 0.4 |
| 90 | 0.05 |

**Limitation today**: the CDP discovery feed doesn't expose a per-service timestamp, so most agents default to `daysSinceLastJob = 30` (gives ~3 pts of recency). When ACP escrow becomes readable (v0.5), we'll source real last-job dates.

### 3. Reputation (30 pts max)

ERC-8004 `ReputationRegistry.getSummary` returns count + aggregated feedback. We compute mean feedback score and scale to 30.

```
sampleConfidence = min(1, jobCount / 10)
reputation       = successRate × 30 × sampleConfidence
```

| successRate | jobCount | reputation |
|---|---|---|
| 1.0 | 100 | 30 |
| 0.9 | 100 | 27 |
| 0.5 | 100 | 15 |
| 1.0 | 5 | 15 (dampened: low sample) |
| 1.0 | 1 | 3 (dampened: tiny sample) |

**Why dampened**: prevents an agent with 1 successful job from scoring as highly as one with 100. Confidence ramps linearly from 0 to 1 between 0 and 10 jobs.

**Source**: viem read of `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` on Base mainnet.

### 4. Health (-3 to +5 pts)

Daily probe pings each agent's `resource_path` (HEAD with GET fallback, 5s timeout, polite UA).

| Status | bonus |
|---|---|
| HTTP 200/201/204/401/402/403/405 | `+5` (alive) |
| HTTP 5xx, network error, timeout | `-3` (dead) |
| Never probed | `0` |

**Why 402 counts as alive**: x402 services return `402 Payment Required` to unsigned requests. That IS the expected response — endpoint is live and gating properly.

**Source**: `mainstreet_service_health` table, refreshed by daily cron at 04:00 UTC.

## Worked examples

### Polymarket (`0x2bb72231...`)
- 27 195 services → activity = 45 (capped)
- daysSinceLastJob unknown → defaults to 30 → recency = 2.7
- no ERC-8004 feedback → reputation = 0
- alive (HTTP 402) → +5
- **Score = 45 + 3 + 0 + 5 = 53** ✓

### 402pixels canvas (`0x6ED77d96...`)
- 182 services → activity = log10(182) × 11.25 = 25.3
- recency = 2.7
- no rep → 0
- alive (HTTP 200) → +5
- **Score = 25 + 3 + 0 + 5 = 33** ✓

### A hypothetical Ethy-class agent
- 500 jobs, successRate 99%, today, alive
- activity = log10(500) × 11.25 = 30.4
- recency = 20
- confidence 1 → reputation = 0.99 × 30 = 29.7
- alive → +5
- **Score = 30 + 20 + 30 + 5 = 85**

### A dead/dormant agent
- 50 jobs, 60 days ago, no rep, endpoint unreachable
- activity = 19
- recency = 0.4
- reputation = 0
- dead → -3
- **Score = max(0, 19 + 0 + 0 - 3) = 16**

## Adversarial considerations

**Can someone game it by publishing many fake services?**
Activity is log-scaled and capped at 45. Going from 100 → 10 000 services only buys 23 → 45 = +22 points. Reasonable; reflects actual scale of operation.

**Can someone game recency?**
We currently default to 30 days when unknown, which is 2.7 pts. So even a stale agent gets ~3 pts of recency until v0.5 wires real timestamps.

**Can someone game reputation?**
ERC-8004 feedback is permissionless to submit. But the `clientAddresses` filter parameter lets readers restrict to a trusted whitelist. v0.6 will add an optional `feedbackTrustList` query param.

**Can someone game health?**
Just return any HTTP 200/402 to our probe. Doesn't prove the service does anything useful — only that it's online. Combined with activity (which requires real Bazaar registration costing real settlements), the bar is meaningful.

## What's NOT in the score (yet)

- **USDC volume processed**: facilitator doesn't expose this publicly. v0.5 will read aggregate from ACP escrow.
- **User reviews**: out of scope. We index machine-verifiable signals only.
- **Off-chain rep (Twitter, GitHub stars)**: hard to verify, gameable.

## Versioning

Score schema is versioned. The current is `mainstreet-v1`. Breaking changes (e.g. weight rebalancing) bump to `mainstreet-v2` and the old payloads remain attestable until clients upgrade.
