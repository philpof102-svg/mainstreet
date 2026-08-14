/**
 * MainStreet as a LlamaIndex toolkit.
 *
 *   npm install llamaindex mainstreet-oracle
 *
 * Run: node examples/llamaindex-tool.js
 */
import { pathToFileURL } from 'node:url';
import { FunctionTool } from 'llamaindex';
import { specs, execute } from 'mainstreet-oracle/tools';

export const mainstreetTools = specs().map(s =>
  FunctionTool.from(async (args) => JSON.stringify(await execute(s.name, args)), {
    name: s.name,
    description: s.description,
    parameters: s.parameters,
  })
);

// Use with any LlamaIndex agent:
//   const agent = new OpenAIAgent({ tools: mainstreetTools });

// `file://` + argv[1] n'est une URL valide que si le chemin commence par « / » : sur Windows
// argv[1] vaut `D:\...`, la garde etait FAUSSE et cette demo ne tournait pas (exit 0, rien affiche).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const picker = mainstreetTools.find(t => t.metadata.name === 'mainstreet_pick');
  const out = await picker.call({ intent: 'translate text', allowWeak: true });
  console.log(out);
}
