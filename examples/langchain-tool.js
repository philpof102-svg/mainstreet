/**
 * MainStreet as a LangChain Tool.
 *
 * Lets a LangChain agent vet any onchain AI agent before paying it.
 *
 *   npm install @langchain/core @langchain/openai @raskhaaa/mainstreet-oracle
 *
 * Run: node examples/langchain-tool.js
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import ms from '@raskhaaa/mainstreet-oracle/sdk';

export const mainstreetScoreTool = new DynamicStructuredTool({
  name: 'mainstreet_score',
  description: 'Get the reputation score (0-100) of an onchain AI agent on Base by its address. Use BEFORE paying any agent to verify trust.',
  schema: z.object({
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'must be a 0x address'),
  }),
  func: async ({ address }) => {
    const s = await ms.score(address);
    return JSON.stringify({
      score: s.score,
      description: s.description,
      jobCount: s.metrics?.jobCount,
      alive: s.health?.alive,
      serviceUrl: s.resourcePath,
    });
  },
});

export const mainstreetVetTool = new DynamicStructuredTool({
  name: 'mainstreet_vet',
  description: 'Pre-payment vet helper. Throws if the agent fails minScore or is unreachable. Returns score data on success.',
  schema: z.object({
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    minScore: z.number().min(0).max(100).default(30),
  }),
  func: async ({ address, minScore }) => {
    try {
      const d = await ms.vet(address, { minScore, requireAlive: true });
      return JSON.stringify({ verdict: 'pass', score: d.score, serviceUrl: d.resourcePath });
    } catch (e) {
      return JSON.stringify({ verdict: 'fail', reason: e.message });
    }
  },
});

export const mainstreetSearchTool = new DynamicStructuredTool({
  name: 'mainstreet_search',
  description: 'Search the MainStreet leaderboard for agents matching a query (description, tags, address).',
  schema: z.object({ q: z.string().min(2), limit: z.number().int().min(1).max(50).default(10) }),
  func: async ({ q, limit }) => {
    const r = await ms.search(q, limit);
    return JSON.stringify(r.results?.map(x => ({ addr: x.payTo, score: x.score, desc: x.description?.slice(0, 100) })) || []);
  },
});

// Quick demo
if (import.meta.url === `file://${process.argv[1]}`) {
  const ms_addr = '0x2bb72231EeD303cc91a462A1fA738b42B6a9ac6d';
  console.log('Tool: mainstreet_score');
  console.log(await mainstreetScoreTool.invoke({ address: ms_addr }));
  console.log('\nTool: mainstreet_vet (minScore=30)');
  console.log(await mainstreetVetTool.invoke({ address: ms_addr, minScore: 30 }));
  console.log('\nTool: mainstreet_search "prediction"');
  console.log(await mainstreetSearchTool.invoke({ q: 'prediction', limit: 3 }));
}
