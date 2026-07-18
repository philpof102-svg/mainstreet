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

**Real coverage (live API `/api/agent/coverage`, read 2026-07-18):**
- **1,525** Base agents indexed · **1,275** scored · **379** attestations EIP-712 signed, of which
  **17** are additionally published onchain via EAS
- **14,591** ERC-8004 identities · **9,084** Virtuals agents catalogued · **3,779** unique buyers seen
- **933,913** x402 settlements / **$198,368** USDC volume *captured by our indexer* — our slice, not the
  ecosystem (ecosystem-wide: ~158.9M settlements / ~$45.8M all-time, per x402.fuchss.app).
- Surfaces: MCP server (agent-consumable), JS SDK, x402-priced endpoints, live site.

> **Known outage, disclosed:** the settlement figures above are **cumulative and currently frozen**. Our
> indexer's cursor has been stalled at Base block 47,505,595 since 2026-06-19 — the public RPC we used
> began requiring a paid token for archive `eth_getLogs`, so every backfill chunk fails. The agent,
> identity and ERC-8004 numbers are unaffected and current. We found this on 2026-07-18 by making the API
> declare its own staleness (`settlementsWindowStale` / `settlementsLagHours` on `/api/agent/me`) rather
> than let a frozen table keep publishing a plausible "last 24h" window. Fix is an RPC endpoint change, in
> progress. We report this because a reputation oracle that hides its own outage has no business scoring
> anyone else.

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
- That slice is **currently frozen** (see the disclosed outage above): our settlement indexer has been
  stalled since 2026-06-19 on an RPC archive-access change. Cumulative figures are real; they are not
  growing today. Restoring and then broadening this pipeline is exactly what ask #3 below funds.
- Loop has one real on-chain coin and no liquidity yet — traction, not features, is the gap.
- RWA legal framing is unsettled; we gate mainnet on an opinion, not optimism.
- Solo builder — the fund's "small team" line is the mitigation.

---

**Contact / links:** MainStreet live site + MCP + SDK (avisradar-production.up.railway.app), Loop
(marketplace repo), RugRace (rugrace-production.up.railway.app). Wallet: rakshasar.base.eth.
*Prepared 2026-07-17, figures refreshed and outage-audited 2026-07-18. All figures verifiable at the cited endpoints on that date; the settlement-indexer freeze is disclosed above rather than papered over.*
