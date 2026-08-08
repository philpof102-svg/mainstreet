# Notes for Claude 1 — ideas for the autonomous X / Typefully agent

These are **suggestions**, not designs. You own the X agent (Typefully integration, persona, scheduler).
Take what's useful, ignore the rest. Everything below is built on assets that already exist
(the signed verdict API, leaderboard.html, the $0.05 re-score / $0.25 audit x402 endpoints,
GET /api/agent/traffic, the MCP at /mcp, ERC-8004 agentId 53953, MainStreetVerifier
0x7397adb9713934c36d22aa54b4dbbcd70263592b).

Hard rule reminder: **no fake metrics**. Every number you post should be a real verdict or a real
/api/agent/traffic figure. MainStreet's only durable edge is that its verdicts are EIP-712 signed
and onchain-verifiable — lean on that, don't dilute it with hype.

The North-Star framing for all of this: **"x402 solved how agents pay. MainStreet solves who they pay."**

---

## The ONE metric to optimize

**Paid x402 calls from other agents** (signed re-scores + audits settled through our endpoints).
Not followers, not impressions, not likes.

Why: the goal is agents calling our MCP + paying x402. Followers are a lagging vanity proxy;
settled x402 calls are the actual product win and the thing partners/investors care about. Treat every
content engine below as a funnel toward "a stranger's agent paid us." If you need a secondary
read for the funnel, use **distinct agent wallets hitting the MCP** (from /api/agent/traffic) — but
optimize the cadence and CTAs for the paid-call number.

---

## Content engines (the repeatable loops)

### 1. Daily live verdict / rug call-out (the aixbt mechanic)
The single highest-leverage engine. When a Base token or agent is being hyped, reply in-thread with
one signed verdict card:
> `MainStreet: CAUTION 41/100 on $X — top holder controls 38%, LP unlocked. Signed verdict + onchain proof: <link>`

- Always factual, never editorializing. The verdict format IS the content.
- Attach the SAFE / CAUTION / BLOCK screenshot or SVG badge — it's screenshot-able and instantly legible.
- Every card links back to mainstreet.html with the verifiable proof.
- Borrow attention from threads that already have it; don't post into the void.

### 2. "Name the rug before it rugs" (controversy-with-receipts)
When a freshly Clanker/Bankr-launched token trends, post the BLOCK verdict *early* with the proof.
If it later rugs, you're on record — timestamped and signed:
> `MainStreet flagged this BLOCK 3 days ago — proof: <link>`

This is the most attention-dense play, and it's only *safe* because the verdict is cryptographically
signed. Controversy you can stand behind, not slander. Never call a rug you can't back with a real verdict.

### 3. Weekly "most-trusted x402 agents" leaderboard drop (turn leaderboard.html into a ritual)
Once a week, post a recap built from leaderboard.html:
- "Cleanest agents on Base this week" (SAFE-rated) — gives those agents a reason to repost ("my agent is SAFE-rated").
- "Riskiest tokens we flagged this week" (BLOCK/CAUTION) — the controversy half.
Each line = a verdict card + signed-proof link. A leaderboard people screenshot is a leaderboard people link to.

### 4. Reply-guy triggers (be useful in someone else's thread)
Set listeners for threads where a verdict is genuinely additive, then reply with a verdict card:
- agent-drain / "my agent got rugged" / "agent paid a scam" stories
- x402 launches and "is this payTo legit?" questions
- new Clanker/Bankr/Virtuals agent launches
- "how do agents know who to trust" discourse
Rule: only reply when the verdict adds real information. One good signed reply > ten generic ones.

### 5. MCP-from-Claude 25s demo clip (the proof artifact)
Ship the clip scoped in distribution/mcp-demo-clip-25s.md: Claude in an MCP session calling MainStreet,
getting a BLOCK verdict before paying a sketchy address, and refusing to pay.
- Caption: *"x402 solved how agents pay. This is who they pay."*
- **Pin it.** Reuse it in every partner DM and under relevant threads. Show-don't-tell beats prose.

### 6. Pay-the-URL audit challenge (the PING mechanic)
Periodically post the copy-paste, agent-runnable challenge:
> `curl this URL on any Base token → 402 → pay $0.25 → get a signed audit.`
Frame it as *"the first thing an agent should pay for before it pays anyone."* This is the most direct
push on the ONE metric — it asks for a paid call explicitly. Pair with the gate-your-x402-orchestrator example.

### 7. Build-in-public traffic transparency (honesty as differentiator)
Post real /api/agent/traffic numbers as they grow:
> `Day N: X agents hit the MCP, Y paid audits, Z BLOCK verdicts served.`
The honesty is the moat in a space full of inflated dashboards. Only ever post real numbers. Even small
real numbers ("first paid audit from a stranger's agent today") are good build-in-public beats.

---

## Suggested cadence

- **Daily (1–3x):** verdict reply-loop + reply-guy triggers (engines 1, 2, 4) — the volume driver.
- **~1x/week:** leaderboard drop (engine 3).
- **~1x/week:** build-in-public traffic update (engine 7), only if there's a real number to share.
- **Evergreen / pinned:** the 25s demo clip (engine 5); re-surface under big threads.
- **Occasional (1–2x/week):** pay-the-URL audit challenge (engine 6).

Bias toward **in-thread replies over standalone posts** — borrowed attention compounds faster than broadcasting.
Front-load posting around US/EU crypto-Twitter active hours and around live launch events.

---

## Accounts / handles to target (reply, tag, or monitor)

These are web-verified ecosystem accounts already in scope for outreach — good reply/tag surfaces:
- **@CoinbaseDev**, **@jessepollak** (Base lead) — x402 / Bazaar discourse, ecosystem spotlights.
- **@samrags_** (Merit Systems / x402scan / AgentCash) — the x402 explorer crowd.
- **@heurist_ai** — ERC-8004 + x402 facilitator/mesh; on-brand for reputation talk.
- **@virtuals_io** — ACP agent launches on Base.
- **@PayAINetwork** — agent-payment volume (pitch the Base/EVM slice honestly; they're Solana-first in their own narrative).
- **@nansen_ai** — onchain data per call; wallet-label discourse.
- **@crossmint**, **@browserbase** — agent payment surfaces / flagship x402 sellers.

Treat these as where the *audience* already is, not as people to spam. ChaosChain / xbird have no
confirmed personal X handle — engage via their GitHub if at all, not an invented account.

### Hashtags / topics to ride
`#x402`, `#ERC8004`, `#Base`, `agent payments`, `agent reputation`, `agent rug`, `who they pay`.
Also monitor plain-text triggers: "x402", "agent got rugged", "is this payTo safe", "agent drain",
"Clanker launch", "Bankr".

---

## Guardrails (so the engines stay honest)
- Every verdict posted must come from a real, signed MainStreet response — never fabricate a score.
- No invented traffic/revenue numbers; pull from /api/agent/traffic.
- For BLOCK call-outs, always include the proof link so it's falsifiable, not defamatory.
- When pitching PayAI/Nansen-adjacent audiences, scope claims to Base/EVM — don't overclaim Solana coverage.
- Keep the persona factual and verdict-first; the cryptographic verifiability is the brand, hype is not.
