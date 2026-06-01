# Upstream PR drafts — distribution

Ready-to-paste content for getting MainStreet listed in third-party docs.
Each section is a self-contained PR description + the README addition.

---

## 1. x402 / Bazaar — "Agent reputation & discovery"

**Target repo:** `coinbase/x402` (or wherever Bazaar lives).
**File to edit:** `README.md` and/or `docs/integrations.md`.
**PR title:** `docs: add MainStreet reputation oracle to integrations`

### PR description

> MainStreet (https://avisradar-production.up.railway.app/mainstreet.html, [@raskhaaa/mainstreet-oracle](https://www.npmjs.com/package/@raskhaaa/mainstreet-oracle)) is a reputation oracle for onchain AI agents on Base. It indexes every agent registered on Bazaar, scores them 0-100 from real onchain settlement history + SLA probes + ERC-8004 reputation feedback, and exposes a free public API (`/api/agent/match`, `/api/agent/score/:addr`, `/api/agent/leaderboard`).
>
> Buyer LLM agents can integrate in one line via the official tool definitions for OpenAI, Anthropic, Vercel AI SDK, LangChain, LlamaIndex, and Mastra:
>
> ```js
> import { vercelAiSdk } from '@raskhaaa/mainstreet-oracle/tools';
> const result = await generateText({ model, tools: vercelAiSdk() });
> ```
>
> This adds Bazaar agent discovery + safety vetting to any AI app without any MainStreet-specific glue code.

### README snippet

```markdown
### Agent discovery & reputation

When picking which Bazaar agent to call, buyers can use [MainStreet](https://www.npmjs.com/package/@raskhaaa/mainstreet-oracle) — a free reputation oracle that scores every indexed agent and exposes an LLM-tool API:

\`\`\`js
import { vercelAiSdk } from '@raskhaaa/mainstreet-oracle/tools';
// 6 tools: match, pick, score, compare, leaderboard, vet — wired to live Base data
generateText({ model: openai('gpt-4o-mini'), tools: vercelAiSdk(), prompt: 'Translate "bonjour" to English.' });
\`\`\`

`mainstreet_pick("translate")` returns `{ payTo, serviceUrl, price, score, sla, settlements, verified }` — ready to call via x402.
```

---

## 2. LangChain JS — Community Tools

**Target repo:** `langchain-ai/langchainjs` → `libs/langchain-community/src/tools/`.
**PR title:** `community: add MainStreet onchain agent reputation tool`

### Code (drop-in)

```ts
// libs/langchain-community/src/tools/mainstreet.ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { langchain } from '@raskhaaa/mainstreet-oracle/tools';

export function getMainstreetTools() {
  return langchain().map(s => new DynamicStructuredTool({
    name: s.name,
    description: s.description,
    schema: s.schema,
    func: async (a) => JSON.stringify(await s.func(a)),
  }));
}
```

---

## 3. LlamaIndex TS — `packages/llamaindex/src/tools/`

```ts
// packages/llamaindex/src/tools/mainstreet.ts
import { FunctionTool } from 'llamaindex';
import { specs, execute } from '@raskhaaa/mainstreet-oracle/tools';

export function getMainstreetTools() {
  return specs().map(s => FunctionTool.from(
    async (a) => JSON.stringify(await execute(s.name, a)),
    { name: s.name, description: s.description, parameters: s.parameters },
  ));
}
```

---

## 4. Vercel AI SDK — `examples/`

PR adds `examples/mainstreet-buyer/` showing a buyer LLM that discovers + vets + pays an agent in one tool-calling loop.

```ts
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { vercelAiSdk } from '@raskhaaa/mainstreet-oracle/tools';

const { text } = await generateText({
  model: openai('gpt-4o-mini'),
  tools: vercelAiSdk(),
  prompt: 'Find the best agent on Base to summarize a webpage, vet it (minScore 30), and return its serviceUrl + price.',
});
```

---

## 5. ERC-8004 ecosystem repo

**Target:** ERC-8004 contracts repo / awesome-erc-8004 list.

Add MainStreet under "Live oracles" with:
- npm: `@raskhaaa/mainstreet-oracle`
- chain: Base mainnet (chainId 8453)
- registry: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
- feedbackURI format: signed EIP-712 attestation served at `https://avisradar.app/api/agent/attestation/:addr`
