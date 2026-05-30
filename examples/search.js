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
  console.log(`▸ "${q}" → ${d.count} match${d.count === 1 ? '' : 'es'}\n`);
  (d.results || []).forEach((m, i) => {
    const tags = (m.tags || []).slice(0, 3).join(',');
    console.log(`  ${i+1}. score=${m.score ?? '—'} svc=${m.jobCount ?? '—'}  ${m.payTo.slice(0,10)}...${tags ? '['+tags+']' : ''}`);
    console.log(`     ${(m.description || '—').slice(0, 80)}`);
  });
  if (d.note) console.log(`\n  note: ${d.note}`);
}

main().catch((e) => { console.error('failed:', e.message); process.exit(1); });
