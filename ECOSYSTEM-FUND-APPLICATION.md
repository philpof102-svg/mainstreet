# Base Ecosystem Fund — Request for Builders application

> In response to @buildonbase "Request for Builders: Funding the Future of Global Finance" (July 2026).
> Anti-hype rule: every number below is real and dated. Figures marked *indexed* are what our own
> indexer has captured (a slice), never presented as ecosystem totals. No projections are dressed as facts.

---

## Who
Solo builder (Philippe / rakshasar.base.eth), shipping on Base since 2026. Two production products that
land squarely on the two highest-priority RFB categories — **AI Agents** and **RWA** — plus a track record
of shipping money-handling contracts on Base mainnet with discipline (RugRace).

## The fit — two of your six categories, already live

### 1. MainStreet → "commercial applications for AI Agents"
The trust layer agent-to-agent finance is missing. One call returns a **SAFE / CAUTION / BLOCK** verdict +
a 0–100 reputation score for any Base wallet, agent or token — folding ERC-8004 ReputationRegistry
feedback, x402 facilitator settlements, and Virtuals ACP completions into a single **EIP-712 signed,
onchain-verifiable** score. The "is this counterparty safe to pay?" preflight before an agent routes USDC.

**Real coverage (live API `/api/agent/coverage`, read 2026-07-31 16:49 UTC):**
- **1,956** Base agents indexed · **1,423** scored · **448** attestations EIP-712 signed, of which
  **19** are additionally published onchain via EAS
- **14,591** ERC-8004 identities · **9,797** Virtuals agents catalogued · **7,295** unique buyers seen
- **2,096,868** x402 settlements / **$394,666** USDC volume *captured by our indexer* — our slice, not the
  ecosystem (ecosystem-wide: ~163.8M settlements / ~$46.9M all-time, per x402.fuchss.app).
- Live window, republished after six weeks dark: **213,921** settlements / **$25,150** in the last 24h,
  indexer lag **0 hours** at time of reading.
- Surfaces: MCP server (agent-consumable), JS SDK, x402-priced endpoints, live site.

> **Outage closed 2026-07-30 — the six-week freeze disclosed above is over.** The settlement indexer is
> back at the Base chain head. The cursor moved from **48,884,011** (frozen since 2026-06-19, 244 hours
> behind) to the live head, and the 24h window is being published again after six weeks of returning
> `null`. Since the fix: **+840,000 settlements** and **+$106,000** USDC captured. The 06:21 UTC
> scheduled run — unattended, not a boot run — reported `status: ok`, 3 of 3 chunks succeeded, lag 0.
>
> **The cause was ours, and none of it was on-chain.** Six defects, each hidden by the one before it:
> the scheduler killed the job at a 10-minute timeout while a single 5,000-block chunk costs ~11 minutes
> of RPC work, so no chunk ever completed and the cursor could never advance; the child's stderr was
> discarded, so 612 consecutive failures printed one cheerful "done" line — that is how a month-long
> freeze stayed invisible; `JSON.parse` on a cut-off response body threw straight past the adaptive
> range-splitter, so the one error the splitter existed to handle was the one it never saw; an *empty*
> body was then treated as a size problem, turning 612 doomed calls into 8,492; a run that scanned
> nothing reported `status: ok`; and one flaky topic batch out of ~34 discarded the other 33, which is
> why rows kept landing while the cursor sat frozen for ten days.
>
> **We also corrected a number in our own favour.** Staleness had been measured from the newest row in
> the table rather than from the scan cursor — it reported **70h** when the truth was **244h**. Rows can
> run ahead of the cursor because a partly-successful chunk still inserts them. The API now measures the
> cursor, because that is the only block height we can honestly claim to have *read*. A reputation
> oracle that hides its own outage has no business scoring anyone else, and that includes hiding it
> from itself.
>
> **What is still fragile, stated plainly.** This runs on free public RPC endpoints with automatic
> failover, not on funded infrastructure. The configured provider is on a free tier that caps
> `eth_getLogs` at a 10-block range; the splitter absorbs it, but at a cost of ~1,462 wasted calls per
> run. The failover keeps a dead provider from freezing us silently — it does not buy headroom. Ask #3
> below is exactly this: turn a recovery that works into a pipeline that scales.

Why it matters for *your* thesis: 24/7 agent finance at scale needs a safety rail. KYT tells an agent it's
*allowed* to pay; MainStreet tells it whether it's *safe* to pay. Complementary to the Coinbase agentic
stack, not competing with it.

### 2. Loop → "tokenization of real-world assets (RWA)"
A C2C resale marketplace where an AI agent does the work — **sell = 1 photo, buy = 1 sentence** — and trust
replaces the central brand. Every **delivered** deal can mint an onchain **provenance receipt** on Base's
native B20 issuer standard, **reputation-gated by MainStreet**. This is the honest answer to the RWA custody
problem: we don't tokenize a *claim on the good* (the trap that turns RWA projects into regulated
custodians); we tokenize the **fact that an honest deal happened** — a receipt, supply 1, "NOT a title, NOT
a security" written into the token itself.

**Built and tested (chain-free core + solidity, all green):**
- `LoopEscrow.sol` — optimistic buyer-first escrow (confirm anytime / seller claim after silence /
  dispute → disclosed-operator-only), fee earned **only on successful deals**, balance-conservation
  proven by fuzz. **13/13** foundry.
- Deal state machine (created→paid→shipped→delivered, evidence-gated, human-only disputes) — **11/11**.
- B20 provenance receipt, MainStreet-gated (PROCEED + score ≥ 60, fails closed) — **11/11**.
- Vision→listing pipeline + honest comparables pricing — shipped.
- One real coin minted on Base (`$BRAOUT`, tx onchain) proving the descriptor-only mint path.

## Track record — we ship money contracts on Base with discipline
RugRace (honest-rug game, live on Base mainnet): ephemeral one-contract-per-game engine, an 87-agent
adversarial security panel run before mainnet, descriptor-only (a human signs), reward = USDC only. Proves
we handle onchain funds with audit-panel + gate discipline, not vibes.

## What seed capital unlocks (concrete, not a wishlist)
1. **Third-party audit** of `LoopEscrow` + the B20 receipt path → the one gate between "13/13 tested" and
   Base mainnet for real-goods deals.
2. **Legal opinion** on the receipt-as-provenance framing (RWA without becoming a custodian) — the moat is
   only defensible if the legal line is clear.
3. **MainStreet indexer coverage** — broaden beyond the current slice toward ecosystem-scale settlement
   tracking (the honest gap named above).
4. Runway to take the solo build to a small team without diluting the anti-hype discipline.

## Why us
Nobody else holds **launcher + marketplace + reputation oracle** in one hand. Loop's custody problem becomes
a *reputation + escrow* problem — which MainStreet + the proven RugRace escrow pattern already solve. The
pieces are built and tested; the fund buys the audit, the legal line, and the coverage to go from a
working slice to global scale.

## Honest risks (we name them, per our own rule)
- MainStreet's settlement figures are an *indexed slice*, not the ecosystem — scaling coverage is real work.
- That slice froze for six weeks (2026-06-19 → 2026-07-30) on defects that were entirely ours, and it is
  fixed and back at the chain head (see above). We keep it in the risk list rather than the win column
  because the mitigation is honest reporting plus failover between **free** RPC endpoints — the pipeline
  has no funded headroom, and the provider currently in front caps `eth_getLogs` at 10 blocks. It works;
  it is not yet robust. That is ask #3.
- **It was not one indexer, it was three, and we only found that out on 2026-07-31.** All three on-chain
  indexers carried the same copy-pasted RPC endpoint, so one provider change froze all three within
  ~23,000 blocks of each other, and the July repair fixed exactly the one we happened to be looking at.
  Status at the time of this reading, deliberately not rounded up:
  - *settlements* — repaired, lag **0 hours**, verifiable on `/api/agent/status`.
  - *ERC-8004 feedback* — was **43.6 days** stale. Caught up 2026-07-31 17:00 UTC in a single run:
    **260 chunks, 0 failed, 293 seconds, 90,169 feedback events recovered** (129,149 → 219,318 stored).
    Lag now 0. Mid-run it hit the free-tier `eth_getLogs` cap, failed over to a public endpoint by
    itself and finished — the failover is load-bearing, not decorative.
  - *ERC-8004 identity* — same cause, repaired and closing its backlog. Its **14,591** figure above is a
    count that stopped growing in mid-June; it will rise as that backlog closes. We are publishing it as
    what we actually hold, not as current ecosystem coverage.
  The three now share one RPC module with a cursor that refuses to advance past a gap, a per-run budget,
  and a published run outcome each. The structural fix is the deduplication: one endpoint change can no
  longer take down three pipelines while two of them stay silent about it.
- We shipped a green status on a run that had read nothing, and measured our own staleness 3.5x in our
  favour, before catching both. The lesson we drew is structural, not a resolution to be careful: the
  API now records and publishes each indexer run's outcome, so the next freeze is visible on a public
  endpoint rather than in a log line nobody reads.
- Loop has one real on-chain coin and no liquidity yet — traction, not features, is the gap.
- RWA legal framing is unsettled; we gate mainnet on an opinion, not optimism.
- Solo builder — the fund's "small team" line is the mitigation.

---

**Contact / links:** MainStreet live site + MCP + SDK (avisradar-production.up.railway.app), Loop
(marketplace repo), RugRace (rugrace-production.up.railway.app). Wallet: rakshasar.base.eth.
*Prepared 2026-07-17; outage-audited 2026-07-18; settlement indexer root-caused and fixed 2026-07-30;
two further frozen indexers found, shared-cause traced and deduplicated 2026-07-31; figures re-read live
2026-07-31 16:49 UTC. All figures verifiable at the cited endpoints on that date — including
`/api/agent/status`, which publishes each indexer's last run outcome so anyone can check whether we are
frozen without taking our word for it. The freeze is reported above with the same precision as the
recovery, including the part we had not found yet when we last updated this document — and including one
figure we published too pessimistically and then corrected: we estimated the ERC-8004 catch-up at ~3.6
days from a local measurement; production did it in 293 seconds, and the corrected number is the one
above.*
