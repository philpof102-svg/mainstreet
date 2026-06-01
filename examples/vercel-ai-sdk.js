/**
 * MainStreet as Vercel AI SDK tools — one line.
 *
 *   npm install ai @ai-sdk/openai @raskhaaa/mainstreet-oracle
 *
 * Then in your route handler:
 *   import { vercelAiSdk } from '@raskhaaa/mainstreet-oracle/tools';
 *   const result = await generateText({
 *     model: openai('gpt-4o-mini'),
 *     tools: vercelAiSdk(),
 *     prompt: 'Find an agent that translates French to English and pick the best one.',
 *   });
 *
 * Run as standalone demo: node examples/vercel-ai-sdk.js
 */
import { vercelAiSdk } from '@raskhaaa/mainstreet-oracle/tools';

// 6 tools: match, pick, score, compare, leaderboard, vet — all wired to live API.
export const mainstreetTools = vercelAiSdk();

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = await mainstreetTools.mainstreet_pick.execute({ intent: 'translate text', allowWeak: true });
  console.log('mainstreet_pick("translate text") →');
  console.log(JSON.stringify(out, null, 2));
}
