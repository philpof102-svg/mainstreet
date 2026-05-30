# Service health probe

How Mainstreet verifies which x402 agents on Base are actually alive.

## Why

The x402 Bazaar lists thousands of services. Many were published months ago and the endpoint is now dead, behind a paywall the operator stopped paying, or returns 500s. **No other oracle verifies this**. Mainstreet does — daily.

## How it works

Cron `0 4 * * * UTC` runs `scripts/mainstreet-health-probe.js` upstream. For each indexed agent that has a `resource_path`:

1. Send `HEAD` with 5s timeout, polite UA, max 2 redirects.
2. If `HEAD` returns `405 Method Not Allowed` or fails, retry with `GET` (32KB max response).
3. Classify the response.

## What counts as "alive"

These HTTP statuses are treated as alive:

| Status | Why alive |
|---|---|
| 200, 201, 204 | Standard success |
| 401 | Auth required — server is up, just needs creds |
| **402** | **x402 paywall — this is the expected gating response** |
| 403 | Forbidden — server is up, refusing this UA/IP |
| 405 | Method not allowed — server up, doesn't support HEAD |

Anything else (5xx, network error, timeout, DNS failure, SSL failure) → dead.

## Polite scanning

We respect ourselves and the agents we probe:

- **Concurrency cap**: 8 simultaneous probes.
- **Timeout**: 5 seconds per request.
- **UA**: `MainstreetHealthProbe/1.0 (+https://avisradar-production.up.railway.app/proof.html; opt-out: email philpof97@gmail.com or block this UA in robots.txt)`.
- **Refresh**: 23h cache. If we probed your endpoint less than 23h ago, we don't probe again.
- **Skip template URLs**: anything with `:param` or `{addr}` in path is marked dead with reason `template_url`.

## Opt-out

Three ways for an agent operator to opt out:

1. Email `philpof97@gmail.com` with the address you want delisted from probing.
2. Add `Mainstreet*` to your `robots.txt` Disallow.
3. Return any non-alive status to our UA specifically (e.g. UA-based reject).

## Score impact

Health affects the score by ±5 / -3 pts:

| Status | Score bonus |
|---|---|
| Alive (probed within 24h) | **+5** |
| Dead (probed within 24h, failed) | **-3** |
| Never probed | **0** (no impact) |

A 100-service agent at score 30 becomes 35 if alive, 27 if dead.

## Querying

Health is exposed in several places:

```bash
# Per-agent health in /score response
curl https://avisradar-production.up.railway.app/api/agent/score/0x2bb72231eed303cc91a462a1fa738b42b6a9ac6d \
  | jq .health
# { "alive": true, "status": 402, "probedAt": "2026-05-30T..." }

# Aggregate stats — uptime %, alive top
curl https://avisradar-production.up.railway.app/api/agent/health-summary
# { "alive": 17, "dead": 5, "uptimePct": 77, "aliveTop": [...] }

# Agent profile page shows green/red pill
open https://avisradar-production.up.railway.app/agent/0x2bb72231eed303cc91a462a1fa738b42b6a9ac6d
```

## Honest about limits

A 200 / 402 response only proves the endpoint is online and routing. It does NOT prove the service actually does what it advertises. For deep verification, a buyer agent should:

1. Use health as a first filter (`alive === true`)
2. Use MainStreet score as a second filter (`score >= 30`)
3. Run a small test transaction to verify quality
4. Submit ERC-8004 feedback after each interaction (closes the loop)

Health is necessary but not sufficient.

## Roadmap

- v0.5: response time tracking (p50, p95) — slow endpoints get a penalty
- v0.5: SLA score (uptime % over 30 days)
- v0.6: opt-in `/health` endpoint convention — agents that expose a standard health endpoint get verified deeper
