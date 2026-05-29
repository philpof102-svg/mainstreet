// Mainstreet oracle — test suite (node:test, zero deps)
// Run: node --test test/oracle.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeScoreBusiness,
  computeScoreAgent,
  buildAttestationPayload,
  hashSubject,
  SUBJECT_TYPES,
  ERC_8004_BASE,
  ORACLE_VERSION,
  BASE_MAINNET_CHAIN_ID,
} = require('../oracle');

test('business: high-rated mature → 87', () => {
  assert.equal(computeScoreBusiness({ rating: 4.5, reviewCount: 2000 }), 87);
});

test('business: max → 100', () => {
  assert.equal(computeScoreBusiness({ rating: 5, reviewCount: 10000 }), 100);
});

test('business: zero rating → 0', () => {
  assert.equal(computeScoreBusiness({ rating: 0, reviewCount: 0 }), 0);
});

test('business: null inputs are tolerated', () => {
  const s = computeScoreBusiness({ rating: null, reviewCount: null });
  assert.ok(s >= 0 && s <= 100);
});

test('agent: top-tier (Ethy-like) ≥ 75', () => {
  const s = computeScoreAgent({ successRate: 0.99, jobCount: 500, usdcVolume: 50000, daysSinceLastJob: 0 });
  assert.ok(s >= 75, `expected >= 75, got ${s}`);
});

test('agent: newbie (small sample, active today) ≈ 40', () => {
  // 100% but only 2 jobs → successPart dampened to 10/50.
  // Active today gives full recency 20. log10(50)*6 ≈ 10.
  // Expected: ~40. This is correct: an active newbie outranks a stale
  // veteran of similar volume.
  const s = computeScoreAgent({ successRate: 1.0, jobCount: 2, usdcVolume: 50, daysSinceLastJob: 0 });
  assert.ok(s >= 35 && s <= 45, `expected 35-45, got ${s}`);
});

test('agent: zero-activity → 0', () => {
  const s = computeScoreAgent({ successRate: 0, jobCount: 0, usdcVolume: 0, daysSinceLastJob: 365 });
  assert.equal(s, 0);
});

test('agent: ghost (60d dormant) drops significantly', () => {
  const active = computeScoreAgent({ successRate: 0.9, jobCount: 100, usdcVolume: 10000, daysSinceLastJob: 0 });
  const ghost = computeScoreAgent({ successRate: 0.9, jobCount: 100, usdcVolume: 10000, daysSinceLastJob: 60 });
  assert.ok(active - ghost >= 15, `recency decay should drop score by >=15, got ${active - ghost}`);
});

test('agent: bounded [0, 100]', () => {
  for (let i = 0; i < 50; i++) {
    const s = computeScoreAgent({
      successRate: Math.random(),
      jobCount: Math.floor(Math.random() * 10000),
      usdcVolume: Math.random() * 1e7,
      daysSinceLastJob: Math.random() * 365,
    });
    assert.ok(s >= 0 && s <= 100, `out of bounds: ${s}`);
  }
});

test('hashSubject: deterministic + 32-byte hex', () => {
  const h1 = hashSubject('ChIJN1t_tDeuEmsRUsoyG83frY4');
  const h2 = hashSubject('ChIJN1t_tDeuEmsRUsoyG83frY4');
  assert.equal(h1, h2);
  assert.match(h1, /^0x[a-f0-9]{64}$/);
});

test('hashSubject: different inputs → different hashes', () => {
  assert.notEqual(hashSubject('a'), hashSubject('b'));
});

test('payload: business default subjectType + chain', () => {
  const p = buildAttestationPayload({ placeId: 'ChIJabc', rating: 4, reviewCount: 100 });
  assert.equal(p.subjectType, SUBJECT_TYPES.BUSINESS_GOOGLE);
  assert.equal(p.chainId, BASE_MAINNET_CHAIN_ID);
  assert.equal(p.version, ORACLE_VERSION);
  assert.ok(p.businessMetrics);
});

test('payload: agent subjectType includes agentMetrics', () => {
  const p = buildAttestationPayload({
    subjectType: SUBJECT_TYPES.AGENT_ONCHAIN,
    agentAddress: '0x' + 'a'.repeat(40),
    successRate: 0.9,
    jobCount: 50,
    usdcVolume: 5000,
    daysSinceLastJob: 1,
  });
  assert.equal(p.subjectType, SUBJECT_TYPES.AGENT_ONCHAIN);
  assert.ok(p.agentMetrics);
  assert.equal(p.agentMetrics.successRate, 0.9);
});

test('payload: subject is keccak-shaped hash', () => {
  const p = buildAttestationPayload({ placeId: 'test' });
  assert.match(p.subject, /^0x[a-f0-9]{64}$/);
});

test('registries: Base addresses correct', () => {
  assert.equal(ERC_8004_BASE.identityRegistry, '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432');
  assert.equal(ERC_8004_BASE.reputationRegistry, '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63');
});
