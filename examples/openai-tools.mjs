/**
 * MainStreet as OpenAI function-calling tools.
 *
 *   npm install openai mainstreet-oracle
 *
 * Run: node examples/openai-tools.js
 */
import { pathToFileURL } from 'node:url';
import OpenAI from 'openai';
import { openai as msTools, execute } from 'mainstreet-oracle/tools';

const client = new OpenAI();

async function chat(prompt) {
  // Initial call with tools
  let messages = [{ role: 'user', content: prompt }];
  for (let i = 0; i < 5; i++) {
    const r = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: msTools(),
      tool_choice: 'auto',
    });
    const msg = r.choices[0].message;
    messages.push(msg);
    if (!msg.tool_calls?.length) return msg.content;
    for (const call of msg.tool_calls) {
      const args = JSON.parse(call.function.arguments || '{}');
      const result = await execute(call.function.name, args);
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  return 'tool loop exhausted';
}

// `file://` + argv[1] n'est une URL valide que si le chemin commence par « / » : sur Windows
// argv[1] vaut `D:\...`, la garde etait FAUSSE et cette demo ne tournait pas (exit 0, rien affiche).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(await chat('Find an agent on Base that does image generation, vet the top match, and tell me its score and service URL.'));
}
