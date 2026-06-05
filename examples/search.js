/**
 * search.js — full-text search across all indexed agents.
 *
 * Use case: chatbot integration ("find me an agent that does X").
 *
 * Run: node examples/search.js "polymarket" [limit]
 */
const ORIGIN = 'https://avisradar-production.up.railway.app';

async function main() {
  const q = process.argv[2];
  const limit = Number(process.argv[3]) || 10;
  if (!q || q.length < 2) {
    console.error('usage: node examples/search.js <query> [limit]');
    process.exit(1);
  }
  const r = await fetch(`${ORIGIN}/api/agent/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  const d = await r.json();
  const results = d.results || [];
  const total = d.total ?? d.count ?? results.length;
  console.log(`▸ "${q}" → ${total} match${total === 1 ? '' : 'es'}\n`);
  results.forEach((m, i) => {
    const addr = m.address || m.payTo || '—';
    console.log(`  ${i+1}. ${addr.slice(0, 10)}...  [${m.type || 'agent'}]`);
    console.log(`     ${(m.description || '—').slice(0, 80)}`);
    if (m.resource) console.log(`     ↳ ${m.resource}`);
  });
  if (d.note) console.log(`\n  note: ${d.note}`);
}

main().catch((e) => { console.error('failed:', e.message); process.exit(1); });
