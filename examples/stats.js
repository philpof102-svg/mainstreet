/**
 * stats.js — print Mainstreet's live aggregate stats.
 *
 * Use case: daily monitoring, public dashboard backing data.
 *
 * Run: node examples/stats.js
 */
const ORIGIN = 'https://avisradar-production.up.railway.app';

async function main() {
  const [me, lb, hs] = await Promise.all([
    fetch(`${ORIGIN}/api/agent/me`).then(r => r.json()),
    fetch(`${ORIGIN}/api/agent/leaderboard?limit=500`).then(r => r.json()),
    fetch(`${ORIGIN}/api/agent/health-summary`).then(r => r.json()),
  ]);

  console.log('▸ Mainstreet — live stats');
  console.log(`  Indexed total:  ${(me.metrics?.bazaarIndexed || 0).toLocaleString()}`);
  console.log(`  Scored today:   ${(me.metrics?.scoredToday || 0).toLocaleString()}`);
  console.log(`  Badges claimed: ${(me.metrics?.badgesClaimed || 0).toLocaleString()}`);
  if (hs.uptimePct != null) console.log(`  Uptime:         ${hs.uptimePct}% (${hs.alive}/${hs.totalProbed})`);

  // Network breakdown
  if (lb.networkBreakdown) {
    console.log('\n  Networks:');
    Object.entries(lb.networkBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .forEach(([n, v]) => console.log(`    ${n.padEnd(40)} ${v}`));
  }

  // Top 5 from leaderboard
  console.log('\n  Top 5 by score:');
  (lb.results || []).slice(0, 5).forEach((r, i) => {
    console.log(`    ${i+1}. ${r.score ?? '—'}/100  ${r.payTo.slice(0,10)}...  ${(r.description||'').slice(0,50)}`);
  });
}

main().catch((e) => { console.error('failed:', e.message); process.exit(1); });
