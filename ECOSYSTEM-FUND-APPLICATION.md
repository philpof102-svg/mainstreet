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
The trust layer agent-to-agent finance is missing. One call returns a **SAFE / CAUTION / BLOCK** verdict
for any Base wallet, agent or token, plus a 0–100 reputation score **when we have one** — folding
ERC-8004 ReputationRegistry feedback, x402 facilitator settlements, and Virtuals ACP completions into a
single **EIP-712 signed, onchain-verifiable** score. The "is this counterparty safe to pay?" preflight
before an agent routes USDC.

When we have no score for a subject the response says so — `score: null`, `score_basis: not-indexed` —
rather than returning a neutral-looking number, and that verdict is deliberately left **unsigned**:
the signer coerces a missing score to `0`, so signing one would put the operator key behind a "score
0" nobody measured. `attestation_status` distinguishes `signed` / `unsigned:no-score` /
`unsigned:disabled` / `unsigned:error`, because a bare `null` cannot tell you which.

That distinction is not decoration. Until 2026-08-01 this endpoint returned a fabricated 50 in exactly
that case, and — found the same day, by an adversarial review of the fix itself — it had never
produced a signature at all. Both are written up in the risks section below rather than left for a
reader to find.

**Real coverage (live API `/api/agent/coverage`, read 2026-07-31 19:23 UTC):**
- **1,956** Base agents indexed · **1,423** scored · **448** attestations EIP-712 signed, of which
  **19** are additionally published onchain via EAS
- **15,200** ERC-8004 identities · **9,804** Virtuals agents catalogued · **7,328** unique buyers seen
- **13,895** onchain-behaviour proofs attached to wallets across **16** proof types (DeFi lending, DEX
  trading, basenames, smart wallets, shipping history) — the evidence a score is computed from.
- **2,113,240** x402 settlements / **$395,924** USDC volume *captured by our indexer* — our slice, not the
  ecosystem (ecosystem-wide: ~163.8M settlements / ~$46.9M all-time, per x402.fuchss.app).
- Live window, republished after six weeks dark: **181,748** settlements / **$23,869** in the last 24h,
  indexer lag **0.2 hours** at time of reading.
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
> **What is still fragile, stated plainly.** This runs on a free public RPC endpoint, not on funded
> infrastructure. Until 2026-07-31 the configured provider was a free tier capping `eth_getLogs` at a
> 10-block range, so every run paid a wasted call before failing over; that variable now points
> straight at the public Base endpoint and the wasted hop is gone. What replaced it is not redundancy:
> six free public Base endpoints were probed the same day with a 5,000-block `eth_getLogs` and exactly
> **one** is usable — two return HTTP 521, one times out on its free plan, one caps at 50 blocks, one
> does not implement the method, one demands a token. So there is currently no second free endpoint to
> fall back to, and we would rather say that than describe a failover chain of length one as resilience.
> The client takes a comma-separated list, so a paid endpoint is a config change the day there is one —
> and ask #3 below is exactly that: turn a recovery that works into a pipeline that scales.

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
  because the mitigation is honest reporting on top of a **single free** RPC endpoint — the pipeline has
  no funded headroom, and measurement says there is no second free endpoint worth failing over to. It
  works; it is not yet robust. That is ask #3.
- **It was not one indexer. By the end of 2026-07-31 it was nine jobs, and we went looking for eight of
  them.** The same RPC endpoint string was copy-pasted across the repo — 23 copies, counted — so one
  provider change silently disabled every job that read event logs, and the July repair fixed exactly
  the one we happened to be looking at. What each of them printed while broken is the point: not an
  error, but a confident zero. `indexed 0 new token launches across 3 factories`. `done — 0 new proofs,
  0 eligible wallets`. Sentences that assert something about Base, when what had happened is that we
  could not read Base.
  The tally, all measured on production rather than inferred:
  - *three on-chain indexers* — settlements (six weeks), ERC-8004 feedback (43.6 days), identity
    (~42.5 days). Detail below.
  - *the Virtuals catalog indexer* — every page rejected for months by two independent upstream
    changes: a now-required chain filter, and a field that stopped being a scalar. 6 rows held against
    54,728 agents available.
  - *the deployer indexer* — every block range refused, 3 factories, 0 events read.
  - *four proof jobs* (Morpho lending, Aerodrome trading, Clawd and Virtuals token buyers) — all four
    asked for 4,999-block ranges against a 10-block cap and swallowed every refusal without a log or a
    counter. Repaired and re-run on production the same day: **1,207 ranges read, 0 failed, 871 new
    proofs**, where all four had been reading nothing. Two of the four still report zero — and now say
    `status=ok, 540 ranges ok / 0 failed` beside it, so a real zero is distinguishable from a silent one.
  - *one more we did not go looking for*: the new fleet recorder caught an X-agent cron failing on an
    expired API credential within minutes of being deployed. That is the instrument working.
  **The structural answer is not 36 more hand-written status lines** — thirty-six copies of the same
  reporting block is the mistake that caused this. Every child the scheduler spawns is now recorded at
  the one place they all pass through: exit code, whether its own timeout killed it, duration, both
  stream tails. `/api/agent/status` publishes a `jobs` block that names failures, not successes. A
  healthy fleet shows an empty array there; ours currently shows one, and we have left it showing.
  Status of the three original indexers at the time of this reading, deliberately not rounded up:
  - *settlements* — repaired, lag **0 hours**, verifiable on `/api/agent/status`.
  - *ERC-8004 feedback* — was **43.6 days** stale. Caught up 2026-07-31 17:00 UTC in a single run:
    **260 chunks, 0 failed, 293 seconds, 90,169 feedback events recovered** (129,149 → 219,318 stored).
    Lag now 0. Mid-run it hit the free-tier `eth_getLogs` cap, failed over to a public endpoint by
    itself and finished — the failover is load-bearing, not decorative.
  - *ERC-8004 identity* — same cause, ~42.5 days behind, caught up 17:03 UTC: **368 chunks, 0 failed,
    120 seconds, 609 identities recovered**. That is why the figure above reads **15,200** and not the
    **14,591** we published earlier today — the count had stopped growing in mid-June, we said so, and
    then it moved the moment the pipeline did. Rewards stayed disabled through the catch-up: 23 payouts
    skipped, 0 sent, deliberately, because a backfill must not fire six weeks of side effects at once.
  All three now report `lag 0` and `status: ok` on `/api/agent/status`, each publishing its own cursor
  and last-run outcome. That endpoint is the check; it does not require trusting this document.
  Every job that reads Base now goes through one RPC module with failover, a cursor that refuses to
  advance past a gap, a per-run deadline and a published run outcome. **Live copies of the old endpoint
  string in the repo: 0**, down from 23 at the start of the day — the last eleven files were migrated
  the same evening. Four mentions survive on purpose: two forensic comments, the module header quoting
  the literal it replaced, and the test asserting we recognise that provider's refusal.
  A correction to this document's own arithmetic: an earlier revision today said "13 copies still in
  the repo". That number was wrong when written — a file-level count where the real figure was 15
  assignment sites across 11 files, because several files held two. It is stated here rather than
  quietly overwritten, for the same reason the outage is.
- **The outage did not stay inside the plumbing — it reached the paid verdict.** `/api/agent/audit`
  raises a medium-severity `no-identity-proofs` flag ("No multi-source identity proofs — unverified
  provenance") when a wallet's proof count is **zero**. Four of the pipelines that fill that count were
  producing nothing for six weeks, and they account for **44% of the evidence surface** (6,110 proofs
  against the ~13,900 total above; both read from `/api/agent/coverage`, a few minutes apart, which is
  why the totals differ by three). A single catch-up run yesterday added ~870. So a wallet that started supplying Morpho or
  trading agent tokens during the freeze read as zero-proof, and a paying caller could have been told
  its provenance was unverified when what was unverified was our own collection. We are naming the
  mechanism and the exposure; we did **not** verify the caller-visible effect at runtime, because that
  endpoint is x402-paid and we were not going to spend to produce a nicer sentence. Read in the
  deployed source, not exercised.
  **Fixed 2026-08-01, and it is the fix we would want a funder to judge us on.** A zero proof count is
  only a statement about the wallet if our collectors actually ran, so the verdict now checks that
  first. Healthy collectors → the hard claim stands, unchanged. Otherwise the flag becomes
  `proof-coverage-degraded` at **low** severity and says it in words: *provenance unknown, not absent —
  we did not finish looking*. Low on purpose: an unknown is not a risk signal and must not be priced
  as one. The check reads what the scheduler **recorded** the collectors doing, not what they were
  scheduled to do, because a job that never fires looks exactly like a job that succeeds — that is the
  whole reason six weeks went unnoticed — and a six-week-old success counts as stale, not as healthy.
  `/api/agent/status` publishes `jobs.proofCoverage` and it currently reads **6 of 14 collectors
  healthy**, so the endpoint is downgrading its own claim right now, in public, and will keep doing so
  until each collector's cron has proven itself. An oracle must distinguish "no evidence exists" from
  "we failed to look". Ours could not. Now it can, and it says which one it is looking at.
- **The paid verdict was publishing a score nobody had measured. Found and fixed 2026-08-01, and it is
  the worst thing in this document.** `POST /api/agent/check` — the x402 endpoint at the top of this
  page — computed its verdict from `let score = 50`, and that 50 survived every failure path. Driving
  the pre-fix function with injected fakes returns it four times over: for a subject with no
  leaderboard row, for a NULL score column, for an unreadable score table, and — the serious one —
  for a run in which the denylist lens itself threw and silently disappeared. All four came back
  `verdict: CAUTION, score: 50` to a caller who had already paid. On the wire a fabricated 50 was
  byte-identical to a measured 50.
  **A correction to an earlier revision of this paragraph, made hours after writing it.** It said the
  fabricated verdict was "EIP-712 signed". It was not. An adversarial review of our own fix found
  that this endpoint has *never* produced a signature: it passed the raw verdict object to the
  signer, whose EIP-712 type declares `subject` as `bytes32` while a verdict carries a 20-byte
  address, so every call threw `BytesSizeMismatchError` into a bare `catch` and returned the same
  `null` that "signing is disabled" returns. A total failure was indistinguishable from a config
  choice — the very defect this section is about, sitting in the error handling of the fix for it.
  So the fabricated score was real and was paid for, but nothing was signed over it. Both are now
  true: the score is honest, and the signature works and is published with its payload, because a
  signature over fields the caller cannot see is not verifiable. The 448 signed attestations counted
  above are a different, working pipeline and were never affected.
  The exposure was never bounded by our catalogue: `/check` accepts any `0x` address, so every subject
  outside the snapshot got one. Of **1,956** indexed agents, **1,000** are in today's snapshot; every
  address that has never been scored, in our index or out of it, received the default.
  Two things make this worse than the entry above and we would rather state them than have a funder
  find them. First, our **free** `/preflight` route has always been honest about exactly this —
  it emits `score: null` when there is no row. The surface that charged money was the dishonest one.
  Second, our own gated proxy carries the rule in a comment: *"A trust gate that fails open is not a
  trust gate."* The paid path failed open.
  Fixed: `score` is `null` when unmeasured and carries a `score_basis` of `measured` / `not-indexed`
  / `degraded`, plus the `scored_at` snapshot date it came from. A verdict we could not compute now
  returns BLOCK with HTTP 503 **and does not charge** — the credit used to be burned and the x402
  payment settled before the verdict was ever computed, with no refund path. Verified by 18 assertions
  against the shipped module, and separately by confirming that 4 of those assertions **fail** against
  the pre-fix code, so the test discriminates rather than merely passing. The endpoint had no test at
  all before today; that is how this lasted.
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
*Prepared 2026-07-17; outage-audited 2026-07-18; settlement indexer root-caused and fixed 2026-07-30; on
2026-07-31 eight further jobs were found reading nothing, the shared cause traced, the RPC layer
deduplicated and the whole scheduled fleet instrumented; figures re-read live 2026-07-31 19:23 UTC.

All figures are verifiable at the cited endpoints on that date. `/api/agent/status` publishes each
indexer's cursor and last-run outcome, plus a `jobs` block naming any scheduled job whose last run
failed — so anyone can check whether we are frozen without taking our word for it, and that block is
currently not empty.

This document has been revised eight times across 2026-07-31 and 2026-08-01, each time in the uncomfortable direction, and
three of those were corrections to our own claims: a staleness figure published 3.5x in our favour
because it was measured from the newest stored row rather than the scan cursor; a catch-up estimate of
~3.6 days taken from a laptop when production did it in 293 seconds; and a count of "13 remaining
copies" that was a file count where the real figure was 15 sites across 11 files. All three are
corrected above rather than quietly replaced. The rule that made us disclose the freeze applies to our
own bad numbers too — including the ones nobody would have checked.*
