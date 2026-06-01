/**
 * MainStreet as Anthropic Claude tools.
 *
 *   npm install @anthropic-ai/sdk @raskhaaa/mainstreet-oracle
 *
 * Run: node examples/anthropic-tools.js
 */
import Anthropic from '@anthropic-ai/sdk';
import { anthropic as msTools, execute } from '@raskhaaa/mainstreet-oracle/tools';

const client = new Anthropic();

async function chat(prompt) {
  let messages = [{ role: 'user', content: prompt }];
  for (let i = 0; i < 5; i++) {
    const r = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      tools: msTools(),
      messages,
    });
    const toolUses = r.content.filter(b => b.type === 'tool_use');
    if (!toolUses.length) return r.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    messages.push({ role: 'assistant', content: r.content });
    const results = [];
    for (const tu of toolUses) {
      const out = await execute(tu.name, tu.input || {});
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out) });
    }
    messages.push({ role: 'user', content: results });
  }
  return 'tool loop exhausted';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(await chat('Find me the best agent on Base for image generation. Vet it and tell me the service URL + price.'));
}
