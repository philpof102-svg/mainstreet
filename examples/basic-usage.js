// Mainstreet oracle — basic usage examples
// Run: node examples/basic-usage.js

const {
  computeScoreAgent,
  computeScoreBusiness,
  buildAttestationPayload,
  SUBJECT_TYPES,
  ERC_8004_BASE,
} = require('../oracle');

console.log('=== Agent scoring ===');

const topAgent = {
  successRate: 0.99,
  jobCount: 500,
  usdcVolume: 50000,
  daysSinceLastJob: 0,
};
console.log('Top agent (Ethy-like) →', computeScoreAgent(topAgent));

const ghost = {
  successRate: 0.90,
  jobCount: 100,
  usdcVolume: 10000,
  daysSinceLastJob: 60,
};
console.log('Ghost agent (dormant 60d) →', computeScoreAgent(ghost));

const newbie = {
  successRate: 1.0,
  jobCount: 2,
  usdcVolume: 50,
  daysSinceLastJob: 0,
};
console.log('Newbie (small sample) →', computeScoreAgent(newbie));

console.log('\n=== Business scoring (secondary) ===');

const restaurant = { rating: 4.5, reviewCount: 2000 };
console.log('Mature restaurant (4.5★, 2k reviews) →', computeScoreBusiness(restaurant));

console.log('\n=== ERC-8004 payload ready to sign ===');

const payload = buildAttestationPayload({
  subjectType: SUBJECT_TYPES.AGENT_ONCHAIN,
  agentAddress: '0x1234567890abcdef1234567890abcdef12345678',
  ...topAgent,
});
console.log(JSON.stringify(payload, null, 2));

console.log('\n=== Canonical registries on Base ===');
console.log(ERC_8004_BASE);
