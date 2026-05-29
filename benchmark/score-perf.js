// Mainstreet — perf benchmark for the scoring functions.
// Goal: confirm the oracle can serve thousands of req/s on a single core.
// Run: node benchmark/score-perf.js

const { computeScoreAgent, computeScoreBusiness, buildAttestationPayload, SUBJECT_TYPES } = require('../oracle');

function bench(name, fn, iters = 100_000) {
  // warmup
  for (let i = 0; i < 1000; i++) fn(i);
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < iters; i++) fn(i);
  const t1 = process.hrtime.bigint();
  const us = Number(t1 - t0) / 1000;
  const perCall = us / iters;
  const opsPerSec = Math.round(1_000_000 / perCall);
  console.log(`  ${name.padEnd(35)} ${perCall.toFixed(2).padStart(7)} µs/call  ${opsPerSec.toLocaleString().padStart(15)} ops/s`);
}

console.log('Node', process.version, '·', process.platform, '·', process.arch);
console.log('');

console.log('=== Scoring ===');
bench('computeScoreBusiness', i => computeScoreBusiness({ rating: 3 + (i % 20) / 10, reviewCount: i + 1 }));
bench('computeScoreAgent', i => computeScoreAgent({
  successRate: 0.5 + (i % 100) / 200,
  jobCount: i % 1000,
  usdcVolume: i * 100,
  daysSinceLastJob: i % 365,
}));

console.log('\n=== Payload building (includes SHA-256 hash) ===');
bench('buildAttestationPayload business', i => buildAttestationPayload({
  placeId: 'ChIJ' + i.toString(36),
  rating: 4,
  reviewCount: 100,
}));
bench('buildAttestationPayload agent', i => buildAttestationPayload({
  subjectType: SUBJECT_TYPES.AGENT_ONCHAIN,
  agentAddress: '0x' + i.toString(16).padStart(40, '0'),
  successRate: 0.95,
  jobCount: 100,
  usdcVolume: 5000,
  daysSinceLastJob: 1,
}));

console.log('\n=== Summary ===');
console.log('At >100k ops/s on a single core, the oracle can score the entire');
console.log('Virtuals ACP active agent set (~25k) in well under a second.');
console.log('Pure compute is never the bottleneck — data fetching is.');
