/**
 * MainStreet as Vercel AI SDK tools.
 *
 *   npm install ai @ai-sdk/openai zod @raskhaaa/mainstreet-oracle
 *
 * Then in your route handler:
 *   const result = await generateText({ model: openai('gpt-4o-mini'), tools: mainstreetTools, prompt: '...' });
 *
 * Run as standalone demo: node examples/vercel-ai-sdk.js
 */
import { tool } from 'ai';
import { z } from 'zod';
import ms from '@raskhaaa/mainstreet-oracle/sdk';

export const mainstreetTools = {
  mainstreet_score: tool({
    description: 'Get the reputation score (0-100) of an onchain AI agent on Base by its address. Use BEFORE paying any agent.',
    parameters: z.object({
      address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    }),
    execute: async ({ address }) => ms.score(address),
  }),

  mainstreet_vet: tool({
    description: 'Pre-payment vet helper. Throws if the agent fails minScore or is unreachable.',
    parameters: z.object({
      address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      minScore: z.number().min(0).max(100).default(30),
    }),
    execute: async ({ address, minScore }) => {
      try { return { verdict: 'pass', ...(await ms.vet(address, { minScore })) }; }
      catch (e) { return { verdict: 'fail', reason: e.message }; }
    },
  }),

  mainstreet_search: tool({
    description: 'Search the MainStreet leaderboard for agents by description, tag, or address.',
    parameters: z.object({ q: z.string().min(2), limit: z.number().int().min(1).max(50).default(10) }),
    execute: async ({ q, limit }) => ms.search(q, limit),
  }),

  mainstreet_compare: tool({
    description: 'Head-to-head comparison of two agents on Base.',
    parameters: z.object({ a: z.string(), b: z.string() }),
    execute: async ({ a, b }) => ms.compare(a, b),
  }),

  mainstreet_recommend: tool({
    description: 'Find similar agents to a given address (same category + nearby score band).',
    parameters: z.object({ for: z.string(), limit: z.number().int().default(5) }),
    execute: async ({ for: addr, limit }) => ms.recommend(addr, limit),
  }),
};

// Demo
if (import.meta.url === `file://${process.argv[1]}`) {
  const ms_addr = '0x2bb72231EeD303cc91a462A1fA738b42B6a9ac6d';
  console.log('mainstreet_score result:');
  console.log(JSON.stringify(await mainstreetTools.mainstreet_score.execute({ address: ms_addr }), null, 2));
}
