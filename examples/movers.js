/**
 * movers.js — daily top gainers / losers on Mainstreet.
 *
 * Use case: daily digest bot, "trending" widget, content feed.
 *
 * Run: node examples/movers.js [limit]
 */
const ORIGIN = 'https://avisradar-production.up.railway.app';

async function main() {
  const limit = Number(process.argv[2]) || 5;
  const r = await fetch(`${ORIGIN}/api/agent/movers?limit=${limit}`);
  const d = await r.json();

  console.log(`▸ Mainstreet movers — ${d.asOf?.slice(0, 10)}`);
  console.log(`  ${d.totalScored} scored today · ${d.withDelta} with day-over-day delta\n`);

  if (d.note) { console.log(`  note: ${d.note}`); return; }

  console.log(`  Top ${limit} gainers:`);
  (d.gainers || []).forEach((m, i) => {
    console.log(`   ${i+1}. ${m.scoreYesterday} → ${m.scoreToday} (+${m.delta})  ${(m.description||m.payTo).slice(0,55)}`);
  });
  console.log(`\n  Top ${limit} losers:`);
  (d.losers || []).forEach((m, i) => {
    console.log(`   ${i+1}. ${m.scoreYesterday} → ${m.scoreToday} (${m.delta})  ${(m.description||m.payTo).slice(0,55)}`);
  });
}

main().catch((e) => { console.error('failed:', e.message); process.exit(1); });
