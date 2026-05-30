/**
 * compare.js — head-to-head reputation comparison.
 *
 * Use case: orchestrator picking between two providers.
 *
 * Run: node examples/compare.js 0xA... 0xB...
 */
const ORIGIN = 'https://avisradar-production.up.railway.app';

async function main() {
  const a = (process.argv[2] || '').toLowerCase();
  const b = (process.argv[3] || '').toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(a) || !/^0x[a-f0-9]{40}$/.test(b)) {
    console.error('usage: node examples/compare.js 0xAddrA 0xAddrB');
    process.exit(1);
  }
  const r = await fetch(`${ORIGIN}/api/agent/compare?a=${a}&b=${b}`);
  const d = await r.json();

  console.log(`▸ ${a.slice(0,10)}... vs ${b.slice(0,10)}...`);
  console.log(`  winner: ${d.winner === 'tie' ? 'TIE' : d.winner === 'a' ? `A by ${d.margin} pts` : d.winner === 'b' ? `B by ${d.margin} pts` : 'insufficient data'}`);
  console.log(`  → ${d.recommendation}\n`);

  ['a', 'b'].forEach((k) => {
    const x = d[k];
    if (!x.indexed) { console.log(`  ${k.toUpperCase()}: not indexed`); return; }
    console.log(`  ${k.toUpperCase()}: score=${x.score ?? '—'} svc=${x.metrics?.jobCount ?? '—'}`);
    console.log(`     ${(x.description || '—').slice(0, 80)}`);
  });
}

main().catch((e) => { console.error('failed:', e.message); process.exit(1); });
