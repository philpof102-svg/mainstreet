# PR: x402-foundation/x402 — add MainStreet to third-party-extensions

**Target file:** `docs/dev-tools/third-party-extensions.md` on `main`
**Repo:** [x402-foundation/x402](https://github.com/x402-foundation/x402)

## The change (single-line addition at end of table)

```diff
 | Name | Description | Languages | Links |
 | ---- | ----------- | --------- | ----- |
 | [World AgentKit](https://docs.world.org/agents/agent-kit/integrate) | Verify human-backed agents | TypeScript | [GitHub](https://github.com/worldcoin/agentkit) · [npm](https://www.npmjs.com/package/@worldcoin/agentkit) |
 | [OMATrust](https://docs.omatrust.org/integrations/x402/overview) | Onchain EAS reputation from x402 signed offers and receipts | TypeScript | [GitHub](https://github.com/oma3dao/developer-docs) · [npm](https://www.npmjs.com/package/@oma3/omatrust) |
 | [PEAC Protocol](https://x402.peacprotocol.org) | Verifiable receipts for x402 payments | TypeScript | [GitHub](https://github.com/peacprotocol/peac) · [npm](https://www.npmjs.com/package/@peac/adapter-x402) |
 | [x402r](https://x402r.org) | Non-custodial refund and arbitration protocol | Typescript | [GitHub](https://github.com/BackTrackCo/x402r-sdk) · [npm](https://www.npmjs.com/package/@x402r/sdk ) |
 | [zauth](https://zauthx402.com) | Monitoring, verification, and refund SDK | TypeScript | [GitHub](https://github.com/zauthofficial/zauthSDK) · [npm](https://www.npmjs.com/package/@zauthx402/sdk) |
+| [MainStreet](https://avisradar-production.up.railway.app/mainstreet.html) | Live agent reputation oracle on Base — score 0-100 from x402 settlements, signed peer receipts, ERC-8004 attestations; LLM tool adapters for OpenAI, Anthropic, Vercel AI, LangChain | TypeScript | [GitHub](https://github.com/philpof102-svg/mainstreet) · [npm](https://www.npmjs.com/package/@raskhaaa/mainstreet-oracle) |
```

## PR title
`docs: add MainStreet reputation oracle to third-party extensions`

## PR description
```
MainStreet is a live reputation oracle for onchain AI agents on Base that aggregates x402 settlement history, signed peer receipts, ERC-8004 ReputationRegistry feedback, and HTTP SLA probes into one 0-100 score per agent.

It ships LLM tool adapters for OpenAI, Anthropic, Vercel AI SDK, LangChain, LlamaIndex, and Mastra so buyer agents can do:

```js
import { vercelAiSdk } from '@raskhaaa/mainstreet-oracle/tools';
const { text } = await generateText({
  model, tools: vercelAiSdk(),
  prompt: 'Find an agent that translates text on Base. Vet it. Return serviceUrl.',
});
```

Live: https://avisradar-production.up.railway.app/mainstreet.html
Demo: https://avisradar-production.up.railway.app/mainstreet-demo.html
npm: https://www.npmjs.com/package/@raskhaaa/mainstreet-oracle
MIT licensed.

Adds one row to `docs/dev-tools/third-party-extensions.md`. No other changes.
```

## One-shot commands to run

```bash
# 1. Fork on GitHub first (visit https://github.com/x402-foundation/x402 → Fork)
# 2. Then:
git clone https://github.com/YOUR_USERNAME/x402.git
cd x402
git checkout -b add-mainstreet
# 3. Edit docs/dev-tools/third-party-extensions.md — add this line at the end of the table:
```

Line to add at the very end of the table:
```
| [MainStreet](https://avisradar-production.up.railway.app/mainstreet.html) | Live agent reputation oracle on Base — score 0-100 from x402 settlements, signed peer receipts, ERC-8004 attestations; LLM tool adapters for OpenAI, Anthropic, Vercel AI, LangChain | TypeScript | [GitHub](https://github.com/philpof102-svg/mainstreet) · [npm](https://www.npmjs.com/package/@raskhaaa/mainstreet-oracle) |
```

```bash
git add docs/dev-tools/third-party-extensions.md
git commit -m "docs: add MainStreet reputation oracle to third-party extensions"
git push -u origin add-mainstreet
gh pr create --repo x402-foundation/x402 \
  --title "docs: add MainStreet reputation oracle to third-party extensions" \
  --body-file ../mainstreet/PR_x402_FOUNDATION.md \
  --base main
```

## Alternative: open via web

If you don't want to clone locally, GitHub has a "Edit this file" pencil icon on:
https://github.com/x402-foundation/x402/edit/main/docs/dev-tools/third-party-extensions.md

That opens a web editor that auto-forks + commits + offers to open a PR.
