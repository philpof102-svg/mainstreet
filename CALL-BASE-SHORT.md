# Base call — the short version

*A conversation about what we shipped, not a pitch. Numbers read live 2026-07-31 morning.*

---

**The one line**
"x402 solved how agents pay. We're working on who they pay."

---

## What we shipped recently

**EIP-7702 delegated accounts — shipped this week.**
An EOA can now execute someone else's code, and the owner can repoint it whenever they like. We detect
the delegation designator, name the delegate, and vet *it* — because that's who you're actually paying.
Found it on a real address that delegates to different implementations on Base and on Ethereum. Normal
wallet scoring answers the wrong question there.

**We fixed a six-week outage we hadn't noticed — and made the next one visible.**
Our settlement indexer was frozen. The scheduler killed the job at 10 minutes while one chunk needs
eleven; the child's stderr was discarded so 612 failures printed one cheerful "done". We were also
measuring our own staleness from the wrong end — reporting 70 hours when it was 244. It's back at chain
head, and `/api/agent/status` now publishes each run's outcome, so you can see us freeze without asking.

**Coverage as of this morning:** 1,956 Base agents indexed, 1,423 scored, 448 EIP-712 signed
attestations (19 also onchain via EAS), 7,097 distinct buyers. 2.03M x402 settlements / $385k USDC —
*our indexer's slice*, against ~163.8M / ~$46.9M ecosystem-wide.

**Live and callable today:** onchain verifier `0x7397adb9713934C36D22aA54B4Dbbcd70263592B`,
ERC-8004 agentId 53953, hosted MCP with 43 tools.

---

## The other pieces, if it comes up

- **RugRace** — honest-rug game, live on Base mainnet. 87-agent adversarial panel run before deploy.
  Descriptor-only: a human signs.
- **Loop** — buyer-first escrow, 13/13 foundry, balance conservation fuzz-proven. Provenance receipt
  gated on a trust verdict, fails closed. Not on mainnet for real goods — waiting on audit + legal.
- **trust-core** — the classifier is pure and runs *locally at the caller*. No network call in the
  payment path. That's the part nobody copies by adding an API.

---

## Say it before they find it

- Settlement numbers are our indexed slice, not the ecosystem.
- It runs on free public RPC with failover. It works; it isn't robust.
- Loop has one coin and no liquidity. Traction is the gap, not features.
- Solo builder.

---

## What would actually help

1. Getting surfaced where agents already look — Base App, Bazaar, ecosystem pages. I'll do the PR.
2. One design partner routing real payments who'll tell me where the verdict is wrong.
3. Straight answer: is ERC-8004 + x402 reputation a direction you want pushed, or a dead end? Costs you
   nothing and changes my roadmap.

---

**Don't say:** "partnered with Coinbase" · any settlement figure without "our slice" · Solana coverage ·
"lottery" about RugRace · any number you didn't check this morning.

**Pull up on screen if they're curious:** `/api/agent/health` (says `stale` when it is) ·
`/api/agent/status` (last indexer run) · BaseScan on the verifier.
