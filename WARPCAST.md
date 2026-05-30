# Warpcast launch cast — ready to copy/paste

Pick one. All under 320 chars.

---

## Option A — Direct launch (recommended)

```
the first public reputation oracle for onchain agents on Base is live.

405 agents indexed
scored daily on x402 activity + ERC-8004 feedback + live endpoint health
free reads · $0.05 USDC for a fresh score via x402

https://avisradar-production.up.railway.app/leaderboard.html
```

---

## Option B — Question hook

```
before your agent pays another agent on Base, do you check its reputation?

we just shipped MainStreet — public reputation oracle for x402 + ERC-8004 agents.
405 indexed. free reads. live refresh via x402.

https://avisradar-production.up.railway.app/leaderboard.html
```

---

## Option C — Builder angle

```
spent 3 days building MainStreet — reputation oracle for onchain agents on Base.

scores every x402 agent on activity + ERC-8004 feedback + live endpoint health. 405 indexed so far.

free leaderboard + JSON API + embeddable badge.

open source, MIT
https://github.com/philpof102-svg/mainstreet
```

---

## Option D — Stat hook

```
indexed 41,753 x402 services on Base.
distilled to 405 unique providers.
scored daily, 17/25 endpoints verified alive in last probe.

free reputation oracle for onchain agents:
https://avisradar-production.up.railway.app/leaderboard.html
```

---

## Cast as a Frame (interactive)

Instead of casting the leaderboard URL, cast this Frame URL — Warpcast renders it as a mini-app with buttons (Next page / View full / Claim badge):

```
https://avisradar-production.up.railway.app/api/agent/frame/leaderboard
```

You can also cast a specific agent address — preview shows a big card with score:

```
https://avisradar-production.up.railway.app/agent/0x2bb72231eed303cc91a462a1fa738b42b6a9ac6d
```

---

## Reply templates (if people engage)

**Someone asks "what's the score formula"**:
> 45 pts activity (log10 of services published on x402) + 20 pts recency + 30 pts ERC-8004 feedback bonus + 5 pts if endpoint pinged alive in last 24h. Capped 0-100. Full formula: avisradar-production.up.railway.app/mainstreet.html#how

**Someone asks "how do I get listed"**:
> auto-indexed. publish a service on the x402 Bazaar via Coinbase CDP, settle 1+ payment, and you appear in the next 24h sync. Claim a verified badge to embed your score on your site: avisradar-production.up.railway.app/mainstreet.html#claim

**Someone asks "is it open source"**:
> yes — MIT, github.com/philpof102-svg/mainstreet. Core scoring + ERC-8004 reader. Service is multi-tenant, runs as a single Node process. Token contract verified on Sourcify (full_match).

**Recap line for any reply**:
> built solo, shipped in a week, no VC, 22 endpoints + OpenAPI spec, dynamic OG cards per agent. avisradar-production.up.railway.app
