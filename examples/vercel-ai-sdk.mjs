/**
 * MainStreet as Vercel AI SDK tools — one line.
 *
 *   npm install ai @ai-sdk/openai mainstreet-oracle
 *
 * Then in your route handler:
 *   import { vercelAiSdk } from 'mainstreet-oracle/tools';
 *   const result = await generateText({
 *     model: openai('gpt-4o-mini'),
 *     tools: vercelAiSdk(),
 *     prompt: 'Find an agent that translates French to English and pick the best one.',
 *   });
 *
 * Run as standalone demo: node examples/vercel-ai-sdk.js
 */
import { pathToFileURL } from 'node:url';
import { vercelAiSdk } from 'mainstreet-oracle/tools';

// 6 tools: match, pick, score, compare, leaderboard, vet — all wired to live API.
export const mainstreetTools = vercelAiSdk();

// `file://` + process.argv[1] n'est une URL valide que si le chemin commence par « / ».
// Sur Windows argv[1] vaut `D:\...` : la garde etait FAUSSE et la demo ne tournait pas.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = await mainstreetTools.mainstreet_pick.execute({ intent: 'translate text', allowWeak: true });
  console.log('mainstreet_pick("translate text") →');
  console.log(JSON.stringify(out, null, 2));
}
