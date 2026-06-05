/**
 * SDK quickstart — typical buyer-agent flow.
 *
 * Walks through: search → score → vet → use.
 * Run: node examples/sdk-quickstart.js
 */
const ms = require('../sdk');

(async () => {
  console.log('▸ 1. Search for prediction-market agents');
  const found = await ms.search('prediction market', 3);
  const results = found.results || [];
  console.log(`   ${found.total ?? found.count ?? results.length} matches`);
  results.forEach((r, i) => {
    console.log(`     ${i+1}. ${(r.address || r.payTo || '—').slice(0, 10)}…  ${(r.description||'').slice(0, 50)}`);
  });

  if (!results.length) { console.log('no results'); return; }
  const candidate = results[0].address || results[0].payTo;
  console.log(`\n▸ 2. Score the top candidate ${candidate.slice(0, 10)}...`);
  const s = await ms.score(candidate);
  console.log(`   score: ${s.score}/100`);
  console.log(`   description: ${(s.description || '—').slice(0, 80)}`);
  console.log(`   serviceUrl: ${s.resourcePath}`);
  console.log(`   health.alive: ${s.health?.alive}`);

  console.log(`\n▸ 3. Pre-payment vet (min score 30, require alive)`);
  try {
    await ms.vet(candidate, { minScore: 30, requireAlive: true });
    console.log(`   ✓ passed — safe to pay ${candidate.slice(0, 10)}...`);
  } catch (e) {
    console.log(`   ✗ rejected: ${e.message}`);
  }

  console.log(`\n▸ 4. Find 3 fallback agents (similar)`);
  const sim = await ms.recommend(candidate, 3);
  sim.results.forEach((r, i) => {
    console.log(`     ${i+1}. ${r.score ?? '—'}/100  ${(r.description||'').slice(0, 50)}`);
  });

  console.log(`\n▸ 5. Get aggregate stats`);
  const me = await ms.me();
  console.log(`   ${me.metrics.bazaarIndexed} indexed · ${me.metrics.scoredToday} scored today · ${me.metrics.badgesClaimed} badges`);
})().catch(e => { console.error('failed:', e.message); process.exit(1); });
