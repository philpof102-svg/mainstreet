/**
 * MainStreet SDK — LLM tool definitions.
 *
 * One import, plug into any LLM framework:
 *   - OpenAI / Anthropic / Mistral / Vercel AI SDK / LangChain / Mastra
 *
 * Each tool spec exports a `{ name, description, parameters }` schema PLUS a
 * `execute(args)` function bound to the SDK. Wrap as needed for your framework.
 *
 * Usage (Vercel AI SDK):
 *   import { tools } from '@raskhaaa/mainstreet-oracle/tools';
 *   const result = await generateText({ model, tools: tools.vercelAiSdk() });
 *
 * Usage (OpenAI function calling):
 *   import { tools } from '@raskhaaa/mainstreet-oracle/tools';
 *   const openaiTools = tools.openai();
 *   // openaiTools is [{ type: 'function', function: { name, description, parameters } }, ...]
 *
 * Usage (Anthropic tools):
 *   import { tools } from '@raskhaaa/mainstreet-oracle/tools';
 *   const anthropicTools = tools.anthropic();
 *   // [{ name, description, input_schema }, ...]
 *
 * Usage (LangChain DynamicStructuredTool):
 *   import { tools } from '@raskhaaa/mainstreet-oracle/tools';
 *   const lcTools = tools.langchain(); // returns class-less plain objects, wrap with new DynamicStructuredTool(...)
 *
 * Each tool's `execute()` returns plain JSON the LLM can ingest directly.
 */

const sdk = require('./index.js');

// ─── Tool: mainstreet_match ────────────────────────────────────
// Pick agents by natural-language intent. The LLM passes a phrase, gets a
// ranked list with score, sla, settlements, verified flag, and a callExample.
const matchSpec = {
  name: 'mainstreet_match',
  description: 'Find onchain AI agents on Base that match a natural-language intent. Returns ranked matches with live reputation score, settlement history, SLA stats, and a verified flag. Use this BEFORE picking an agent to call so you pay a vetted endpoint, not a dead one.',
  parameters: {
    type: 'object',
    properties: {
      intent: { type: 'string', description: 'Plain-text description of what the agent should do, e.g. "translate French to English" or "generate an image from a prompt".' },
      maxPrice: { type: 'number', description: 'Optional max price in USDC per call. Filters out agents above this.' },
      minScore: { type: 'integer', description: 'Optional minimum reputation score (0-100). Default 0.', minimum: 0, maximum: 100 },
      limit: { type: 'integer', description: 'Max results to return (1-10). Default 3.', minimum: 1, maximum: 10 },
      onlyRegistered: { type: 'boolean', description: 'If true, return only agents registered in ERC-8004 IdentityRegistry on Base (permissionless onchain verification).' },
      onlyVerified: { type: 'boolean', description: 'If true, return only agents that have claimed a MainStreet badge (signed proof of wallet ownership).' },
    },
    required: ['intent'],
  },
  async execute(args) {
    return sdk.match(args);
  },
};

// ─── Tool: mainstreet_pick ────────────────────────────────────
// Single-best-match convenience. Throws on weak match unless allowWeak.
const pickSpec = {
  name: 'mainstreet_pick',
  description: 'Pick the single best agent for an intent in one call. Returns one agent object (payTo, score, serviceUrl, price, verified, erc8004Registered, sla, settlements). Throws if no agent matches OR if only weak matches exist (unless allowWeak=true). Use this when you want to act immediately.',
  parameters: {
    type: 'object',
    properties: {
      intent: { type: 'string', description: 'Plain-text intent.' },
      maxPrice: { type: 'number', description: 'Max USDC per call.' },
      minScore: { type: 'integer', minimum: 0, maximum: 100 },
      allowWeak: { type: 'boolean', description: 'If true, accept partial-token matches. Default false.' },
      onlyRegistered: { type: 'boolean', description: 'If true, only consider ERC-8004-registered agents.' },
      onlyVerified: { type: 'boolean', description: 'If true, only consider agents with claimed MainStreet badges.' },
    },
    required: ['intent'],
  },
  async execute(args) {
    const { allowWeak, ...rest } = args || {};
    return sdk.pick(rest, { allowWeak });
  },
};

// ─── Tool: mainstreet_score ────────────────────────────────────
const scoreSpec = {
  name: 'mainstreet_score',
  description: 'Read live reputation score (0-100) for one specific agent address on Base. Returns score, health (alive/dead), recent settlements, SLA, and resourcePath (the URL to call). Use this to vet an agent you already know about.',
  parameters: {
    type: 'object',
    properties: {
      address: { type: 'string', description: 'Agent address (0x + 40 hex).', pattern: '^0x[a-fA-F0-9]{40}$' },
    },
    required: ['address'],
  },
  async execute(args) {
    return sdk.score(args.address);
  },
};

// ─── Tool: mainstreet_compare ──────────────────────────────────
const compareSpec = {
  name: 'mainstreet_compare',
  description: 'Compare two agents head-to-head. Returns side-by-side metrics so the LLM (or its user) can pick.',
  parameters: {
    type: 'object',
    properties: {
      a: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
      b: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
    },
    required: ['a', 'b'],
  },
  async execute(args) {
    return sdk.compare(args.a, args.b);
  },
};

// ─── Tool: mainstreet_leaderboard ──────────────────────────────
const leaderboardSpec = {
  name: 'mainstreet_leaderboard',
  description: 'List top-scored onchain agents on Base. Use when the user asks "who is best at X" or wants discovery without a specific intent.',
  parameters: {
    type: 'object',
    properties: {
      limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Default 10.' },
      network: { type: 'string', description: 'Filter by network. Default base.' },
    },
  },
  async execute(args) {
    return sdk.leaderboard(args || {});
  },
};

// ─── Tool: mainstreet_vet ──────────────────────────────────────
const vetSpec = {
  name: 'mainstreet_vet',
  description: 'Vet an agent against minimum reputation + alive gate BEFORE paying it. Throws if score below minScore or endpoint is dead. Returns the score payload on success. Always call this immediately before x402 payment.',
  parameters: {
    type: 'object',
    properties: {
      address: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
      minScore: { type: 'integer', minimum: 0, maximum: 100, description: 'Default 30.' },
      requireAlive: { type: 'boolean', description: 'Default true.' },
    },
    required: ['address'],
  },
  async execute(args) {
    const { address, ...opts } = args;
    return sdk.vet(address, opts);
  },
};

const ALL = [matchSpec, pickSpec, scoreSpec, compareSpec, leaderboardSpec, vetSpec];

// ─── Format adapters ───────────────────────────────────────────

/** OpenAI tools / function-calling shape (chat.completions, assistants v2). */
function openai() {
  return ALL.map(t => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

/** Anthropic Claude tools shape. */
function anthropic() {
  return ALL.map(t => ({ name: t.name, description: t.description, input_schema: t.parameters }));
}

/** Vercel AI SDK `tools` object (record keyed by tool name, with description + parameters + execute). */
function vercelAiSdk() {
  const out = {};
  for (const t of ALL) {
    out[t.name] = {
      description: t.description,
      parameters: t.parameters, // accepts JSON Schema in Vercel SDK
      execute: t.execute,
    };
  }
  return out;
}

/** LangChain DynamicStructuredTool plain-object shape. User wraps with `new DynamicStructuredTool(...)`. */
function langchain() {
  return ALL.map(t => ({ name: t.name, description: t.description, schema: t.parameters, func: t.execute }));
}

/** Mastra createTool() compatible spec. */
function mastra() {
  return ALL.map(t => ({ id: t.name, description: t.description, inputSchema: t.parameters, execute: ({ context }) => t.execute(context) }));
}

/** Generic JSON Schema dump — for custom frameworks. */
function specs() {
  return ALL.map(t => ({ name: t.name, description: t.description, parameters: t.parameters }));
}

/** Direct execute by tool name — for frameworks that route by name string. */
async function execute(name, args) {
  const t = ALL.find(x => x.name === name);
  if (!t) throw new Error(`unknown MainStreet tool: ${name}`);
  return t.execute(args || {});
}

module.exports = {
  // Format adapters
  openai, anthropic, vercelAiSdk, langchain, mastra, specs,
  // Direct
  execute,
  // Individual specs (for advanced customization)
  matchSpec, pickSpec, scoreSpec, compareSpec, leaderboardSpec, vetSpec,
};
module.exports.default = module.exports;
