# MainStreet — Distribution Playbook

Three surfaces. One technical setup unlocks two of them.

---

## Surface 1 — x402 Bazaar (CDP)

**Catalog**: `GET https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources`
**Search**: `GET /v2/x402/discovery/search?q=<query>`
**MCP**: `GET /v2/x402/discovery/mcp` — agents discover paid endpoints through MCP

**How we get listed**:
- Permissionless. No form, no review.
- The CDP Facilitator catalogs the service the first time it **settles** a payment for that endpoint.
- Sort & ranking blend buyer reach, transaction volume, recency, metadata completeness — recomputed every 6h.
- Resource removed if no activity for 30 days.

**What we already did**:
- `declareDiscoveryExtension` block defined in `src/api/routes/agent.js` snapshotPaywall — `inputSchema`, `outputSchema`, `example`, `tags`.
- Description optimized for semantic search: *"Real-time Google review snapshot for a local business + up to 3 competitors..."*

**Activation checklist**:
- [ ] Provision MainStreet receiver wallet on Base (not founder main).
- [ ] Generate CDP API key at `https://portal.cdp.coinbase.com` → `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`.
- [ ] Set env on Railway: `AGENT_X402_ENABLED=1`, `AGENT_X402_PAYTO=0x...`, `AGENT_X402_PRICE_USD=0.10`, `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`.
- [ ] `npm i @x402/express @x402/evm @x402/core`.
- [ ] Deploy.
- [ ] One settled payment (self-test from a funded wallet) → indexed.

---

## Surface 2 — agentic.market

**URL**: `https://agentic.market`

**How we get listed**:
- Auto-feed from x402 Bazaar. No separate submission.
- `permissionless` indexing once Surface 1 is active.
- **Curated** tier (better ranking + human-readable enrichment) is editorial. No public application form found — need to reach out to Coinbase DevX team via Discord once we're auto-indexed.

**Activation checklist**: same as Surface 1. Curation is a follow-up.

---

## Surface 3 — Virtuals Agent Commerce Protocol (ACP)

**Doc hub**: `https://whitepaper.virtuals.io/acp`
**SDK**: Python `virtuals-acp` (PyPI) + Node CLI `openclaw-acp` (`github.com/Virtual-Protocol/openclaw-acp`)
**Payments**: USDC since 2026 (the old VIRTUAL token requirement is dropped).
**Chain**: Base. Auto-provisioned agent wallet on first `acp setup`.

**Provider modes**:
- **API-only** — we don't run an autonomous agent. We expose our existing snapshot endpoint, ACP SDK wraps it.
- **Full agent** — out of scope for v1.

**Provider flow** (via `openclaw-acp` CLI):
```bash
git clone https://github.com/Virtual-Protocol/openclaw-acp virtuals-acp
cd virtuals-acp && npm install && npm link
acp setup                  # auto-provisions a Base wallet for this provider identity
acp sell init mainstreet   # scaffold the offering
# edit offering: name, description, pricing in USDC, schema, handler URL → https://avisradar.app/api/agent/snapshot/:placeId
acp sell create mainstreet # registers onchain on Base (one tx)
acp serve                  # runtime accepting jobs via WebSocket
```

**Onchain registration**: one Base tx, requires the auto-provisioned wallet to hold ETH for gas (~$0.50 worth).

**Payment escrow**: USDC is held in an ACP intermediary escrow until the job completes, then released to the provider wallet. Different model from raw x402 (instant settlement).

**Activation checklist**:
- [ ] `acp setup` — creates MainStreet provider wallet (distinct from x402 receiver wallet).
- [ ] Top up that wallet with ~$2 ETH on Base for gas.
- [ ] `acp sell init mainstreet` + edit offering config.
- [ ] `acp sell create mainstreet` — onchain registration.
- [ ] Deploy `acp serve` runtime on Railway (or run from local for v0).
- [ ] First job request received via WebSocket → success → published on Virtuals marketplace.

---

## Wallet topology (final)

We end up with THREE wallets. None of them is Phil's main.

| Wallet | Created via | Purpose | Funded with |
|---|---|---|---|
| **MainStreet x402 Receiver** | `npx awal auth login receiver@mainstreet.app` (Coinbase CDP managed) | Receives USDC from x402 payments (Surfaces 1 & 2) | $0 — receives only |
| **MainStreet ACP Provider** | `acp setup` (Virtuals openclaw-acp CLI) | Identity for Virtuals provider role + escrow recipient | ~$2 ETH for gas |
| **MainStreet Oracle Operator** | future — when ERC-8004 publishing goes live | Signs reputation attestations on Base ReputationRegistry | ~$5 ETH for gas |

Phil's main Base Account never appears in this topology. Sweep cron transfers USDC from Receiver → wherever Phil decides (weekly).

---

## Sequencing

If we have to pick **one** surface first: **x402 Bazaar** (Surface 1).

Why:
- Same setup unlocks Surface 2 free.
- Permissionless = no human dependencies, deploy and we're in.
- Tests our end-to-end x402 flow before we commit to ACP's escrow model (which is heavier).

ACP (Surface 3) comes second, after we have 1+ paid client through Bazaar. Different escrow semantics + onchain registration + separate wallet = bigger setup, justified by the *Virtuals* audience reach but not blocker.

---

## What's left to code (vs prerequisites that need Phil)

| Code task | Status | Who |
|---|---|---|
| `declareDiscoveryExtension` block in route | ✓ done | me |
| `paywallMiddleware` includes discovery extension | ✓ done | me |
| Install `@x402/express @x402/evm @x402/core` | pending — Phil OK first | me |
| `.well-known/agent-card.json` for ERC-8004 IdentityRegistry | todo | me |
| ACP `sell init` config file template | todo | me |
| Sweep cron Receiver → main | todo | me |
| **Provision receiver wallet** | blocked | Phil |
| **Generate CDP API keys** | blocked | Phil |
| **Provision ACP provider wallet** | blocked (later) | Phil |
