/**
 * recommend.js — find similar agents to a given address.
 *
 * Use case: orchestrator looking for alternative providers when
 * the primary is rate-limited or offline.
 *
 * Run: node examples/recommend.js [agentAddress] [limit]
 */
const ORIGIN = 'https://avisradar-production.up.railway.app';
const DEFAULT = '0x2bb72231eed303cc91a462a1fa738b42b6a9ac6d';

async function main() {
  const addr = (process.argv[2] || DEFAULT).toLowerCase();
  const limit = Number(process.argv[3]) || 5;
  if (!/^0x[a-f0-9]{40}$/.test(addr)) {
    console.error('usage: node examples/recommend.js <0x...> [limit]');
    process.exit(1);
  }

  const r = await fetch(`${ORIGIN}/api/agent/recommend?for=${addr}&limit=${limit}`);
  const d = await r.json();

  console.log(`▸ Recommendations similar to ${addr.slice(0, 10)}...${addr.slice(-6)}`);
  console.log(`  Basis: category=${d.basis?.category || 'unknown'} score=${d.basis?.score ?? 'n/a'}`);
  console.log('');
  (d.results || []).forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.payTo.slice(0, 10)}... · score=${r.score ?? '—'} · ${r.sameCategory ? '[same cat]' : '[diff cat]'}`);
    console.log(`     ${(r.description || 'no description').slice(0, 80)}`);
  });
}

main().catch((e) => { console.error('failed:', e.message); process.exit(1); });
