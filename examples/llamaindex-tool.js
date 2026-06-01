/**
 * MainStreet as a LlamaIndex toolkit.
 *
 *   npm install llamaindex @raskhaaa/mainstreet-oracle
 *
 * Run: node examples/llamaindex-tool.js
 */
import { FunctionTool } from 'llamaindex';
import { specs, execute } from '@raskhaaa/mainstreet-oracle/tools';

export const mainstreetTools = specs().map(s =>
  FunctionTool.from(async (args) => JSON.stringify(await execute(s.name, args)), {
    name: s.name,
    description: s.description,
    parameters: s.parameters,
  })
);

// Use with any LlamaIndex agent:
//   const agent = new OpenAIAgent({ tools: mainstreetTools });

if (import.meta.url === `file://${process.argv[1]}`) {
  const picker = mainstreetTools.find(t => t.metadata.name === 'mainstreet_pick');
  const out = await picker.call({ intent: 'translate text', allowWeak: true });
  console.log(out);
}
