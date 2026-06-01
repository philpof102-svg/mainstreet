/**
 * MainStreet as a LangChain toolkit — 6 tools in 4 lines.
 *
 * v0.7.0+: just import `tools.langchain()` and wrap with DynamicStructuredTool.
 *
 *   npm install @langchain/core @raskhaaa/mainstreet-oracle
 *
 * Run: node examples/langchain-tool.js
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { langchain } from '@raskhaaa/mainstreet-oracle/tools';

// One line: 6 tools (match, pick, score, compare, leaderboard, vet) wired to live API.
export const mainstreetTools = langchain().map(spec => new DynamicStructuredTool({
  name: spec.name,
  description: spec.description,
  schema: spec.schema, // JSON Schema — LangChain accepts both Zod and raw JSON Schema since core@0.3
  func: async (args) => JSON.stringify(await spec.func(args)),
}));

// Bind into your agent:
//   const agent = await createOpenAIToolsAgent({ llm, tools: mainstreetTools, prompt });

if (import.meta.url === `file://${process.argv[1]}`) {
  const picker = mainstreetTools.find(t => t.name === 'mainstreet_pick');
  const result = await picker.invoke({ intent: 'translate text', allowWeak: true });
  console.log('mainstreet_pick("translate text") →');
  console.log(result);
}
